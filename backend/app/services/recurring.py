"""Recurring issues: the same problem reported again and again.

Two requests describe the same issue when they are in the same building and category and either name the same
room or have clearly similar titles. When a group reaches `recurring_threshold` within `recurring_window_days`,
the hostel's wardens are alerted (at most once per cooldown, tracked in Redis).
"""
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Complaint, ComplaintStatus as S
from app.services import ratelimit

# Not counted: requests already judged invalid or a duplicate of another
_EXCLUDED = (S.REJECTED, S.DUPLICATE)
_STOPWORDS = {'a', 'an', 'the', 'is', 'are', 'not', 'in', 'on', 'of', 'at', 'to', 'and', 'or', 'for', 'my', 'our', 'room',
              'hostel', 'working', 'work', 'issue', 'problem', 'please', 'since', 'from', 'with', 'no', 'there', 'it', 'its',
              'has', 'have', 'been', 'very', 'again'}
SIMILARITY = 0.4


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r'[a-z0-9]+', text.lower()) if len(w) > 2 and w not in _STOPWORDS}


def similar(a: Complaint, b: Complaint) -> bool:
    if a.building_id != b.building_id or a.category_id != b.category_id:
        return False
    if a.room_id is not None and a.room_id == b.room_id:
        return True
    wa, wb = _words(a.title), _words(b.title)
    return bool(wa and wb) and len(wa & wb) / len(wa | wb) >= SIMILARITY


@dataclass
class Cluster:
    complaints: list[Complaint] = field(default_factory=list)

    @property
    def latest(self) -> Complaint:
        return max(self.complaints, key=lambda c: c.created_at)


def _window_start() -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=get_settings().recurring_window_days)


def similar_to(db: Session, c: Complaint) -> list[Complaint]:
    """Earlier requests in the window that describe the same issue as `c` (not including `c`)."""
    candidates = db.scalars(select(Complaint).where(
        Complaint.id != c.id, Complaint.building_id == c.building_id, Complaint.category_id == c.category_id,
        Complaint.created_at >= _window_start(), Complaint.status.not_in(_EXCLUDED))).unique().all()
    return [x for x in candidates if similar(c, x)]


def clusters(db: Session, scope_clause=None) -> list[Cluster]:
    """Groups of similar requests within the window that reach the threshold, largest and most recent first."""
    stmt = select(Complaint).where(Complaint.created_at >= _window_start(), Complaint.status.not_in(_EXCLUDED))
    if scope_clause is not None:
        stmt = stmt.where(scope_clause)
    groups: list[Cluster] = []
    for c in db.scalars(stmt.order_by(Complaint.created_at)).unique():
        home = next((g for g in groups if any(similar(c, x) for x in g.complaints)), None)
        if home is None:
            groups.append(Cluster([c]))
        else:
            home.complaints.append(c)
    hits = [g for g in groups if len(g.complaints) >= get_settings().recurring_threshold]
    return sorted(hits, key=lambda g: (len(g.complaints), g.latest.created_at), reverse=True)


def should_alert(c: Complaint) -> bool:
    """True once per cooldown for an issue in this building, category and room."""
    s = get_settings()
    key = f'recurring:{c.building_id}:{c.category_id}:{c.room_id or "any"}'
    return ratelimit.get_redis().set(key, '1', nx=True, ex=s.recurring_alert_cooldown_hours * 3600) is True

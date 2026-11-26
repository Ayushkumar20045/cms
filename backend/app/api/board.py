"""Jira-style ticket board for staff and administrators, and ticket lookup by key (CMP-2026-0001).

The board groups the requests a user may see into status columns. Each card carries the moves that user
may make right now, so the frontend only offers drops the backend will accept; the move itself still goes
through POST /complaints/{id}/status, which re-checks permission, scope and the workflow.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.api.complaints import detail
from app.authorization.deps import CurrentUser, get_current_user, require_permission
from app.authorization.scope import can_view, not_found, visible_complaints_clause
from app.db import get_db
from app.models import Category, Complaint, ComplaintAssignment, ComplaintStatus as S, Label, Priority
from app.schemas import BoardCard, BoardColumn, BoardOut, ComplaintDetail, Envelope
from app.serializers import can_decide, complaint_summary, labels_out, subtask_progress
from app.services.workflow import STAFF_SETTABLE, TRANSITIONS

router = APIRouter(prefix='/api/v1', tags=['board'])

BOARD_VIEW = ('COMPLAINT_VIEW_ALL', 'COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_VIEW_DEPARTMENT', 'COMPLAINT_VIEW_ASSIGNED')

# (column key, title, statuses shown in it). Dropping a card on a column moves it to the column's key status.
COLUMNS = [
    (S.SUBMITTED, 'To do', [S.SUBMITTED, S.REOPENED]),
    (S.UNDER_REVIEW, 'Under review', [S.UNDER_REVIEW]),
    (S.ASSIGNED, 'Assigned', [S.ASSIGNED]),
    (S.IN_PROGRESS, 'In progress', [S.IN_PROGRESS]),
    (S.WAITING_FOR_INFORMATION, 'Waiting for info', [S.WAITING_FOR_INFORMATION]),
    (S.WAITING_FOR_MATERIALS, 'Waiting for materials', [S.WAITING_FOR_MATERIALS]),
    (S.ESCALATED, 'Escalated', [S.ESCALATED]),
    (S.RESOLVED, 'Resolved', [S.RESOLVED]),
]
CARDS_PER_COLUMN = 50
DONE_CARDS = 20
PRIORITY_ORDER = case({Priority.URGENT: 0, Priority.HIGH: 1, Priority.MEDIUM: 2, Priority.LOW: 3}, value=Complaint.priority)


def allowed_moves(current: CurrentUser, c: Complaint) -> list[S]:
    """Statuses this user may move the card to by dragging (assigning, accepting and rejecting have their own actions)."""
    if not current.has('COMPLAINT_UPDATE_STATUS') or can_decide(current, c):
        return []
    moves = TRANSITIONS[c.status] & STAFF_SETTABLE
    if not current.has('COMPLAINT_ESCALATE'):
        moves = moves - {S.ESCALATED}
    return sorted(moves, key=lambda s: s.value)


@router.get('/board', response_model=Envelope[BoardOut])
def board(search: str | None = Query(None, max_length=100), category: str | None = Query(None, max_length=60),
          priority: Priority | None = None, assignee: str | None = Query(None, pattern='^(me|unassigned)$'),
          building_id: int | None = Query(None, alias='buildingId'), label: str | None = Query(None, max_length=40),
          db: Session = Depends(get_db),
          current: CurrentUser = Depends(require_permission(*BOARD_VIEW))):
    stmt = select(Complaint).join(Category)
    scope = visible_complaints_clause(current)
    if scope is not None:
        stmt = stmt.where(scope)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(Complaint.complaint_number.ilike(like), Complaint.title.ilike(like), Category.name.ilike(like)))
    if category:
        stmt = stmt.where(Category.name == category)
    if priority:
        stmt = stmt.where(Complaint.priority == priority)
    if building_id:
        stmt = stmt.where(Complaint.building_id == building_id)
    if label:
        stmt = stmt.where(Complaint.labels.any(Label.name == label.strip().lower()))
    active = select(ComplaintAssignment.id).where(ComplaintAssignment.complaint_id == Complaint.id,
                                                  ComplaintAssignment.is_active.is_(True))
    if assignee == 'me':
        stmt = stmt.where(active.where(ComplaintAssignment.assigned_to_id == current.id).exists())
    elif assignee == 'unassigned':
        stmt = stmt.where(~active.where(ComplaintAssignment.assignment_type.notin_(['WARDEN'])).exists())

    sub = stmt.subquery()
    counts = dict(db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all())
    columns = []
    for key, title, statuses in COLUMNS:
        done = key == S.RESOLVED
        rows = db.scalars(stmt.where(Complaint.status.in_(statuses))
                          .order_by(*([Complaint.updated_at.desc()] if done else [PRIORITY_ORDER, Complaint.updated_at.desc()]))
                          .limit(DONE_CARDS if done else CARDS_PER_COLUMN)).unique().all()
        columns.append(BoardColumn(status=key, title=title, statuses=statuses, total=sum(counts.get(s, 0) for s in statuses),
                                   cards=[BoardCard(**complaint_summary(c).model_dump(), allowed_moves=allowed_moves(current, c),
                                                    needs_decision=can_decide(current, c), labels=labels_out(c),
                                                    subtasks=subtask_progress(c)) for c in rows]))
    return Envelope(data=BoardOut(columns=columns))


@router.get('/tickets/{key}', response_model=Envelope[ComplaintDetail])
def ticket(key: str, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    """One ticket by its key, for the ticket page. Out-of-scope tickets answer 404, like any other complaint."""
    c = db.scalar(select(Complaint).where(func.upper(Complaint.complaint_number) == key.strip().upper()))
    if c is None or not can_view(current, c):
        raise not_found()
    return Envelope(data=detail(db, c, current))

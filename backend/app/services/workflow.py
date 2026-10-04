"""Complaint status lifecycle, from section 15 of the frontend handoff specification.

Every status change in the API goes through `check_transition`, so no endpoint can move a complaint into a
state the workflow does not allow. Only holders of COMPLAINT_STATUS_OVERRIDE (Admin) may bypass it, and
an override always requires remarks and is audited.
"""
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models import Complaint, ComplaintStatus as S

TRANSITIONS: dict[S, set[S]] = {
    S.SUBMITTED: {S.UNDER_REVIEW, S.ASSIGNED, S.REJECTED, S.DUPLICATE, S.ESCALATED},
    S.UNDER_REVIEW: {S.ASSIGNED, S.WAITING_FOR_INFORMATION, S.REJECTED, S.DUPLICATE, S.ESCALATED},
    S.ASSIGNED: {S.IN_PROGRESS, S.UNDER_REVIEW, S.WAITING_FOR_INFORMATION, S.ESCALATED},
    S.IN_PROGRESS: {S.WAITING_FOR_INFORMATION, S.RESOLVED, S.ESCALATED},
    S.WAITING_FOR_INFORMATION: {S.IN_PROGRESS, S.UNDER_REVIEW, S.ESCALATED},
    S.ESCALATED: {S.UNDER_REVIEW, S.ASSIGNED, S.IN_PROGRESS, S.RESOLVED},
    S.RESOLVED: {S.CLOSED, S.REOPENED},
    S.REOPENED: {S.UNDER_REVIEW, S.ASSIGNED, S.IN_PROGRESS, S.ESCALATED},
    S.CLOSED: set(),
    S.REJECTED: set(),
    S.DUPLICATE: set(),
}

TERMINAL = {S.CLOSED, S.REJECTED, S.DUPLICATE}
RESOLVED_SET = {S.RESOLVED, S.CLOSED}
OPEN = set(S) - TERMINAL - {S.RESOLVED}
# Dashboard groupings shown on the Admin and Student dashboards
PENDING = {S.SUBMITTED, S.UNDER_REVIEW, S.REOPENED}
IN_PROGRESS_GROUP = {S.ASSIGNED, S.IN_PROGRESS, S.WAITING_FOR_INFORMATION, S.ESCALATED}


def check_transition(current: S, target: S) -> None:
    if target not in TRANSITIONS[current]:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            detail=f'A complaint cannot move from {label(current)} to {label(target)}')


def apply_status(c: Complaint, target: S) -> None:
    now = datetime.now(timezone.utc)
    c.status = target
    if target == S.RESOLVED:
        c.resolved_at = now
    elif target == S.REOPENED:
        c.resolved_at = None
    if target in TERMINAL:
        c.closed_at = now


def is_overdue(c: Complaint) -> bool:
    return (c.expected_resolution_at is not None and c.status in OPEN
            and c.expected_resolution_at < datetime.now(timezone.utc))


def label(s: S) -> str:
    return s.value.replace('_', ' ').title()

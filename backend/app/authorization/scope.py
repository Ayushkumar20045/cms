"""Scope rules: which complaints a user may see, given the view permissions they hold.

A user's visible set is the union of every scope they are entitled to:
COMPLAINT_VIEW_ALL -> every complaint (Admin)
COMPLAINT_VIEW_HOSTEL -> complaints of the hostel they serve (Warden)
COMPLAINT_VIEW_ASSIGNED -> complaints with an active assignment to them (Caretaker, Authority)
COMPLAINT_VIEW_OWN -> complaints they raised (Student)
"""
from fastapi import HTTPException, status
from sqlalchemy import and_, exists, false, or_

from app.authorization.deps import CurrentUser
from app.models import Complaint, ComplaintAssignment


def visible_complaints_clause(current: CurrentUser):
    if current.has('COMPLAINT_VIEW_ALL'):
        return None
    clauses = []
    if current.has('COMPLAINT_VIEW_HOSTEL') and current.hostel_id:
        clauses.append(Complaint.hostel_id == current.hostel_id)
    if current.has('COMPLAINT_VIEW_ASSIGNED'):
        clauses.append(exists().where(and_(ComplaintAssignment.complaint_id == Complaint.id,
                                           ComplaintAssignment.assigned_to_id == current.id,
                                           ComplaintAssignment.is_active.is_(True))))
    if current.has('COMPLAINT_VIEW_OWN'):
        clauses.append(Complaint.student_id == current.id)
    return or_(*clauses) if clauses else false()


def can_view(current: CurrentUser, c: Complaint) -> bool:
    return (current.has('COMPLAINT_VIEW_ALL')
            or (current.has('COMPLAINT_VIEW_HOSTEL') and current.hostel_id is not None and c.hostel_id == current.hostel_id)
            or (current.has('COMPLAINT_VIEW_ASSIGNED') and any(a.assigned_to_id == current.id for a in c.active_assignments))
            or (current.has('COMPLAINT_VIEW_OWN') and c.student_id == current.id))


def is_owner(current: CurrentUser, c: Complaint) -> bool:
    return c.student_id == current.id


def sees_internal(current: CurrentUser) -> bool:
    """Internal comments and staff-only details are hidden from students."""
    return current.has('COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_VIEW_ALL')


def not_found():
    # Out-of-scope records are reported as not found, so their existence is not disclosed
    return HTTPException(status.HTTP_404_NOT_FOUND, detail='Complaint not found')

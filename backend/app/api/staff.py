"""Dashboards for hostel and maintenance staff (warden, caretaker, technician, supervisor ...).

Everything is counted inside the signed-in user's own scope, so a warden sees their hostel, a caretaker the
work assigned to them and a supervisor their department.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import and_, exists, func, select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, require_permission
from app.authorization.scope import visible_complaints_clause
from app.db import get_db
from app.models import Complaint, ComplaintStatus as S, Role, User, user_roles
from app.schemas import Envelope, RecurringIssue, SimilarComplaint, StaffCounts, StaffDashboard, StaffHostel
from app.serializers import complaint_summary, hostel_brief, location
from app.services import recurring
from app.services.workflow import OPEN, PENDING, RESOLVED_SET

router = APIRouter(prefix='/api/v1/staff/me', tags=['staff'])

STAFF_VIEW = ('COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_VIEW_DEPARTMENT')


@router.get('/dashboard', response_model=Envelope[StaffDashboard])
def dashboard(db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission(*STAFF_VIEW))):
    scope = visible_complaints_clause(current)
    mine = select(Complaint).where(scope) if scope is not None else select(Complaint)
    sub = mine.subquery()
    by_status = dict(db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all())
    count = lambda group: sum(by_status.get(s, 0) for s in group)  # noqa: E731
    overdue = db.scalar(select(func.count()).select_from(sub).where(
        sub.c.expected_resolution_at.is_not(None), sub.c.expected_resolution_at < func.now(), sub.c.status.in_(OPEN)))
    recent = db.scalars(mine.order_by(Complaint.updated_at.desc()).limit(5)).unique().all()

    hostel = None
    if current.user.hostel is not None:
        h = current.user.hostel
        students = db.scalar(select(func.count(User.id)).where(User.hostel_id == h.id, exists().where(and_(
            user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == 'STUDENT'))))
        active = db.scalar(select(func.count(Complaint.id)).where(Complaint.hostel_id == h.id, Complaint.status.in_(OPEN)))
        hostel = StaffHostel(hostel=hostel_brief(h), students=students, active_issues=active)

    return Envelope(data=StaffDashboard(
        counts=StaffCounts(total=sum(by_status.values()), pending=count(PENDING), assigned=by_status.get(S.ASSIGNED, 0),
                           in_progress=count({S.IN_PROGRESS, S.ESCALATED}),
                           waiting_for_materials=by_status.get(S.WAITING_FOR_MATERIALS, 0),
                           waiting_for_information=by_status.get(S.WAITING_FOR_INFORMATION, 0),
                           resolved=count(RESOLVED_SET), overdue=overdue),
        recent=[complaint_summary(c) for c in recent], hostel=hostel))


@router.get('/recurring', response_model=Envelope[list[RecurringIssue]])
def recurring_issues(db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_VIEW_DEPARTMENT',
                                                                       'COMPLAINT_VIEW_ALL'))):
    """Problems reported again and again within the viewer's scope (their hostel, department, or everything for admins)."""
    out = []
    for g in recurring.clusters(db, visible_complaints_clause(current)):
        items = sorted(g.complaints, key=lambda c: c.created_at, reverse=True)
        latest = items[0]
        out.append(RecurringIssue(
            key=f'{latest.building_id}:{latest.category_id}:{latest.room_id or "any"}', title=latest.title,
            category=latest.category.name, location=location(latest).label, count=len(items),
            open=sum(1 for c in items if c.status in OPEN), first_at=items[-1].created_at, latest_at=latest.created_at,
            complaints=[SimilarComplaint(id=c.id, complaint_number=c.complaint_number, title=c.title, status=c.status,
                                         created_at=c.created_at) for c in items]))
    return Envelope(data=out)

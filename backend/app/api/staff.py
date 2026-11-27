"""Dashboards for hostel and maintenance staff (warden, caretaker, technician, supervisor ...).

Everything is counted inside the signed-in user's own scope, so a warden sees their hostel, a caretaker the
work assigned to them and a supervisor their department.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, case, exists, false, func, or_, select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, require_permission
from app.authorization.scope import visible_complaints_clause
from app.db import get_db
from app.models import Category, Complaint, ComplaintStatus as S, Hostel, Role, User, UserStatus, user_roles
from app.schemas import (Envelope, HostelStudent, NamedCount, RecurringIssue, SimilarComplaint, StaffContact, StaffCounts,
                         StaffDashboard, StaffHostel, WardenHostel)
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


def _own_hostel(current: CurrentUser) -> Hostel:
    """Wardens see only the hostel they serve."""
    if current.user.hostel is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='No hostel is assigned to your account')
    return current.user.hostel


def _with_role(role: str):
    return exists().where(and_(user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == role))


@router.get('/students', response_model=Envelope[list[HostelStudent]])
def hostel_students(search: str | None = Query(None, max_length=100), db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_HOSTEL'))):
    """Students living in the warden's hostel, with how many complaints each has raised and how many are open."""
    h = _own_hostel(current)
    stmt = select(User).where(User.hostel_id == h.id, _with_role('STUDENT'))
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(User.login_id.ilike(like), User.room_number.ilike(like),
                              func.concat(User.first_name, ' ', User.last_name).ilike(like)))
    students = db.scalars(stmt.order_by(User.block, User.room_number, User.first_name)).unique().all()
    counts = dict(((r.requester_id, (r.total, r.open)) for r in db.execute(
        select(Complaint.requester_id, func.count().label('total'),
               func.count(case((Complaint.status.in_(OPEN), 1))).label('open'))
        .where(Complaint.requester_id.in_([u.id for u in students]) if students else false())
        .group_by(Complaint.requester_id))))
    return Envelope(data=[HostelStudent(id=u.id, full_name=u.full_name, login_id=u.login_id, email=u.email, phone=u.phone,
                                        block=u.block, room_number=u.room_number, status=u.status,
                                        total_complaints=counts.get(u.id, (0, 0))[0], open_complaints=counts.get(u.id, (0, 0))[1])
                          for u in students])


@router.get('/hostel', response_model=Envelope[WardenHostel])
def my_hostel(db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_HOSTEL'))):
    """The warden's own hostel: its details, wardens and caretakers, and how its complaints stand."""
    h = _own_hostel(current)

    def staff_with(role: str) -> list[StaffContact]:
        rows = db.scalars(select(User).where(User.hostel_id == h.id, User.status == UserStatus.ACTIVE, _with_role(role))
                          .order_by(User.first_name)).unique().all()
        return [StaffContact(id=u.id, full_name=u.full_name, email=u.email, phone=u.phone) for u in rows]

    in_hostel = Complaint.hostel_id == h.id
    by_status = db.execute(select(Complaint.status, func.count()).where(in_hostel).group_by(Complaint.status)).all()
    by_category = db.execute(select(Category.name, func.count()).join(Complaint, Complaint.category_id == Category.id)
                             .where(in_hostel).group_by(Category.name).order_by(func.count().desc())).all()
    students = db.scalar(select(func.count(User.id)).where(User.hostel_id == h.id, _with_role('STUDENT')))
    return Envelope(data=WardenHostel(
        hostel=hostel_brief(h), building_name=h.building.name if h.building else None,
        on_map=bool(h.building is not None and h.building.geom is not None), capacity=h.capacity,
        contact_phone=h.contact_phone, contact_email=h.contact_email, students=students,
        open_complaints=sum(n for st, n in by_status if st in OPEN),
        resolved_complaints=sum(n for st, n in by_status if st in RESOLVED_SET),
        total_complaints=sum(n for _, n in by_status),
        wardens=staff_with('WARDEN'), caretakers=staff_with('CARETAKER'),
        by_category=[NamedCount(name=n, count=c) for n, c in by_category],
        by_status=[NamedCount(name=st.value, count=n) for st, n in sorted(by_status, key=lambda x: -x[1])]))

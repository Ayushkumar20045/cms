from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Category, Complaint, ComplaintStatus, ComplaintStatusHistory, User
from app.schemas import ActivityOut, ComplaintSummary, Envelope, PageOf, Pagination, StudentProfile, StudentSummary
from app.serializers import complaint_summary, me
from app.services.workflow import RESOLVED_SET, TERMINAL

router = APIRouter(prefix='/api/v1/students/me', tags=['student'])


@router.get('', response_model=Envelope[StudentProfile])
def my_profile(db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_OWN'))):
    """Profile, hostel allocation and complaint counts for the Student Dashboard."""
    rows = dict(db.execute(select(Complaint.status, func.count()).where(Complaint.student_id == current.id)
                           .group_by(Complaint.status)).all())
    total = sum(rows.values())
    resolved = sum(n for s, n in rows.items() if s in RESOLVED_SET)
    active = sum(n for s, n in rows.items() if s not in RESOLVED_SET and s not in TERMINAL)
    return Envelope(data=StudentProfile(user=me(current.user), summary=StudentSummary(total=total, active=active, resolved=resolved)))


@router.get('/complaints', response_model=PageOf[ComplaintSummary])
def my_complaints(search: str | None = Query(None, max_length=100), status: ComplaintStatus | None = None,
                  category: str | None = Query(None, max_length=60), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                  db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_OWN'))):
    stmt = select(Complaint).join(Category).where(Complaint.student_id == current.id)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(Complaint.complaint_number.ilike(like), Complaint.title.ilike(like), Category.name.ilike(like)))
    if status:
        stmt = stmt.where(Complaint.status == status)
    if category:
        stmt = stmt.where(Category.name == category)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Complaint.created_at.desc()).offset((page - 1) * limit).limit(limit)).unique().all()
    return PageOf(data=[complaint_summary(c) for c in rows],
                  pagination=Pagination(page=page, limit=limit, total=total, total_pages=max(1, -(-total // limit))))


@router.get('/activity', response_model=Envelope[list[ActivityOut]])
def my_activity(limit: int = Query(5, ge=1, le=50), db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_OWN'))):
    """Latest status changes on the student's complaints, for the dashboard activity feed."""
    rows = db.execute(select(ComplaintStatusHistory, Complaint).join(Complaint)
                      .where(Complaint.student_id == current.id)
                      .order_by(ComplaintStatusHistory.created_at.desc(), ComplaintStatusHistory.id.desc()).limit(limit)).all()
    out = []
    for h, c in rows:
        actor: User | None = h.changed_by
        role = None
        if actor is not None:
            names = actor.role_names
            role = ('Student' if actor.id == current.id else 'Hostel Warden' if 'WARDEN' in names
                    else 'Hostel Staff' if names & {'CARETAKER', 'AUTHORITY'} else 'Administration')
        # Student-facing feed: staff remarks are not shown here, only on the complaint itself when shared
        out.append(ActivityOut(complaint_number=c.complaint_number, title=c.title, old_status=h.old_status, new_status=h.new_status,
                               remarks=h.remarks if actor is not None and actor.id == current.id else None,
                               actor_role=role, created_at=h.created_at))
    return Envelope(data=out)

"""Material and equipment requirements ("Requirements" in the staff and admin portals).

Wardens, caretakers and technicians raise them; administrators, department heads and the store manager
approve or reject them, and mark approved ones fulfilled once the items are issued.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import false, func, or_, select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, require_permission
from app.authorization.scope import can_view
from app.db import get_db
from app.models import Category, Complaint, Requirement, RequirementStatus as R, User, requirement_number_seq
from app.schemas import (Envelope, PageOf, Pagination, RequirementCounts, RequirementDecisionIn, RequirementIn, RequirementOut)
from app.serializers import department_brief, hostel_brief, user_brief
from app.services.audit import audit

router = APIRouter(prefix='/api/v1/requirements', tags=['requirements'])

ROLE_LABEL = [('WARDEN', 'Warden'), ('CARETAKER', 'Caretaker'), ('TECHNICIAN', 'Technician'), ('SUPERVISOR', 'Supervisor'),
              ('DEPARTMENT_HEAD', 'Department Head'), ('STORE_MANAGER', 'Store Manager'), ('ADMIN', 'Admin'),
              ('SUPER_ADMIN', 'Super Admin')]
# What each decision may follow
DECISIONS = {'APPROVED': {R.PENDING}, 'REJECTED': {R.PENDING}, 'FULFILLED': {R.APPROVED}}


def role_label(u: User) -> str:
    return next((label for role, label in ROLE_LABEL if role in u.role_names), 'Staff')


def requirement_out(r: Requirement) -> RequirementOut:
    return RequirementOut(id=r.id, requirement_number=r.requirement_number, item=r.item, category=r.category.name if r.category else None,
                          quantity=r.quantity, reason=r.reason, status=r.status, hostel=hostel_brief(r.hostel),
                          department=department_brief(r.department), complaint_number=r.complaint.complaint_number if r.complaint else None,
                          requested_by=user_brief(r.requested_by), requested_by_role=role_label(r.requested_by),
                          decided_by=user_brief(r.decided_by), decided_at=r.decided_at, decision_remarks=r.decision_remarks,
                          created_at=r.created_at)


def _sees_all(current: CurrentUser) -> bool:
    # Administrators, and approvers not tied to a hostel or department (the store manager)
    return current.has('COMPLAINT_VIEW_ALL') or (current.has('REQUIREMENT_APPROVE') and not current.hostel_id
                                                 and not current.department_id)


def _scope(current: CurrentUser):
    if _sees_all(current):
        return None
    clauses = [Requirement.requested_by_id == current.id]
    if current.has('COMPLAINT_VIEW_HOSTEL') and current.hostel_id:
        clauses.append(Requirement.hostel_id == current.hostel_id)
    if current.has('COMPLAINT_VIEW_DEPARTMENT') and current.department_id:
        clauses.append(Requirement.department_id == current.department_id)
    return or_(*clauses) if clauses else false()


def _get(db: Session, current: CurrentUser, requirement_id: uuid.UUID) -> Requirement:
    r = db.get(Requirement, requirement_id)
    scope = _scope(current)
    if r is None or (scope is not None and not db.scalar(select(Requirement.id).where(Requirement.id == r.id, scope))):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Requirement not found')
    return r


@router.post('', response_model=Envelope[RequirementOut], status_code=201)
def create(body: RequirementIn, request: Request, db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_permission('REQUIREMENT_CREATE'))):
    if body.category_id is not None and db.get(Category, body.category_id) is None:
        raise HTTPException(422, detail=[{'field': 'categoryId', 'message': 'Unknown category'}])
    complaint = None
    if body.complaint_id is not None:
        complaint = db.get(Complaint, body.complaint_id)
        if complaint is None or not can_view(current, complaint):
            raise HTTPException(422, detail=[{'field': 'complaintId', 'message': 'Unknown complaint'}])
    seq = db.scalar(select(requirement_number_seq.next_value()))
    r = Requirement(requirement_number=f'REQ-{datetime.now(timezone.utc).year}-{seq:04d}', item=body.item, category_id=body.category_id,
                    quantity=body.quantity, reason=body.reason, requested_by_id=current.id,
                    hostel_id=complaint.hostel_id if complaint else current.hostel_id,
                    department_id=complaint.department_id if complaint else current.department_id,
                    complaint_id=complaint.id if complaint else None)
    db.add(r)
    db.flush()
    audit(db, request, current.id, 'REQUIREMENT_CREATED', 'requirement', r.requirement_number,
          new_value={'item': r.item, 'quantity': r.quantity, 'complaint': complaint.complaint_number if complaint else None})
    db.commit()
    db.refresh(r)
    return Envelope(data=requirement_out(r), message=f'Requirement {r.requirement_number} submitted')


@router.get('', response_model=PageOf[RequirementOut])
def list_requirements(search: str | None = Query(None, max_length=100), status_: R | None = Query(None, alias='status'),
                      page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
                      current: CurrentUser = Depends(require_permission('REQUIREMENT_VIEW'))):
    stmt = select(Requirement).join(User, Requirement.requested_by_id == User.id)
    scope = _scope(current)
    if scope is not None:
        stmt = stmt.where(scope)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(Requirement.requirement_number.ilike(like), Requirement.item.ilike(like),
                              func.concat(User.first_name, ' ', User.last_name).ilike(like)))
    if status_:
        stmt = stmt.where(Requirement.status == status_)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Requirement.created_at.desc()).offset((page - 1) * limit).limit(limit)).unique().all()
    return PageOf(data=[requirement_out(r) for r in rows],
                  pagination=Pagination(page=page, limit=limit, total=total, total_pages=max(1, -(-total // limit))))


@router.get('/summary', response_model=Envelope[RequirementCounts])
def summary(db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('REQUIREMENT_VIEW'))):
    stmt = select(Requirement.status, func.count()).group_by(Requirement.status)
    scope = _scope(current)
    if scope is not None:
        stmt = stmt.where(scope)
    by = dict(db.execute(stmt).all())
    return Envelope(data=RequirementCounts(total=sum(by.values()), pending=by.get(R.PENDING, 0), approved=by.get(R.APPROVED, 0),
                                           rejected=by.get(R.REJECTED, 0), fulfilled=by.get(R.FULFILLED, 0)))


@router.post('/{requirement_id}/decision', response_model=Envelope[RequirementOut])
def decide(requirement_id: uuid.UUID, body: RequirementDecisionIn, request: Request, db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_permission('REQUIREMENT_APPROVE'))):
    r = _get(db, current, requirement_id)
    target = R(body.decision)
    if r.status not in DECISIONS[body.decision]:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            detail=f'A {r.status.value.lower()} requirement cannot be marked {target.value.lower()}')
    if target == R.REJECTED and not (body.remarks or '').strip():
        raise HTTPException(422, detail=[{'field': 'remarks', 'message': 'Please give a reason for rejecting'}])
    old = r.status
    r.status, r.decided_by_id, r.decided_at = target, current.id, datetime.now(timezone.utc)
    if body.remarks:
        r.decision_remarks = body.remarks.strip()
    audit(db, request, current.id, f'REQUIREMENT_{target.value}', 'requirement', r.requirement_number,
          old_value={'status': old.value}, new_value={'status': target.value, 'remarks': body.remarks})
    db.commit()
    db.refresh(r)
    return Envelope(data=requirement_out(r), message=f'Requirement {target.value.lower()}')

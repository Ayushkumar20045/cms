import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, exists, func, or_, select, update
from sqlalchemy.orm import Session

from app.api.complaints import detail, record_status
from app.authorization.catalog import PRIVILEGED_ROLES, STAFF_ROLES
from app.authorization.deps import CurrentUser, require_permission
from app.core.security import hash_password
from app.db import get_db
from app.models import (AssignmentType, AuditLog, Category, Complaint, ComplaintAssignment, ComplaintStatus as S, Hostel, Priority,
                        RefreshToken, Role, User, UserStatus, user_roles)
from app.schemas import (AdminComplaintUpdateIn, AdminCounts, AdminDashboard, AssignIn, AuditOut, CategoryIn, CategoryOut,
                         CategoryUpdateIn, ComplaintDetail, ComplaintSummary, EscalateIn, Envelope, HostelCount, HostelIn, HostelOut,
                         HostelUpdateIn, PageOf, Pagination, PasswordResetIn, UserCreateIn, UserOut, UserUpdateIn)
from app.serializers import complaint_summary, user_brief, user_out
from app.services.audit import audit
from app.services.workflow import IN_PROGRESS_GROUP, OPEN, PENDING, RESOLVED_SET, apply_status, check_transition

router = APIRouter(prefix='/api/v1/admin', tags=['admin'])


def _page(total: int, page: int, limit: int) -> Pagination:
    return Pagination(page=page, limit=limit, total=total, total_pages=max(1, -(-total // limit)))


def _overdue_clause():
    return and_(Complaint.expected_resolution_at.is_not(None), Complaint.expected_resolution_at < func.now(),
                Complaint.status.in_(OPEN))


# ================================================================ dashboard

@router.get('/dashboard', response_model=Envelope[AdminDashboard])
def dashboard(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('DASHBOARD_VIEW_ALL'))):
    by_status = {s.value: n for s, n in db.execute(select(Complaint.status, func.count()).group_by(Complaint.status)).all()}
    count = lambda group: sum(by_status.get(s.value, 0) for s in group)  # noqa: E731
    overdue = db.scalar(select(func.count(Complaint.id)).where(_overdue_clause()))
    hostels = db.execute(select(Hostel.name, func.count(Complaint.id)).join(Complaint, Complaint.hostel_id == Hostel.id)
                         .group_by(Hostel.name).order_by(func.count(Complaint.id).desc())).all()
    recent = db.scalars(select(Complaint).order_by(Complaint.created_at.desc()).limit(5)).unique().all()
    return Envelope(data=AdminDashboard(
        counts=AdminCounts(total=sum(by_status.values()), pending=count(PENDING), in_progress=count(IN_PROGRESS_GROUP),
                           resolved=count(RESOLVED_SET), overdue=overdue),
        by_status=by_status, by_hostel=[HostelCount(hostel=h, count=n) for h, n in hostels],
        recent_complaints=[complaint_summary(c) for c in recent],
        pending_requirements=0))  # requirement tickets arrive with the Warden/Caretaker module


# ================================================================ complaints

@router.get('/complaints', response_model=PageOf[ComplaintSummary])
def list_complaints(search: str | None = Query(None, max_length=100), status_: S | None = Query(None, alias='status'),
                    category: str | None = Query(None, max_length=60), hostel_id: int | None = Query(None, alias='hostelId'),
                    priority: Priority | None = None, overdue: bool = False, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
                    db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_ALL'))):
    stmt = select(Complaint).join(Category).join(User, Complaint.student_id == User.id).outerjoin(Hostel, Complaint.hostel_id == Hostel.id)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(Complaint.complaint_number.ilike(like), Complaint.title.ilike(like), Category.name.ilike(like),
                              Hostel.name.ilike(like), User.login_id.ilike(like),
                              func.concat(User.first_name, ' ', User.last_name).ilike(like)))
    if status_:
        stmt = stmt.where(Complaint.status == status_)
    if category:
        stmt = stmt.where(Category.name == category)
    if hostel_id:
        stmt = stmt.where(Complaint.hostel_id == hostel_id)
    if priority:
        stmt = stmt.where(Complaint.priority == priority)
    if overdue:
        stmt = stmt.where(_overdue_clause())
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Complaint.created_at.desc()).offset((page - 1) * limit).limit(limit)).unique().all()
    return PageOf(data=[complaint_summary(c) for c in rows], pagination=_page(total, page, limit))


def _complaint(db: Session, complaint_id: uuid.UUID) -> Complaint:
    c = db.get(Complaint, complaint_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Complaint not found')
    return c


@router.get('/complaints/{complaint_id}', response_model=Envelope[ComplaintDetail])
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_ALL'))):
    return Envelope(data=detail(db, _complaint(db, complaint_id), current))


@router.patch('/complaints/{complaint_id}', response_model=Envelope[ComplaintDetail])
def update_complaint(complaint_id: uuid.UUID, body: AdminComplaintUpdateIn, request: Request, db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission('COMPLAINT_VIEW_ALL'))):
    """Admin changes to status, priority and expected resolution date. Each field needs its own permission."""
    c = _complaint(db, complaint_id)
    fields = body.model_fields_set - {'remarks', 'override'}
    if not fields:
        raise HTTPException(422, detail=[{'field': None, 'message': 'Nothing to update'}])
    old, new = {}, {}
    if 'priority' in fields and body.priority is not None and body.priority != c.priority:
        if not current.has('COMPLAINT_CHANGE_PRIORITY'):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot change priority')
        old['priority'], new['priority'] = c.priority.value, body.priority.value
        c.priority = body.priority
    if 'expected_resolution_at' in fields:
        if not current.has('COMPLAINT_SET_EXPECTED_RESOLUTION'):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot set the expected resolution date')
        old['expectedResolutionAt'] = c.expected_resolution_at.isoformat() if c.expected_resolution_at else None
        new['expectedResolutionAt'] = body.expected_resolution_at.isoformat() if body.expected_resolution_at else None
        c.expected_resolution_at = body.expected_resolution_at
    if 'status' in fields and body.status is not None and body.status != c.status:
        if not current.has('COMPLAINT_UPDATE_STATUS'):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot change status')
        if body.override:
            if not current.has('COMPLAINT_STATUS_OVERRIDE'):
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot override the workflow')
            if not body.remarks:
                raise HTTPException(422, detail=[{'field': 'remarks', 'message': 'Remarks are required for a status override'}])
        else:
            check_transition(c.status, body.status)
        old['status'], new['status'] = c.status.value, body.status.value
        prev = c.status
        apply_status(c, body.status)
        record_status(db, c, prev, body.status, current.id, body.remarks)
    if new:
        audit(db, request, current.id, 'COMPLAINT_STATUS_OVERRIDE' if body.override and 'status' in new else 'COMPLAINT_UPDATED',
              'complaint', c.complaint_number, old_value=old, new_value={**new, 'remarks': body.remarks})
        db.commit()
    return Envelope(data=detail(db, c, current), message='Complaint updated')


def _assignee(db: Session, assignee_id: uuid.UUID, c: Complaint) -> tuple[User, AssignmentType]:
    u = db.get(User, assignee_id)
    if u is None or u.status != UserStatus.ACTIVE:
        raise HTTPException(422, detail=[{'field': 'assigneeId', 'message': 'Assignee must be an active staff member'}])
    roles = u.role_names & STAFF_ROLES
    if not roles:
        raise HTTPException(422, detail=[{'field': 'assigneeId', 'message': 'Assignee must be a warden, caretaker or authority'}])
    kind = AssignmentType(sorted(roles, key=['CARETAKER', 'WARDEN', 'AUTHORITY'].index)[0])
    # Hostel staff can only be given complaints from the hostel they serve
    if kind in (AssignmentType.WARDEN, AssignmentType.CARETAKER) and u.hostel_id != c.hostel_id:
        raise HTTPException(422, detail=[{'field': 'assigneeId', 'message': f"{u.full_name} does not serve this complaint's hostel"}])
    return u, kind


def _assign(db, request, current, c: Complaint, body: AssignIn, replace: bool) -> None:
    u, kind = _assignee(db, body.assignee_id, c)
    same_kind = [a for a in c.active_assignments if a.assignment_type == kind]
    if any(a.assigned_to_id == u.id for a in same_kind):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f'Already assigned to {u.full_name}')
    if replace and not same_kind:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f'No active {kind.value.lower()} assignment to replace; use assign')
    if not replace and same_kind:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f'A {kind.value.lower()} is already assigned; use reassign')
    if c.status in (S.RESOLVED, S.CLOSED, S.REJECTED, S.DUPLICATE):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='A resolved or closed complaint cannot be assigned')
    now = datetime.now(timezone.utc)
    previous = []
    for a in same_kind:
        a.is_active, a.unassigned_at = False, now
        previous.append(str(a.assigned_to_id))
    db.add(ComplaintAssignment(complaint_id=c.id, assigned_to_id=u.id, assigned_by_id=current.id, assignment_type=kind, remarks=body.remarks))
    # Giving the work to a caretaker or authority moves an un-started complaint to Assigned
    if kind != AssignmentType.WARDEN and c.status in (S.SUBMITTED, S.UNDER_REVIEW, S.REOPENED, S.ESCALATED):
        prev = c.status
        apply_status(c, S.ASSIGNED)
        record_status(db, c, prev, S.ASSIGNED, current.id, body.remarks or f'Assigned to {u.full_name}')
    audit(db, request, current.id, 'COMPLAINT_REASSIGNED' if replace else 'COMPLAINT_ASSIGNED', 'complaint', c.complaint_number,
          old_value={'assignedTo': previous} if previous else None,
          new_value={'assignedTo': str(u.id), 'type': kind.value, 'remarks': body.remarks})
    db.commit()


@router.post('/complaints/{complaint_id}/assign', response_model=Envelope[ComplaintDetail])
def assign(complaint_id: uuid.UUID, body: AssignIn, request: Request, db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_permission('COMPLAINT_ASSIGN'))):
    c = _complaint(db, complaint_id)
    _assign(db, request, current, c, body, replace=False)
    return Envelope(data=detail(db, c, current), message='Complaint assigned')


@router.post('/complaints/{complaint_id}/reassign', response_model=Envelope[ComplaintDetail])
def reassign(complaint_id: uuid.UUID, body: AssignIn, request: Request, db: Session = Depends(get_db),
             current: CurrentUser = Depends(require_permission('COMPLAINT_REASSIGN'))):
    c = _complaint(db, complaint_id)
    _assign(db, request, current, c, body, replace=True)
    return Envelope(data=detail(db, c, current), message='Complaint reassigned')


@router.post('/complaints/{complaint_id}/escalate', response_model=Envelope[ComplaintDetail])
def escalate(complaint_id: uuid.UUID, body: EscalateIn, request: Request, db: Session = Depends(get_db),
             current: CurrentUser = Depends(require_permission('COMPLAINT_ESCALATE'))):
    c = _complaint(db, complaint_id)
    check_transition(c.status, S.ESCALATED)
    prev = c.status
    apply_status(c, S.ESCALATED)
    record_status(db, c, prev, S.ESCALATED, current.id, body.reason)
    if body.assignee_id:
        u, kind = _assignee(db, body.assignee_id, c)
        db.add(ComplaintAssignment(complaint_id=c.id, assigned_to_id=u.id, assigned_by_id=current.id, assignment_type=kind,
                                   remarks=f'Escalation: {body.reason}'))
    audit(db, request, current.id, 'COMPLAINT_ESCALATED', 'complaint', c.complaint_number, old_value={'status': prev.value},
          new_value={'status': 'ESCALATED', 'reason': body.reason, 'assignee': str(body.assignee_id) if body.assignee_id else None})
    db.commit()
    return Envelope(data=detail(db, c, current), message='Complaint escalated')


# ================================================================ users

def _roles(db: Session, names: list[str], current: CurrentUser) -> list[Role]:
    names = sorted({n.upper() for n in names})
    if PRIVILEGED_ROLES & set(names) and not current.has('ROLE_UPDATE'):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='Only a Super Admin can grant administrator roles')
    roles = list(db.scalars(select(Role).where(Role.name.in_(names))))
    if len(roles) != len(names):
        raise HTTPException(422, detail=[{'field': 'roles', 'message': 'Unknown role'}])
    return roles


def _target_user(db: Session, user_id: uuid.UUID, current: CurrentUser) -> User:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='User not found')
    if u.role_names & PRIVILEGED_ROLES and not current.has('ROLE_UPDATE'):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='Only a Super Admin can change an administrator account')
    return u


def _hostel_ok(db: Session, hostel_id: int | None):
    if hostel_id is not None and db.get(Hostel, hostel_id) is None:
        raise HTTPException(422, detail=[{'field': 'hostelId', 'message': 'Unknown hostel'}])


def _revoke_sessions(db: Session, user_id: uuid.UUID):
    db.execute(update(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
               .values(revoked_at=datetime.now(timezone.utc)))


def _user_snapshot(u: User) -> dict:
    return {'email': u.email, 'name': u.full_name, 'roles': sorted(u.role_names), 'hostelId': u.hostel_id,
            'roomNumber': u.room_number, 'block': u.block}


@router.get('/users', response_model=PageOf[UserOut])
def list_users(search: str | None = Query(None, max_length=100), role: str | None = Query(None, max_length=30),
               status_: UserStatus | None = Query(None, alias='status'), hostel_id: int | None = Query(None, alias='hostelId'),
               page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
               _: CurrentUser = Depends(require_permission('USER_VIEW'))):
    stmt = select(User)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(User.login_id.ilike(like), User.email.ilike(like), func.concat(User.first_name, ' ', User.last_name).ilike(like)))
    if role:
        stmt = stmt.where(exists().where(and_(user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == role.upper())))
    if status_:
        stmt = stmt.where(User.status == status_)
    if hostel_id:
        stmt = stmt.where(User.hostel_id == hostel_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)).unique().all()
    return PageOf(data=[user_out(u) for u in rows], pagination=_page(total, page, limit))


@router.post('/users', response_model=Envelope[UserOut], status_code=201)
def create_user(body: UserCreateIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('USER_CREATE'))):
    if db.scalar(select(User.id).where(func.lower(User.login_id) == body.login_id.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='That login ID is already registered')
    email = body.email.lower() if body.email else None
    if email and db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='That email is already registered')
    _hostel_ok(db, body.hostel_id)
    u = User(login_id=body.login_id, email=email, password_hash=hash_password(body.password), first_name=body.first_name,
             last_name=body.last_name, phone=body.phone, hostel_id=body.hostel_id, room_number=body.room_number, block=body.block,
             roles=_roles(db, body.roles, current))
    db.add(u)
    db.flush()
    audit(db, request, current.id, 'USER_CREATED', 'user', u.id, new_value={'loginId': u.login_id, **_user_snapshot(u)})
    db.commit()
    db.refresh(u)
    return Envelope(data=user_out(u), message='User created')


@router.patch('/users/{user_id}', response_model=Envelope[UserOut])
def update_user(user_id: uuid.UUID, body: UserUpdateIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('USER_UPDATE'))):
    u = _target_user(db, user_id, current)
    old = _user_snapshot(u)
    data = body.model_dump(exclude_unset=True)
    if 'roles' in data:
        if u.id == current.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot change your own roles')
        u.roles = _roles(db, data.pop('roles'), current)
    if 'hostel_id' in data:
        _hostel_ok(db, data['hostel_id'])
    if data.get('email'):
        data['email'] = data['email'].lower()
        if db.scalar(select(User.id).where(func.lower(User.email) == data['email'], User.id != u.id)):
            raise HTTPException(status.HTTP_409_CONFLICT, detail='That email is already registered')
    for k, v in data.items():
        setattr(u, k, v)
    new = _user_snapshot(u)
    audit(db, request, current.id, 'ROLE_CHANGED' if old['roles'] != new['roles'] else 'USER_UPDATED', 'user', u.id, old, new)
    db.commit()
    db.refresh(u)
    return Envelope(data=user_out(u), message='User updated')


def _set_status(db, request, current, user_id, new_status: UserStatus, action: str):
    u = _target_user(db, user_id, current)
    if u.id == current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot change your own account status')
    old = u.status
    u.status = new_status
    if new_status == UserStatus.INACTIVE:
        _revoke_sessions(db, u.id)
    audit(db, request, current.id, action, 'user', u.id, {'status': old.value}, {'status': new_status.value})
    db.commit()
    return Envelope(data=user_out(u), message='User activated' if new_status == UserStatus.ACTIVE else 'User deactivated')


@router.post('/users/{user_id}/activate', response_model=Envelope[UserOut])
def activate_user(user_id: uuid.UUID, request: Request, db: Session = Depends(get_db),
                  current: CurrentUser = Depends(require_permission('USER_ACTIVATE'))):
    return _set_status(db, request, current, user_id, UserStatus.ACTIVE, 'USER_ACTIVATED')


@router.post('/users/{user_id}/deactivate', response_model=Envelope[UserOut])
def deactivate_user(user_id: uuid.UUID, request: Request, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('USER_DEACTIVATE'))):
    return _set_status(db, request, current, user_id, UserStatus.INACTIVE, 'USER_DEACTIVATED')


@router.post('/users/{user_id}/reset-password', response_model=Envelope[UserOut])
def reset_password(user_id: uuid.UUID, body: PasswordResetIn, request: Request, db: Session = Depends(get_db),
                   current: CurrentUser = Depends(require_permission('USER_RESET_PASSWORD'))):
    u = _target_user(db, user_id, current)
    u.password_hash = hash_password(body.new_password)
    _revoke_sessions(db, u.id)
    audit(db, request, current.id, 'USER_PASSWORD_RESET', 'user', u.id)
    db.commit()
    return Envelope(data=user_out(u), message='Password reset; the user must sign in again')


@router.get('/roles', response_model=Envelope[list[str]])
def list_roles(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('ROLE_VIEW'))):
    return Envelope(data=list(db.scalars(select(Role.name).order_by(Role.name))))


@router.get('/staff', response_model=Envelope[list[UserOut]])
def list_staff(hostel_id: int | None = Query(None, alias='hostelId'), db: Session = Depends(get_db),
               _: CurrentUser = Depends(require_permission('COMPLAINT_ASSIGN'))):
    """Active wardens, caretakers and authorities, for the assignment picker."""
    stmt = (select(User).where(User.status == UserStatus.ACTIVE,
                               exists().where(and_(user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id,
                                                   Role.name.in_(STAFF_ROLES)))))
    if hostel_id:
        stmt = stmt.where(or_(User.hostel_id == hostel_id, exists().where(and_(
            user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == 'AUTHORITY'))))
    return Envelope(data=[user_out(u) for u in db.scalars(stmt.order_by(User.first_name)).unique().all()])


# ================================================================ hostels

def _hostel_out(db: Session, h: Hostel) -> HostelOut:
    students = db.scalar(select(func.count(User.id)).where(User.hostel_id == h.id, exists().where(and_(
        user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == 'STUDENT'))))
    open_count = db.scalar(select(func.count(Complaint.id)).where(Complaint.hostel_id == h.id, Complaint.status.in_(OPEN)))
    wardens = db.scalars(select(User).where(User.hostel_id == h.id, User.status == UserStatus.ACTIVE, exists().where(and_(
        user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == 'WARDEN')))).unique().all()
    return HostelOut(id=h.id, code=h.code, name=h.name, capacity=h.capacity, contact_phone=h.contact_phone, contact_email=h.contact_email,
                     is_active=h.is_active, student_count=students, open_complaints=open_count, wardens=[user_brief(w) for w in wardens])


@router.get('/hostels', response_model=Envelope[list[HostelOut]])
def list_hostels(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('HOSTEL_VIEW'))):
    return Envelope(data=[_hostel_out(db, h) for h in db.scalars(select(Hostel).order_by(Hostel.name))])


@router.post('/hostels', response_model=Envelope[HostelOut], status_code=201)
def create_hostel(body: HostelIn, request: Request, db: Session = Depends(get_db),
                  current: CurrentUser = Depends(require_permission('HOSTEL_CREATE'))):
    if db.scalar(select(Hostel.id).where(or_(func.lower(Hostel.code) == body.code.lower(), func.lower(Hostel.name) == body.name.lower()))):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='A hostel with that code or name already exists')
    h = Hostel(**body.model_dump())
    db.add(h)
    db.flush()
    audit(db, request, current.id, 'HOSTEL_CREATED', 'hostel', h.id, new_value=body.model_dump())
    db.commit()
    return Envelope(data=_hostel_out(db, h), message='Hostel created')


@router.patch('/hostels/{hostel_id}', response_model=Envelope[HostelOut])
def update_hostel(hostel_id: int, body: HostelUpdateIn, request: Request, db: Session = Depends(get_db),
                  current: CurrentUser = Depends(require_permission('HOSTEL_UPDATE'))):
    h = db.get(Hostel, hostel_id)
    if h is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Hostel not found')
    data = body.model_dump(exclude_unset=True)
    old = {k: getattr(h, k) for k in data}
    for k, v in data.items():
        setattr(h, k, v)
    audit(db, request, current.id, 'HOSTEL_UPDATED', 'hostel', h.id, old_value=old, new_value=data)
    db.commit()
    return Envelope(data=_hostel_out(db, h), message='Hostel updated')


# ================================================================ categories

@router.get('/categories', response_model=Envelope[list[CategoryOut]])
def list_categories(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('CATEGORY_MANAGE'))):
    return Envelope(data=db.scalars(select(Category).order_by(Category.name)).all())


@router.post('/categories', response_model=Envelope[CategoryOut], status_code=201)
def create_category(body: CategoryIn, request: Request, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('CATEGORY_MANAGE'))):
    if db.scalar(select(Category.id).where(func.lower(Category.name) == body.name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='That category already exists')
    cat = Category(name=body.name, description=body.description)
    db.add(cat)
    db.flush()
    audit(db, request, current.id, 'CATEGORY_CREATED', 'category', cat.id, new_value=body.model_dump())
    db.commit()
    return Envelope(data=cat, message='Category created')


@router.patch('/categories/{category_id}', response_model=Envelope[CategoryOut])
def update_category(category_id: int, body: CategoryUpdateIn, request: Request, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('CATEGORY_MANAGE'))):
    cat = db.get(Category, category_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Category not found')
    data = body.model_dump(exclude_unset=True)
    old = {k: getattr(cat, k) for k in data}
    for k, v in data.items():
        setattr(cat, k, v)
    audit(db, request, current.id, 'CATEGORY_UPDATED', 'category', cat.id, old_value=old, new_value=data)
    db.commit()
    return Envelope(data=cat, message='Category updated')


# ================================================================ audit

@router.get('/audit-logs', response_model=PageOf[AuditOut])
def audit_logs(action: str | None = Query(None, max_length=60), resource_id: str | None = Query(None, alias='resourceId', max_length=64),
               page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db),
               _: CurrentUser = Depends(require_permission('AUDIT_LOG_VIEW'))):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_id:
        stmt = stmt.where(AuditLog.resource_id == resource_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).offset((page - 1) * limit).limit(limit)).all()
    return PageOf(data=[AuditOut.model_validate(r) for r in rows], pagination=_page(total, page, limit))

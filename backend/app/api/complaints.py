import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, get_current_user, require_permission
from app.core.config import get_settings
from app.authorization.scope import can_view, is_owner, not_found, sees_internal, visible_complaints_clause
from app.db import get_db
from app.models import (AssignmentType, Building, Category, CommentVisibility, Complaint, ComplaintAssignment, ComplaintAttachment,
                        ComplaintComment, ComplaintDecision, ComplaintStatus as S, ComplaintStatusHistory, Hostel, Priority, Room,
                        User, complaint_number_seq)
from app.schemas import (AcceptIn, CategoryOut, CommentIn, ComplaintDetail, ComplaintSummary, Envelope, PageOf, Pagination, RejectIn,
                         ReopenIn, StaffStatusIn)
from app.serializers import complaint_detail, complaint_summary
from app.services import mailer, recurring, storage
from app.services.audit import audit
from app.services.notifications import admins, notify, users_with_role
from app.services.workflow import DECIDABLE, OPEN, RESOLVED_SET, STAFF_SETTABLE, apply_status, check_transition, label

router = APIRouter(prefix='/api/v1', tags=['complaints'])

TITLE_MIN, TITLE_MAX, DESCRIPTION_MAX_WORDS = 5, 150, 200
LOCATION_DETAILS_MAX = 255
VIEW_PERMISSIONS = ('COMPLAINT_VIEW_OWN', 'COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_VIEW_DEPARTMENT',
                    'COMPLAINT_VIEW_ALL')


def get_visible(db: Session, current: CurrentUser, complaint_id: uuid.UUID) -> Complaint:
    c = db.get(Complaint, complaint_id)
    if c is None or not can_view(current, c):
        raise not_found()
    return c


def record_status(db: Session, c: Complaint, old: S | None, new: S, actor_id, remarks: str | None = None) -> None:
    db.add(ComplaintStatusHistory(complaint_id=c.id, old_status=old.value if old else None, new_status=new.value,
                                  changed_by_id=actor_id, remarks=remarks))


def detail(db: Session, c: Complaint, current: CurrentUser) -> ComplaintDetail:
    db.refresh(c)
    return complaint_detail(c, current, recurring.similar_to(db, c) if sees_internal(current) else None)


@router.get('/categories', response_model=Envelope[list[CategoryOut]])
def categories(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('CATEGORY_VIEW'))):
    return Envelope(data=db.scalars(select(Category).where(Category.is_active.is_(True)).order_by(Category.name)).all())


def resolve_location(db: Session, user: User, building_id: int | None, room_id: int | None,
                     details: str) -> tuple[Building | None, Room | None, str | None, list[dict]]:
    """Work out where the problem is. Without a building or room, a hostel resident's own hostel and room are used, and
    for faculty or staff living on campus, their quarters and house number."""
    errors, building, room = [], None, None
    if room_id is not None:
        room = db.get(Room, room_id)
        if room is None or not room.is_active:
            errors.append({'field': 'roomId', 'message': 'Please select a valid room.'})
        elif building_id is not None and room.floor.building_id != building_id:
            errors.append({'field': 'roomId', 'message': 'That room is not in the selected building.'})
        else:
            building = db.get(Building, room.floor.building_id)
    elif building_id is not None:
        building = db.get(Building, building_id)
        if building is None or not building.is_active:
            building = None
            errors.append({'field': 'buildingId', 'message': 'Please select a valid building.'})
    if building is None and not errors:
        if user.hostel is not None and user.hostel.building is not None:
            building = user.hostel.building
            if not details:
                details = ', '.join(p for p in (user.block, f'Room {user.room_number}' if user.room_number else None) if p)
        elif user.residence_building is not None and user.residence_building.is_active:
            building = user.residence_building
            if not details and user.residence_unit:
                details = f'House {user.residence_unit}'
        else:
            errors.append({'field': 'buildingId', 'message': 'Please choose the building where the problem is.'})
    if len(details) > LOCATION_DETAILS_MAX:
        errors.append({'field': 'locationDetails', 'message': f'Location details cannot exceed {LOCATION_DETAILS_MAX} characters.'})
    return building, room, details or None, errors


@router.post('/complaints', response_model=Envelope[ComplaintDetail], status_code=201)
def create_complaint(request: Request, category: str = Form(..., max_length=60), title: str = Form(...),
                     description: str = Form(''), building_id: int | None = Form(None, alias='buildingId'),
                     room_id: int | None = Form(None, alias='roomId'), location_details: str = Form('', alias='locationDetails'),
                     files: list[UploadFile] = File(default=[]), background: BackgroundTasks = BackgroundTasks(),
                     db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('COMPLAINT_CREATE'))):
    """Multipart form: category (name or id), title, optional description (max 200 words), optional location
    (buildingId, roomId, locationDetails) and optional files. Hostel residents may leave the location out."""
    title, description = title.strip(), description.strip()
    errors = []
    if not TITLE_MIN <= len(title) <= TITLE_MAX:
        errors.append({'field': 'title', 'message': f'Complaint title should be {TITLE_MIN} to {TITLE_MAX} characters.'})
    if len(description.split()) > DESCRIPTION_MAX_WORDS:
        errors.append({'field': 'description', 'message': f'Description cannot exceed {DESCRIPTION_MAX_WORDS} words.'})
    cat = db.scalar(select(Category).where(Category.is_active.is_(True),
                                           (Category.id == int(category)) if category.isdigit() else (Category.name == category)))
    if cat is None:
        errors.append({'field': 'category', 'message': 'Please select a valid complaint category.'})
    requester = current.user
    building, room, details, location_errors = resolve_location(db, requester, building_id, room_id, location_details.strip())
    errors += location_errors
    if errors:
        raise HTTPException(422, detail=errors)
    hostel = db.scalar(select(Hostel).where(Hostel.building_id == building.id))
    stored = storage.validate_and_store(files)

    try:
        seq = db.scalar(select(complaint_number_seq.next_value()))
        c = Complaint(complaint_number=f'CMP-{datetime.now(timezone.utc).year}-{seq:04d}', requester_id=requester.id,
                      building_id=building.id, room_id=room.id if room else None, location_details=details,
                      hostel_id=hostel.id if hostel else None, department_id=cat.department_id,
                      category_id=cat.id, title=title, description=description)
        db.add(c)
        db.flush()
        record_status(db, c, None, S.SUBMITTED, requester.id)
        for f in stored:
            db.add(ComplaintAttachment(complaint_id=c.id, original_filename=f.original_filename, storage_key=f.storage_key,
                                       mime_type=f.mime_type, size_bytes=f.size_bytes, uploaded_by_id=requester.id))
        # Routing. A hostel request goes to the hostel's warden (oversight) and to its caretakers, who are told by popup
        # and email and accept or reject it. Elsewhere, the supervisors of the responsible department are told.
        wardens, caretakers, supervisors = [], [], []
        if hostel is not None:
            wardens = users_with_role(db, 'WARDEN', hostel_id=hostel.id)
            caretakers = users_with_role(db, 'CARETAKER', hostel_id=hostel.id)
        if wardens:
            db.add(ComplaintAssignment(complaint_id=c.id, assigned_to_id=wardens[0].id, assigned_by_id=None,
                                       assignment_type=AssignmentType.WARDEN, remarks='Routed automatically to hostel warden'))
        for ct in caretakers:
            db.add(ComplaintAssignment(complaint_id=c.id, assigned_to_id=ct.id, assigned_by_id=None,
                                       assignment_type=AssignmentType.CARETAKER,
                                       remarks='Routed automatically to hostel caretaker; awaiting acceptance'))
        if not caretakers and c.department_id is not None:
            supervisors = users_with_role(db, 'SUPERVISOR', department_id=c.department_id)
        place = hostel.name if hostel is not None else building.name
        summary = f'{c.complaint_number}: "{title}" ({cat.name}) at {place}.'
        emails = notify(db, caretakers or supervisors, 'COMPLAINT_RAISED', f'New complaint {c.complaint_number}',
                        f'A new complaint was raised and needs you to accept or reject it. {summary}', complaint=c, email=True)
        notify(db, wardens, 'COMPLAINT_RAISED', f'New complaint {c.complaint_number} in {place}', summary, complaint=c)

        # Recurring issue: the same problem reported again and again alerts the hostel's wardens
        repeats = recurring.similar_to(db, c)
        settings = get_settings()
        if len(repeats) + 1 >= settings.recurring_threshold and recurring.should_alert(c):
            watchers = wardens or (users_with_role(db, 'SUPERVISOR', department_id=c.department_id) if c.department_id else [])
            emails += notify(db, watchers, 'RECURRING_ISSUE', f'Recurring issue: {cat.name} at {place}',
                             f'{len(repeats) + 1} similar complaints in the last {settings.recurring_window_days} days, '
                             f'latest {summary}', complaint=c, email=True)
        audit(db, request, requester.id, 'COMPLAINT_CREATED', 'complaint', c.complaint_number,
              new_value={'title': title, 'category': cat.name, 'buildingId': building.id, 'roomId': c.room_id,
                         'hostelId': c.hostel_id, 'departmentId': c.department_id, 'attachments': len(stored),
                         'routedTo': [str(u.id) for u in wardens[:1] + caretakers], 'similar': len(repeats)})
        db.commit()
    except Exception:
        db.rollback()
        for f in stored:
            storage.delete(f.storage_key)
        raise
    background.add_task(mailer.send_many, emails)
    return Envelope(data=detail(db, c, current), message=f'Complaint {c.complaint_number} submitted successfully')


@router.get('/complaints', response_model=PageOf[ComplaintSummary])
def list_visible(search: str | None = Query(None, max_length=100), status_: S | None = Query(None, alias='status'),
                 priority: Priority | None = None, building_id: int | None = Query(None, alias='buildingId'),
                 department_id: int | None = Query(None, alias='departmentId'),
                 state: Literal['open', 'completed'] | None = None, page: int = Query(1, ge=1),
                 limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db),
                 current: CurrentUser = Depends(require_permission(*VIEW_PERMISSIONS))):
    """Every request the signed-in user may see: their own, their hostel's, their department's or those assigned to them."""
    stmt = select(Complaint).join(Category)
    scope = visible_complaints_clause(current)
    if scope is not None:
        stmt = stmt.where(scope)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(Complaint.complaint_number.ilike(like), Complaint.title.ilike(like), Category.name.ilike(like)))
    if status_:
        stmt = stmt.where(Complaint.status == status_)
    if priority:
        stmt = stmt.where(Complaint.priority == priority)
    if building_id:
        stmt = stmt.where(Complaint.building_id == building_id)
    if department_id:
        stmt = stmt.where(Complaint.department_id == department_id)
    if state:
        stmt = stmt.where(Complaint.status.in_(OPEN if state == 'open' else RESOLVED_SET))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    order = Complaint.updated_at.desc() if state == 'completed' else Complaint.created_at.desc()
    rows = db.scalars(stmt.order_by(order).offset((page - 1) * limit).limit(limit)).unique().all()
    return PageOf(data=[complaint_summary(c) for c in rows],
                  pagination=Pagination(page=page, limit=limit, total=total, total_pages=max(1, -(-total // limit))))


@router.get('/complaints/{complaint_id}', response_model=Envelope[ComplaintDetail])
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    c = get_visible(db, current, complaint_id)
    return Envelope(data=complaint_detail(c, current, recurring.similar_to(db, c) if sees_internal(current) else None))


@router.post('/complaints/{complaint_id}/comments', response_model=Envelope[ComplaintDetail], status_code=201)
def add_comment(complaint_id: uuid.UUID, body: CommentIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('COMPLAINT_COMMENT'))):
    c = get_visible(db, current, complaint_id)
    if body.visibility == CommentVisibility.INTERNAL and not sees_internal(current):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot add internal remarks')
    if c.status in (S.CLOSED, S.REJECTED, S.DUPLICATE) and not current.has('COMPLAINT_VIEW_ALL'):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='This complaint is closed')
    db.add(ComplaintComment(complaint_id=c.id, author_id=current.id, comment=body.comment, visibility=body.visibility))
    audit(db, request, current.id, 'COMPLAINT_COMMENT', 'complaint', c.complaint_number, new_value={'visibility': body.visibility.value})
    db.commit()
    return Envelope(data=detail(db, c, current), message='Comment added')


@router.post('/complaints/{complaint_id}/attachments', response_model=Envelope[ComplaintDetail], status_code=201)
def add_attachments(complaint_id: uuid.UUID, request: Request, files: list[UploadFile] = File(...), db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('COMPLAINT_ATTACHMENT_UPLOAD'))):
    c = get_visible(db, current, complaint_id)
    if current.has('COMPLAINT_VIEW_OWN') and not current.has('COMPLAINT_VIEW_ALL') and not is_owner(current, c):
        raise not_found()
    if c.status in (S.CLOSED, S.REJECTED, S.DUPLICATE):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='This complaint is closed')
    stored = storage.validate_and_store(files, existing_count=len(c.attachments))
    for f in stored:
        db.add(ComplaintAttachment(complaint_id=c.id, original_filename=f.original_filename, storage_key=f.storage_key,
                                   mime_type=f.mime_type, size_bytes=f.size_bytes, uploaded_by_id=current.id))
    audit(db, request, current.id, 'COMPLAINT_ATTACHMENT_ADDED', 'complaint', c.complaint_number, new_value={'count': len(stored)})
    db.commit()
    return Envelope(data=detail(db, c, current), message='Attachment uploaded')


@router.get('/complaints/{complaint_id}/attachments/{attachment_id}')
def download_attachment(complaint_id: uuid.UUID, attachment_id: uuid.UUID, db: Session = Depends(get_db),
                        current: CurrentUser = Depends(get_current_user)):
    c = get_visible(db, current, complaint_id)
    a = db.get(ComplaintAttachment, attachment_id)
    if a is None or a.complaint_id != c.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='File not found')
    # Served as a download with the detected type; never rendered inline from our origin
    return FileResponse(storage.open_path(a.storage_key), media_type=a.mime_type, filename=a.original_filename,
                        content_disposition_type='attachment')


@router.post('/complaints/{complaint_id}/reopen', response_model=Envelope[ComplaintDetail])
def reopen(complaint_id: uuid.UUID, body: ReopenIn, request: Request, db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_permission('COMPLAINT_REOPEN_OWN'))):
    c = get_visible(db, current, complaint_id)
    if not is_owner(current, c):
        raise not_found()
    if c.status != S.RESOLVED:
        raise HTTPException(status.HTTP_409_CONFLICT, detail='Only a resolved complaint can be reopened')
    check_transition(c.status, S.REOPENED)
    old = c.status
    apply_status(c, S.REOPENED)
    record_status(db, c, old, S.REOPENED, current.id, body.reason)
    audit(db, request, current.id, 'COMPLAINT_REOPENED', 'complaint', c.complaint_number,
          old_value={'status': old.value}, new_value={'status': 'REOPENED', 'reason': body.reason})
    db.commit()
    return Envelope(data=detail(db, c, current), message='Complaint reopened')


# ------------------------------------------------------------------ accept / reject and work progress (staff)

def _decidable(db: Session, current: CurrentUser, complaint_id: uuid.UUID) -> Complaint:
    c = get_visible(db, current, complaint_id)
    if c.status not in DECIDABLE:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            detail=f'A request that is {label(c.status).lower()} can no longer be accepted or rejected')
    return c


def _announce_decision(db: Session, c: Complaint, current: CurrentUser) -> list[mailer.Email]:
    """Tell the requester (popup and email) and the administrators (popup) about an accept or reject decision."""
    who = current.user.full_name
    if c.decision == ComplaintDecision.ACCEPTED:
        title = f'Complaint {c.complaint_number} accepted'
        body = f'Your complaint "{c.title}" was accepted by {who} and work will be arranged.'
        admin_body = f'{who} accepted {c.complaint_number}: "{c.title}".'
    else:
        title = f'Complaint {c.complaint_number} rejected'
        body = f'Your complaint "{c.title}" was rejected by {who}. Reason: {c.decision_reason}'
        admin_body = f'{who} rejected {c.complaint_number}: "{c.title}". Reason: {c.decision_reason}'
    kind = f'COMPLAINT_{c.decision.value}'
    emails = notify(db, [c.requester], kind, title, body, complaint=c, link='/student/complaints', email=True, exclude=[current.id])
    notify(db, admins(db), kind, title, admin_body, complaint=c, link='/admin/complaints', exclude=[current.id])
    return emails


@router.post('/complaints/{complaint_id}/accept', response_model=Envelope[ComplaintDetail])
def accept(complaint_id: uuid.UUID, body: AcceptIn, request: Request, background: BackgroundTasks, db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_permission('COMPLAINT_DECIDE'))):
    """Take the request on. A caretaker or technician who accepts becomes its worker; others accept it for review."""
    c = _decidable(db, current, complaint_id)
    now = datetime.now(timezone.utc)
    workers = (AssignmentType.CARETAKER, AssignmentType.TECHNICIAN)
    mine = [a for a in c.active_assignments if a.assigned_to_id == current.id and a.assignment_type in workers]
    if mine:
        # Other caretakers who were offered the same request are released
        for a in c.active_assignments:
            if a.assignment_type == mine[0].assignment_type and a.assigned_to_id != current.id:
                a.is_active, a.unassigned_at = False, now
        mine[0].remarks = 'Accepted'
    has_worker = bool(mine) or (c.status != S.SUBMITTED and any(
        a.assignment_type in workers + (AssignmentType.AUTHORITY,) for a in c.active_assignments))
    target = S.ASSIGNED if has_worker else S.UNDER_REVIEW
    old = c.status
    if target != old:
        check_transition(old, target)
        apply_status(c, target)
        record_status(db, c, old, target, current.id, body.remarks or 'Accepted')
    c.decision, c.decision_reason, c.decided_by_id, c.decided_at = ComplaintDecision.ACCEPTED, body.remarks, current.id, now
    db.flush()
    db.refresh(c)
    emails = _announce_decision(db, c, current)
    audit(db, request, current.id, 'COMPLAINT_ACCEPTED', 'complaint', c.complaint_number,
          old_value={'status': old.value}, new_value={'status': c.status.value, 'remarks': body.remarks})
    db.commit()
    background.add_task(mailer.send_many, emails)
    return Envelope(data=detail(db, c, current), message=f'Complaint {c.complaint_number} accepted')


@router.post('/complaints/{complaint_id}/reject', response_model=Envelope[ComplaintDetail])
def reject(complaint_id: uuid.UUID, body: RejectIn, request: Request, background: BackgroundTasks, db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_permission('COMPLAINT_DECIDE'))):
    """Turn the request down with a reason the requester will see. It is closed as rejected."""
    c = _decidable(db, current, complaint_id)
    now = datetime.now(timezone.utc)
    old = c.status
    check_transition(old, S.REJECTED)
    apply_status(c, S.REJECTED)
    record_status(db, c, old, S.REJECTED, current.id, body.reason)
    for a in c.active_assignments:
        a.is_active, a.unassigned_at = False, now
    c.decision, c.decision_reason, c.decided_by_id, c.decided_at = ComplaintDecision.REJECTED, body.reason, current.id, now
    db.flush()
    db.refresh(c)
    emails = _announce_decision(db, c, current)
    audit(db, request, current.id, 'COMPLAINT_REJECTED', 'complaint', c.complaint_number,
          old_value={'status': old.value}, new_value={'status': 'REJECTED', 'reason': body.reason})
    db.commit()
    background.add_task(mailer.send_many, emails)
    return Envelope(data=detail(db, c, current), message=f'Complaint {c.complaint_number} rejected')


@router.post('/complaints/{complaint_id}/status', response_model=Envelope[ComplaintDetail])
def update_status(complaint_id: uuid.UUID, body: StaffStatusIn, request: Request, background: BackgroundTasks,
                  db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('COMPLAINT_UPDATE_STATUS'))):
    """Progress work on a request within the user's scope: start, pause for information or materials, resolve, escalate."""
    c = get_visible(db, current, complaint_id)
    if body.status not in STAFF_SETTABLE:
        raise HTTPException(422, detail=[{'field': 'status', 'message': 'Use accept, reject or assign for this change.'}])
    if body.status == S.ESCALATED and not current.has('COMPLAINT_ESCALATE'):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You cannot escalate requests')
    if c.status in DECIDABLE and c.decision is None and current.has('COMPLAINT_DECIDE'):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='Accept or reject this request first')
    old = c.status
    check_transition(old, body.status)
    apply_status(c, body.status)
    record_status(db, c, old, body.status, current.id, body.remarks)
    note = f' Note: {body.remarks}' if body.remarks else ''
    emails = notify(db, [c.requester], 'STATUS_CHANGED', f'Complaint {c.complaint_number}: {label(body.status)}',
                    f'Your complaint "{c.title}" is now {label(body.status).lower()}.{note}',
                    complaint=c, link='/student/complaints', email=body.status == S.RESOLVED, exclude=[current.id])
    audit(db, request, current.id, 'COMPLAINT_STATUS_CHANGED', 'complaint', c.complaint_number,
          old_value={'status': old.value}, new_value={'status': body.status.value, 'remarks': body.remarks})
    db.commit()
    background.add_task(mailer.send_many, emails)
    return Envelope(data=detail(db, c, current), message=f'Status changed to {label(body.status)}')

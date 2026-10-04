import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, get_current_user, require_permission
from app.authorization.scope import can_view, is_owner, not_found, sees_internal
from app.db import get_db
from app.models import (AssignmentType, Category, CommentVisibility, Complaint, ComplaintAssignment, ComplaintAttachment,
                        ComplaintComment, ComplaintStatus as S, ComplaintStatusHistory, Role, User, UserStatus,
                        complaint_number_seq, user_roles)
from app.schemas import CategoryOut, CommentIn, ComplaintDetail, Envelope, ReopenIn
from app.serializers import complaint_detail
from app.services import storage
from app.services.audit import audit
from app.services.workflow import apply_status, check_transition

router = APIRouter(prefix='/api/v1', tags=['complaints'])

TITLE_MIN, TITLE_MAX, DESCRIPTION_MAX_WORDS = 5, 150, 200


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
    return complaint_detail(c, current)


@router.get('/categories', response_model=Envelope[list[CategoryOut]])
def categories(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('CATEGORY_VIEW'))):
    return Envelope(data=db.scalars(select(Category).where(Category.is_active.is_(True)).order_by(Category.name)).all())


@router.post('/complaints', response_model=Envelope[ComplaintDetail], status_code=201)
def create_complaint(request: Request, category: str = Form(..., max_length=60), title: str = Form(...),
                     description: str = Form(''), files: list[UploadFile] = File(default=[]), db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission('COMPLAINT_CREATE'))):
    """Multipart form: category (name or id), title, optional description (max 200 words), optional files."""
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
    if errors:
        raise HTTPException(422, detail=errors)

    student = current.user
    if student.hostel_id is None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail='Your account has no hostel allocation yet. Please contact the hostel office.')
    stored = storage.validate_and_store(files)

    try:
        seq = db.scalar(select(complaint_number_seq.next_value()))
        c = Complaint(complaint_number=f'CMP-{datetime.now(timezone.utc).year}-{seq:04d}', student_id=student.id,
                      hostel_id=student.hostel_id, category_id=cat.id, title=title, description=description)
        db.add(c)
        db.flush()
        record_status(db, c, None, S.SUBMITTED, student.id)
        for f in stored:
            db.add(ComplaintAttachment(complaint_id=c.id, original_filename=f.original_filename, storage_key=f.storage_key,
                                       mime_type=f.mime_type, size_bytes=f.size_bytes, uploaded_by_id=student.id))
        # Initial routing: the complaint goes to the active warden of the student's hostel, if one is set up
        warden = db.scalar(select(User).join(user_roles).join(Role)
                           .where(Role.name == 'WARDEN', User.hostel_id == student.hostel_id, User.status == UserStatus.ACTIVE)
                           .order_by(User.created_at).limit(1))
        if warden:
            db.add(ComplaintAssignment(complaint_id=c.id, assigned_to_id=warden.id, assigned_by_id=None,
                                       assignment_type=AssignmentType.WARDEN, remarks='Routed automatically to hostel warden'))
        audit(db, request, student.id, 'COMPLAINT_CREATED', 'complaint', c.complaint_number,
              new_value={'title': title, 'category': cat.name, 'hostelId': student.hostel_id, 'attachments': len(stored),
                         'routedTo': str(warden.id) if warden else None})
        db.commit()
    except Exception:
        db.rollback()
        for f in stored:
            storage.delete(f.storage_key)
        raise
    return Envelope(data=detail(db, c, current), message=f'Complaint {c.complaint_number} submitted successfully')


@router.get('/complaints/{complaint_id}', response_model=Envelope[ComplaintDetail])
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    return Envelope(data=complaint_detail(get_visible(db, current, complaint_id), current))


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

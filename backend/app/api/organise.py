"""Labels, linked tickets and sub-tasks: the Jira-style ways staff organise tickets.

Who may change them: holders of COMPLAINT_ORGANISE (warden, supervisor, department head, admin), on tickets in their scope.
Whoever a sub-task is assigned to may also move it between To do, In progress and Done.
Tickets outside the user's scope answer 404, as everywhere else.
"""
import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, get_current_user, load_principal, require_permission
from app.authorization.scope import can_view, not_found
from app.db import get_db
from app.models import Complaint, ComplaintLink, Label, LinkType, Subtask, SubtaskStatus, User, UserStatus
from app.schemas import (LABEL_COLORS, ComplaintDetail, Envelope, LabelIn, LabelOut, LinkIn, SubtaskIn, SubtaskPatch, UserBrief)
from app.serializers import can_organise, can_update_subtask, user_brief
from app.services.audit import audit
from app.services.notifications import notify

from app.api.complaints import detail, get_visible

router = APIRouter(prefix='/api/v1', tags=['organise'])

MAX_LABELS_PER_TICKET = 10
MAX_SUBTASKS_PER_TICKET = 30
REQUESTER_ROLES = {'STUDENT', 'FACULTY', 'STAFF'}


def _organisable(db: Session, current: CurrentUser, complaint_id: uuid.UUID) -> Complaint:
    c = get_visible(db, current, complaint_id)
    if not can_organise(current, c):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You do not have permission to perform this action')
    return c


def _field_error(field: str, message: str, code: int = status.HTTP_422_UNPROCESSABLE_ENTITY) -> HTTPException:
    return HTTPException(code, detail=[{'field': field, 'message': message}])


def _default_color(name: str) -> str:
    # The same name always gets the same colour, so labels look stable without anyone choosing
    return LABEL_COLORS[int(hashlib.sha1(name.encode()).hexdigest(), 16) % len(LABEL_COLORS)]


def _touch(c: Complaint) -> None:
    c.updated_at = datetime.now(timezone.utc)


# ------------------------------------------------------------------------------------------------ labels
@router.get('/labels', response_model=Envelope[list[LabelOut]])
def list_labels(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('COMPLAINT_ORGANISE',
                                                                                             'COMPLAINT_VIEW_ALL'))):
    return Envelope(data=db.scalars(select(Label).order_by(Label.name)).all())


def _get_or_create_label(db: Session, current: CurrentUser, body: LabelIn, request: Request) -> Label:
    label = db.scalar(select(Label).where(Label.name == body.name))
    if label is None:
        label = Label(name=body.name, color=body.color or _default_color(body.name), created_by_id=current.id)
        db.add(label)
        db.flush()
        audit(db, request, current.id, 'LABEL_CREATE', 'label', label.id, new_value={'name': label.name, 'color': label.color})
    return label


@router.post('/labels', response_model=Envelope[LabelOut], status_code=201)
def create_label(body: LabelIn, request: Request, db: Session = Depends(get_db),
                 current: CurrentUser = Depends(require_permission('COMPLAINT_ORGANISE'))):
    if db.scalar(select(Label).where(Label.name == body.name)):
        raise _field_error('name', 'A label with this name already exists', status.HTTP_409_CONFLICT)
    label = _get_or_create_label(db, current, body, request)
    db.commit()
    return Envelope(data=LabelOut.model_validate(label), message='Label created')


@router.post('/complaints/{complaint_id}/labels', response_model=Envelope[ComplaintDetail])
def add_label(complaint_id: uuid.UUID, body: LabelIn, request: Request, db: Session = Depends(get_db),
              current: CurrentUser = Depends(get_current_user)):
    """Put a label on a ticket. A new name creates the label."""
    c = _organisable(db, current, complaint_id)
    label = _get_or_create_label(db, current, body, request)
    if label not in c.labels:
        if len(c.labels) >= MAX_LABELS_PER_TICKET:
            raise _field_error('name', f'A ticket can have at most {MAX_LABELS_PER_TICKET} labels')
        c.labels.append(label)
        _touch(c)
        audit(db, request, current.id, 'COMPLAINT_LABEL_ADD', 'complaint', c.id, new_value={'label': label.name})
    db.commit()
    return Envelope(data=detail(db, c, current), message=f'Label "{label.name}" added')


@router.delete('/complaints/{complaint_id}/labels/{label_id}', response_model=Envelope[ComplaintDetail])
def remove_label(complaint_id: uuid.UUID, label_id: int, request: Request, db: Session = Depends(get_db),
                 current: CurrentUser = Depends(get_current_user)):
    c = _organisable(db, current, complaint_id)
    label = next((x for x in c.labels if x.id == label_id), None)
    if label is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='This label is not on the ticket')
    c.labels.remove(label)
    _touch(c)
    audit(db, request, current.id, 'COMPLAINT_LABEL_REMOVE', 'complaint', c.id, old_value={'label': label.name})
    db.commit()
    return Envelope(data=detail(db, c, current), message=f'Label "{label.name}" removed')


# ------------------------------------------------------------------------------------------------ links
def _blocks_path(db: Session, start: uuid.UUID, goal: uuid.UUID) -> bool:
    """True if `start` already blocks `goal`, directly or through other tickets."""
    seen, frontier = {start}, [start]
    while frontier:
        nxt = db.scalars(select(ComplaintLink.target_id).where(ComplaintLink.source_id.in_(frontier),
                                                               ComplaintLink.link_type == LinkType.BLOCKS)).all()
        if goal in nxt:
            return True
        frontier = [t for t in nxt if t not in seen]
        seen.update(frontier)
    return False


@router.post('/complaints/{complaint_id}/links', response_model=Envelope[ComplaintDetail], status_code=201)
def add_link(complaint_id: uuid.UUID, body: LinkIn, request: Request, db: Session = Depends(get_db),
             current: CurrentUser = Depends(get_current_user)):
    c = _organisable(db, current, complaint_id)
    other = db.scalar(select(Complaint).where(func.upper(Complaint.complaint_number) == body.target_key.strip().upper()))
    if other is None or not can_view(current, other):
        raise _field_error('targetKey', 'No ticket with this key that you can see', status.HTTP_404_NOT_FOUND)
    if other.id == c.id:
        raise _field_error('targetKey', 'A ticket cannot be linked to itself')

    # Reverse wordings are stored as the forward link from the other ticket, so both tickets read correctly
    reverse = body.link_type in ('IS_BLOCKED_BY', 'IS_DUPLICATED_BY')
    link_type = LinkType({'IS_BLOCKED_BY': 'BLOCKS', 'IS_DUPLICATED_BY': 'DUPLICATES'}.get(body.link_type, body.link_type))
    source, target = (other, c) if reverse else (c, other)

    def linked(a: Complaint, b: Complaint) -> bool:
        return db.scalar(select(ComplaintLink.id).where(ComplaintLink.link_type == link_type, ComplaintLink.source_id == a.id,
                                                        ComplaintLink.target_id == b.id)) is not None

    if linked(source, target) or (link_type == LinkType.RELATES_TO and linked(target, source)):
        raise _field_error('targetKey', 'These tickets are already linked this way', status.HTTP_409_CONFLICT)
    if link_type == LinkType.DUPLICATES and linked(target, source):
        raise _field_error('linkType', f'{target.complaint_number} is already marked as a duplicate of {source.complaint_number}')
    if link_type == LinkType.BLOCKS and _blocks_path(db, target.id, source.id):
        raise _field_error('linkType', f'{target.complaint_number} already blocks {source.complaint_number}, '
                                       'so this would make a loop')

    link = ComplaintLink(source_id=source.id, target_id=target.id, link_type=link_type, created_by_id=current.id)
    db.add(link)
    _touch(c)
    _touch(other)
    db.flush()
    audit(db, request, current.id, 'COMPLAINT_LINK_ADD', 'complaint', c.id,
          new_value={'source': source.complaint_number, 'type': link_type.value, 'target': target.complaint_number})
    db.commit()
    db.refresh(other)
    return Envelope(data=detail(db, c, current), message=f'Linked to {other.complaint_number}')


@router.delete('/complaints/{complaint_id}/links/{link_id}', response_model=Envelope[ComplaintDetail])
def remove_link(complaint_id: uuid.UUID, link_id: int, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(get_current_user)):
    c = _organisable(db, current, complaint_id)
    link = db.get(ComplaintLink, link_id)
    if link is None or c.id not in (link.source_id, link.target_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Link not found')
    other = link.target if link.source_id == c.id else link.source
    if not can_view(current, other):  # links to hidden tickets are not shown, so they cannot be removed either
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Link not found')
    old = {'source': link.source.complaint_number, 'type': link.link_type.value, 'target': link.target.complaint_number}
    db.delete(link)
    _touch(c)
    _touch(other)
    audit(db, request, current.id, 'COMPLAINT_LINK_REMOVE', 'complaint', c.id, old_value=old)
    db.commit()
    db.expire(other)
    return Envelope(data=detail(db, c, current), message='Link removed')


# ------------------------------------------------------------------------------------------------ sub-tasks
def _assignee(db: Session, c: Complaint, user_id: uuid.UUID) -> User:
    """Sub-tasks go to staff who can already open the ticket, so the notification leads somewhere they can see."""
    u = db.get(User, user_id)
    if (u is None or u.status != UserStatus.ACTIVE or not (set(u.role_names) - REQUESTER_ROLES)
            or not can_view(load_principal(u), c)):
        raise _field_error('assigneeId', 'Choose a staff member who can see this ticket')
    return u


def _announce_subtask(db: Session, c: Complaint, s: Subtask, assignee: User, current: CurrentUser) -> None:
    notify(db, [assignee], 'SUBTASK_ASSIGNED', f'Sub-task for {c.complaint_number}: {s.title}',
           f'{current.user.full_name} assigned you a sub-task on {c.complaint_number} ({c.title}): "{s.title}".',
           complaint=c, link=f'/tickets/{c.complaint_number}', exclude=[current.id])


@router.get('/complaints/{complaint_id}/subtask-assignees', response_model=Envelope[list[UserBrief]])
def subtask_assignees(complaint_id: uuid.UUID, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    """Staff who can see this ticket, for the sub-task assignee picker."""
    c = _organisable(db, current, complaint_id)
    users = db.scalars(select(User).where(User.status == UserStatus.ACTIVE).order_by(User.first_name, User.last_name)).all()
    picked = [u for u in users if (set(u.role_names) - REQUESTER_ROLES) and can_view(load_principal(u), c)]
    return Envelope(data=[user_brief(u) for u in picked])


@router.post('/complaints/{complaint_id}/subtasks', response_model=Envelope[ComplaintDetail], status_code=201)
def add_subtask(complaint_id: uuid.UUID, body: SubtaskIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(get_current_user)):
    c = _organisable(db, current, complaint_id)
    if len(c.subtasks) >= MAX_SUBTASKS_PER_TICKET:
        raise _field_error('title', f'A ticket can have at most {MAX_SUBTASKS_PER_TICKET} sub-tasks')
    assignee = _assignee(db, c, body.assignee_id) if body.assignee_id else None
    s = Subtask(complaint_id=c.id, title=body.title, assignee_id=assignee.id if assignee else None,
                position=max((x.position for x in c.subtasks), default=-1) + 1, created_by_id=current.id)
    c.subtasks.append(s)
    _touch(c)
    db.flush()
    audit(db, request, current.id, 'SUBTASK_CREATE', 'complaint', c.id,
          new_value={'subtask': s.id, 'title': s.title, 'assignee': assignee.login_id if assignee else None})
    if assignee:
        _announce_subtask(db, c, s, assignee, current)
    db.commit()
    return Envelope(data=detail(db, c, current), message='Sub-task added')


def _subtask(db: Session, current: CurrentUser, subtask_id: int) -> tuple[Subtask, Complaint]:
    s = db.get(Subtask, subtask_id)
    c = db.get(Complaint, s.complaint_id) if s else None
    if s is None or c is None or not can_view(current, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Sub-task not found')
    return s, c


@router.patch('/subtasks/{subtask_id}', response_model=Envelope[ComplaintDetail])
def update_subtask(subtask_id: int, body: SubtaskPatch, request: Request, db: Session = Depends(get_db),
                   current: CurrentUser = Depends(get_current_user)):
    s, c = _subtask(db, current, subtask_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise _field_error('status', 'Nothing to change')
    organiser = can_organise(current, c)
    if not organiser and not (can_update_subtask(current, c, s) and set(changes) == {'status'}):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='Only the status of a sub-task assigned to you can be changed')

    old = {'title': s.title, 'status': s.status.value, 'assignee': str(s.assignee_id) if s.assignee_id else None}
    new_assignee = None
    if 'title' in changes:
        if body.title is None:
            raise _field_error('title', 'Title cannot be empty')
        s.title = body.title
    if 'status' in changes:
        if body.status is None:
            raise _field_error('status', 'Choose a status')
        s.status = body.status
        s.completed_at = datetime.now(timezone.utc) if body.status == SubtaskStatus.DONE else None
    if 'assignee_id' in changes and body.assignee_id != s.assignee_id:
        new_assignee = _assignee(db, c, body.assignee_id) if body.assignee_id else None
        s.assignee_id = new_assignee.id if new_assignee else None
    if 'position' in changes and body.position is not None:
        s.position = body.position
    _touch(c)
    audit(db, request, current.id, 'SUBTASK_UPDATE', 'complaint', c.id, old_value={'subtask': s.id, **old},
          new_value={'subtask': s.id, 'title': s.title, 'status': s.status.value,
                     'assignee': str(s.assignee_id) if s.assignee_id else None})
    if new_assignee:
        _announce_subtask(db, c, s, new_assignee, current)
    db.commit()
    return Envelope(data=detail(db, c, current), message='Sub-task updated')


@router.delete('/subtasks/{subtask_id}', response_model=Envelope[ComplaintDetail])
def delete_subtask(subtask_id: int, request: Request, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    s, c = _subtask(db, current, subtask_id)
    if not can_organise(current, c):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You do not have permission to perform this action')
    audit(db, request, current.id, 'SUBTASK_DELETE', 'complaint', c.id, old_value={'subtask': s.id, 'title': s.title})
    c.subtasks.remove(s)
    _touch(c)
    db.commit()
    return Envelope(data=detail(db, c, current), message='Sub-task removed')

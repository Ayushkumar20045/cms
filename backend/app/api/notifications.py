"""The signed-in user's own notifications (bell and popups). Nobody can read or change another user's."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.authorization.deps import CurrentUser, get_current_user
from app.db import get_db
from app.models import Notification
from app.schemas import Envelope, NotificationList, NotificationOut

router = APIRouter(prefix='/api/v1/notifications', tags=['notifications'])


def _out(n: Notification) -> NotificationOut:
    return NotificationOut(id=n.id, kind=n.kind, title=n.title, body=n.body, link=n.link, complaint_id=n.complaint_id,
                           read=n.read_at is not None, created_at=n.created_at)


def _unread(db: Session, user_id) -> int:
    return db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.read_at.is_(None)))


@router.get('', response_model=Envelope[NotificationList])
def list_mine(limit: int = Query(15, ge=1, le=50), unread_only: bool = Query(False, alias='unreadOnly'),
              db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    stmt = select(Notification).where(Notification.user_id == current.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    rows = db.scalars(stmt.order_by(Notification.id.desc()).limit(limit)).all()
    return Envelope(data=NotificationList(items=[_out(n) for n in rows], unread=_unread(db, current.id)))


@router.post('/{notification_id}/read', response_model=Envelope[NotificationList])
def mark_read(notification_id: int, db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Notification not found')
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        db.commit()
    return Envelope(data=NotificationList(items=[_out(n)], unread=_unread(db, current.id)))


@router.post('/read-all', response_model=Envelope[NotificationList])
def mark_all_read(db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    db.execute(update(Notification).where(Notification.user_id == current.id, Notification.read_at.is_(None))
               .values(read_at=datetime.now(timezone.utc)))
    db.commit()
    return Envelope(data=NotificationList(items=[], unread=0))

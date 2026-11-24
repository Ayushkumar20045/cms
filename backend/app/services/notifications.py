"""In-app notifications plus optional email copies.

`notify` adds notification rows to the current transaction and returns the emails to send; the caller schedules
those with `mailer.send_many` once the transaction has committed.
"""
from collections.abc import Iterable

from sqlalchemy import and_, exists, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Complaint, Notification, Role, User, UserStatus, user_roles
from app.services.mailer import Email


# Where each role works on requests in the frontend; used as the link of a notification
_ROLE_PAGES = [('ADMIN', '/admin/complaints'), ('SUPER_ADMIN', '/admin/complaints'), ('WARDEN', '/staff/warden/dashboard'),
               ('CARETAKER', '/staff/caretaker/assignments'), ('SUPERVISOR', '/staff/supervisor/dashboard'),
               ('DEPARTMENT_HEAD', '/staff/department-head/dashboard'), ('TECHNICIAN', '/staff/technician/dashboard'),
               ('AUTHORITY', '/staff/authority/dashboard'), ('STORE_MANAGER', '/staff/store/dashboard')]


def work_page(u: User) -> str:
    roles = u.role_names
    return next((page for role, page in _ROLE_PAGES if role in roles), '/student/complaints')


def notify(db: Session, users: Iterable[User], kind: str, title: str, body: str, complaint: Complaint | None = None,
           link: str | None = None, email: bool = False, exclude: Iterable = ()) -> list[Email]:
    """Notify each active user once. Returns the emails to send for users who have an address."""
    skip = set(exclude)
    seen, emails = set(), []
    base = get_settings().app_base_url.rstrip('/')
    for u in users:
        if u is None or u.id in seen or u.id in skip or u.status != UserStatus.ACTIVE:
            continue
        seen.add(u.id)
        send = email and bool(u.email)
        target = link or work_page(u)
        db.add(Notification(user_id=u.id, kind=kind, title=title[:160], body=body, complaint_id=complaint.id if complaint else None,
                            link=target, emailed=send))
        if send:
            emails.append(Email(to=u.email, subject=f'[GBU CMS] {title}'[:200],
                                text=f'Hello {u.first_name},\n\n{body}\n\nOpen the portal: {base}{target}\n\n'
                                     'This is an automated message from the GBU Complaint Management System.'))
    return emails


def users_with_role(db: Session, role: str, **filters) -> list[User]:
    stmt = select(User).where(User.status == UserStatus.ACTIVE, exists().where(and_(
        user_roles.c.user_id == User.id, user_roles.c.role_id == Role.id, Role.name == role)))
    for column, value in filters.items():
        stmt = stmt.where(getattr(User, column) == value)
    return list(db.scalars(stmt.order_by(User.created_at)).unique())


def admins(db: Session) -> list[User]:
    return users_with_role(db, 'ADMIN') + users_with_role(db, 'SUPER_ADMIN')

"""Idempotent seed: permission catalogue, roles, starter hostels and categories, and development accounts.

Run with `python -m app.seed`. Existing rows are updated in place; existing users are never overwritten.
Hostels are starter examples (names from the frontend) to be replaced with GBU's real hostel list.
"""
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.authorization.catalog import ALL_PERMISSIONS, PERMISSION_MODULE, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS
from app.core.security import hash_password
from app.db import SessionLocal
from app.models import Category, Hostel, Permission, Role, User

HOSTELS = [('GBH', 'Gautam Buddha Hostel'), ('ASH', 'Ashoka Hostel'), ('AMB', 'Ambedkar Hostel')]
# The categories offered on the Raise Complaint form
CATEGORIES = ['Maintenance', 'Ethernet', 'Electrical', 'Civil', 'Cleanliness']


def _upsert(db: Session, model, key: str, value, **fields):
    row = db.scalar(select(model).where(getattr(model, key) == value))
    if row is None:
        row = model(**{key: value}, **fields)
        db.add(row)
    else:
        for k, v in fields.items():
            setattr(row, k, v)
    db.flush()
    return row


def seed_rbac(db: Session) -> None:
    perms = {}
    for name in ALL_PERMISSIONS:
        module = PERMISSION_MODULE[name]
        perms[name] = _upsert(db, Permission, 'name', name, module=module,
                              action=name[len(module) + 1:] if name.startswith(module + '_') else name,
                              description=name.replace('_', ' ').capitalize())
    for role, names in ROLE_PERMISSIONS.items():
        r = _upsert(db, Role, 'name', role, description=ROLE_DESCRIPTIONS[role])
        r.permissions = [perms[n] for n in names]
    db.flush()


def seed_reference(db: Session) -> None:
    for code, name in HOSTELS:
        _upsert(db, Hostel, 'code', code, name=name)
    for name in CATEGORIES:
        if db.scalar(select(Category).where(Category.name == name)) is None:
            db.add(Category(name=name))
    db.flush()


def seed_user(db: Session, prefix: str, first: str, last: str, roles: list[str], hostel_code: str | None = None,
              room: str | None = None, block: str | None = None) -> None:
    login_id, password = os.environ.get(f'SEED_{prefix}_LOGIN_ID'), os.environ.get(f'SEED_{prefix}_PASSWORD')
    if not login_id or not password or password == 'change-me':
        print(f'skipping {prefix.lower()} account: SEED_{prefix}_LOGIN_ID / SEED_{prefix}_PASSWORD not set')
        return
    if db.scalar(select(User).where(User.login_id == login_id)):
        return
    hostel = db.scalar(select(Hostel).where(Hostel.code == hostel_code)) if hostel_code else None
    db.add(User(login_id=login_id, password_hash=hash_password(password), first_name=first, last_name=last,
                roles=list(db.scalars(select(Role).where(Role.name.in_(roles)))),
                hostel_id=hostel.id if hostel else None, room_number=room, block=block))
    print(f'created {prefix.lower()} account {login_id}')


def main() -> None:
    with SessionLocal() as db:
        seed_rbac(db)
        seed_reference(db)
        seed_user(db, 'SUPER_ADMIN', 'Super', 'Admin', ['SUPER_ADMIN'])
        seed_user(db, 'ADMIN', 'System', 'Administrator', ['ADMIN'])
        seed_user(db, 'STUDENT', 'Demo', 'Student', ['STUDENT'], 'GBH', 'B-204', 'Block B')
        seed_user(db, 'WARDEN', 'Demo', 'Warden', ['WARDEN'], 'GBH')
        seed_user(db, 'CARETAKER', 'Demo', 'Caretaker', ['CARETAKER'], 'GBH')
        db.commit()
    print('seed complete')


if __name__ == '__main__':
    main()

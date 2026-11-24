"""Idempotent seed: permission catalogue, roles, starter hostels, departments and categories, and development accounts.

Run with `python -m app.seed`. Existing rows are updated in place; existing users are never overwritten.
Hostels and departments are starter examples to be replaced with GBU's real lists. Other campus buildings are
not seeded: they come from the GBU campus GIS data or are added by an administrator.
"""
import os

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.authorization.catalog import ALL_PERMISSIONS, PERMISSION_MODULE, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS
from app.core.security import hash_password
from app.db import SessionLocal
from app.models import Building, BuildingType, Category, Complaint, Department, Hostel, Permission, Role, User

HOSTELS = [('GBH', 'Gautam Buddha Hostel'), ('ASH', 'Ashoka Hostel'), ('AMB', 'Ambedkar Hostel')]
DEPARTMENTS = [
    ('ELEC', 'Electrical Maintenance', 'Wiring, lights, fans, sockets and power supply'),
    ('CIVIL', 'Civil and Plumbing', 'Building repairs, water supply, drainage and plumbing'),
    ('IT', 'IT and Network Services', 'Campus network, Wi-Fi and Ethernet'),
    ('HK', 'Housekeeping and Sanitation', 'Cleaning, waste and pest control'),
    ('CARP', 'Carpentry and Furniture', 'Doors, windows and furniture'),
    ('HVAC', 'Air Conditioning', 'Air conditioners, coolers and ventilation'),
]
# The categories offered on the request form, and the department each one is routed to
CATEGORIES = [('Maintenance', 'CIVIL'), ('Ethernet', 'IT'), ('Electrical', 'ELEC'), ('Civil', 'CIVIL'), ('Cleanliness', 'HK'),
              ('Plumbing', 'CIVIL'), ('Furniture', 'CARP'), ('Air Conditioning', 'HVAC')]


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
        hostel = _upsert(db, Hostel, 'code', code, name=name)
        # Every hostel is a building on campus; create it if the hostel has none yet
        if hostel.building_id is None:
            building = db.scalar(select(Building).where(Building.code == code))
            if building is None:
                building = Building(code=code, name=name, building_type=BuildingType.HOSTEL)
                db.add(building)
                db.flush()
            hostel.building_id = building.id
    departments = {code: _upsert(db, Department, 'code', code, name=name, description=desc) for code, name, desc in DEPARTMENTS}
    for name, dept in CATEGORIES:
        cat = db.scalar(select(Category).where(Category.name == name))
        if cat is None:
            db.add(Category(name=name, department_id=departments[dept].id))
        elif cat.department_id is None:
            # Route existing categories, but never override a department an administrator has chosen
            cat.department_id = departments[dept].id
    db.flush()
    # Requests raised before departments existed are routed by their category, so department staff can see them
    db.execute(update(Complaint).where(Complaint.department_id.is_(None), Complaint.category_id == Category.id,
                                       Category.department_id.is_not(None))
               .values(department_id=Category.department_id))
    db.flush()


def seed_user(db: Session, prefix: str, first: str, last: str, roles: list[str], hostel_code: str | None = None,
              room: str | None = None, block: str | None = None, department_code: str | None = None) -> None:
    login_id, password = os.environ.get(f'SEED_{prefix}_LOGIN_ID'), os.environ.get(f'SEED_{prefix}_PASSWORD')
    if not login_id or not password or password == 'change-me':
        print(f'skipping {prefix.lower()} account: SEED_{prefix}_LOGIN_ID / SEED_{prefix}_PASSWORD not set')
        return
    demo_email = f'{login_id.lower()}@demo.gbu.local'
    existing = db.scalar(select(User).where(User.login_id == login_id))
    if existing is not None:
        # Development accounts created before emails existed get their demo address once
        if existing.email is None and not db.scalar(select(User.id).where(User.email == demo_email)):
            existing.email = demo_email
        return
    hostel = db.scalar(select(Hostel).where(Hostel.code == hostel_code)) if hostel_code else None
    department = db.scalar(select(Department).where(Department.code == department_code)) if department_code else None
    db.add(User(login_id=login_id, email=demo_email, password_hash=hash_password(password), first_name=first, last_name=last,
                roles=list(db.scalars(select(Role).where(Role.name.in_(roles)))),
                hostel_id=hostel.id if hostel else None, room_number=room, block=block,
                department_id=department.id if department else None))
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
        # Campus-wide roles; each is created only if its SEED_<ROLE>_LOGIN_ID / _PASSWORD are set in .env
        seed_user(db, 'FACULTY', 'Demo', 'Faculty', ['FACULTY'])
        seed_user(db, 'STAFF', 'Demo', 'Staff', ['STAFF'])
        seed_user(db, 'TECHNICIAN', 'Demo', 'Technician', ['TECHNICIAN'], department_code='ELEC')
        seed_user(db, 'SUPERVISOR', 'Demo', 'Supervisor', ['SUPERVISOR'], department_code='ELEC')
        seed_user(db, 'DEPARTMENT_HEAD', 'Demo', 'Department Head', ['DEPARTMENT_HEAD'], department_code='ELEC')
        seed_user(db, 'STORE_MANAGER', 'Demo', 'Store Manager', ['STORE_MANAGER'])
        db.commit()
    print('seed complete')


if __name__ == '__main__':
    main()

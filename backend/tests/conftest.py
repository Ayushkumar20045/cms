import os
import secrets

# Point the app at the test database and a separate Redis DB before anything imports the settings
os.environ['DATABASE_URL'] = os.environ['TEST_DATABASE_URL']
os.environ['REDIS_URL'] = os.environ['REDIS_URL'].rsplit('/', 1)[0] + '/1'
os.environ['UPLOAD_DIR'] = '/tmp/gbu-test-uploads'

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, select, text  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Hostel, Role, User  # noqa: E402
from app.seed import seed_rbac, seed_reference  # noqa: E402
from app.services.ratelimit import get_redis  # noqa: E402

PASSWORD = secrets.token_urlsafe(12)


@pytest.fixture(scope='session', autouse=True)
def database():
    url = os.environ['TEST_DATABASE_URL']
    engine = create_engine(url, isolation_level='AUTOCOMMIT')
    with engine.connect() as conn:
        conn.execute(text('DROP SCHEMA public CASCADE'))
        conn.execute(text('CREATE SCHEMA public'))
    engine.dispose()
    cfg = Config('alembic.ini')
    cfg.attributes['database_url'] = url
    command.upgrade(cfg, 'head')
    with SessionLocal() as db:
        seed_rbac(db)
        seed_reference(db)
        db.commit()
    yield


@pytest.fixture(autouse=True)
def clean_redis():
    get_redis().flushdb()
    yield


def make_user(roles: list[str], hostel_code: str | None = 'GBH', **extra) -> User:
    with SessionLocal() as db:
        hostel = db.scalar(select(Hostel).where(Hostel.code == hostel_code)) if hostel_code else None
        u = User(login_id=f'T-{secrets.token_hex(4)}', password_hash=hash_password(PASSWORD), first_name='Test',
                 last_name='+'.join(roles).title(), roles=list(db.scalars(select(Role).where(Role.name.in_(roles)))),
                 hostel_id=hostel.id if hostel else None, **extra)
        db.add(u)
        db.commit()
        db.refresh(u)
        return u


def client_for(user: User, portal: str, staff_role: str | None = None) -> TestClient:
    c = TestClient(app)
    r = c.post('/api/v1/auth/login', json={'identifier': user.login_id, 'password': PASSWORD, 'portal': portal, 'staffRole': staff_role})
    assert r.status_code == 200, r.text
    c.headers['X-CSRF-Token'] = r.json()['data']['csrfToken']
    return c


@pytest.fixture
def student():
    u = make_user(['STUDENT'], room_number='B-204', block='Block B')
    return u, client_for(u, 'student')


@pytest.fixture
def admin():
    u = make_user(['ADMIN'], hostel_code=None)
    return u, client_for(u, 'admin')


def raise_complaint(client: TestClient, title='Ceiling fan not working', category='Electrical', description='', files=None):
    return client.post('/api/v1/complaints', data={'title': title, 'category': category, 'description': description}, files=files or [])

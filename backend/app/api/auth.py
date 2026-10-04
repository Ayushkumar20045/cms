import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.authorization.catalog import ADMIN_ROLES
from app.authorization.deps import ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, CurrentUser, get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, hash_token, new_csrf_token, new_refresh_token, verify_password
from app.db import get_db
from app.models import RefreshToken, User, UserStatus
from app.schemas import Envelope, LoginIn, LoginOut, Me
from app.serializers import me
from app.services import ratelimit
from app.services.audit import audit

router = APIRouter(prefix='/api/v1/auth', tags=['auth'])

GENERIC_LOGIN_ERROR = 'Invalid ID or password'


def portal_and_home(user: User) -> tuple[str, str | None, str]:
    """The portal an account belongs to and its dashboard, decided only by the roles stored in the database."""
    roles = user.role_names
    if roles & ADMIN_ROLES:
        return 'admin', None, '/admin/dashboard'
    if 'WARDEN' in roles:
        return 'staff', 'warden', '/staff/warden/dashboard'
    if 'CARETAKER' in roles:
        return 'staff', 'caretaker', '/staff/caretaker/dashboard'
    if 'AUTHORITY' in roles:
        return 'staff', None, '/staff/authority/dashboard'
    if 'STUDENT' in roles:
        return 'student', None, '/student/dashboard'
    return 'none', None, '/'


def _issue_session(db: Session, response: Response, user: User, persistent: bool, family_id: uuid.UUID | None = None) -> LoginOut:
    s = get_settings()
    access, exp = create_access_token(user.id)
    refresh = new_refresh_token()
    days = s.remember_me_days if persistent else s.refresh_token_days
    db.add(RefreshToken(user_id=user.id, token_hash=hash_token(refresh), family_id=family_id or uuid.uuid4(), persistent=persistent,
                        expires_at=datetime.now(timezone.utc) + timedelta(days=days)))
    csrf = new_csrf_token()
    common = dict(secure=s.cookie_secure, samesite='lax')
    # Without "Remember me" the refresh and CSRF cookies have no max-age and end with the browser session
    keep = dict(max_age=days * 86400) if persistent else {}
    response.set_cookie(ACCESS_COOKIE, access, httponly=True, max_age=s.access_token_minutes * 60, path='/', **common)
    response.set_cookie(REFRESH_COOKIE, refresh, httponly=True, path='/api/v1/auth', **keep, **common)
    response.set_cookie(CSRF_COOKIE, csrf, httponly=False, path='/', **keep, **common)
    return LoginOut(user=me(user), redirect_to=portal_and_home(user)[2], csrf_token=csrf, access_token_expires_at=exp)


def _clear_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path='/')
    response.delete_cookie(REFRESH_COOKIE, path='/api/v1/auth')
    response.delete_cookie(CSRF_COOKIE, path='/')


@router.post('/login', response_model=Envelope[LoginOut])
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    s = get_settings()
    ip = request.client.host if request.client else 'unknown'
    ident = body.identifier.strip()
    key = f'login:{ip}:{ident.lower()}'
    if ratelimit.too_many_attempts(key, s.login_max_attempts, s.login_window_seconds):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail='Too many sign-in attempts. Please wait a few minutes and try again.')

    user = db.scalar(select(User).where(or_(func.lower(User.login_id) == ident.lower(), func.lower(User.email) == ident.lower())))
    ok = verify_password(body.password, user.password_hash if user else None)
    if not ok or user is None or user.status != UserStatus.ACTIVE:
        audit(db, request, user.id if user else None, 'LOGIN', 'user', user.id if user else None,
              new_value={'identifier': ident, 'portal': body.portal}, result='FAILURE')
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    # The portal the user picked is only a UX choice; the stored role decides. A mismatch is refused, not upgraded.
    portal, staff_role, _ = portal_and_home(user)
    if portal != body.portal or (body.portal == 'staff' and body.staff_role and staff_role and staff_role != body.staff_role):
        audit(db, request, user.id, 'LOGIN', 'user', user.id, new_value={'portal': body.portal, 'staffRole': body.staff_role,
                                                                       'reason': 'portal mismatch'}, result='FAILURE')
        db.commit()
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail='This account cannot sign in through the selected portal.')

    ratelimit.reset(key)
    user.last_login_at = datetime.now(timezone.utc)
    out = _issue_session(db, response, user, persistent=body.remember_me)
    audit(db, request, user.id, 'LOGIN', 'user', user.id, new_value={'portal': portal})
    db.commit()
    return Envelope(data=out, message='Signed in successfully')


@router.post('/refresh', response_model=Envelope[LoginOut])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Rotate the refresh token. Presenting an already-used token revokes the whole session family."""
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail='Not signed in')
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)))
    now = datetime.now(timezone.utc)
    if row is None:
        _clear_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail='Session expired. Please sign in again.')
    if row.revoked_at is not None:
        db.execute(update(RefreshToken).where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
                   .values(revoked_at=now))
        audit(db, request, row.user_id, 'REFRESH_TOKEN_REUSE', 'session', row.family_id, result='FAILURE')
        db.commit()
        _clear_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail='Session expired. Please sign in again.')
    user = db.get(User, row.user_id)
    if row.expires_at <= now or user is None or user.status != UserStatus.ACTIVE:
        row.revoked_at = now
        db.commit()
        _clear_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail='Session expired. Please sign in again.')
    row.revoked_at = now
    out = _issue_session(db, response, user, persistent=row.persistent, family_id=row.family_id)
    db.commit()
    return Envelope(data=out)


@router.post('/logout', response_model=Envelope[None])
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)))
        if row:
            db.execute(update(RefreshToken).where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
                       .values(revoked_at=datetime.now(timezone.utc)))
            audit(db, request, row.user_id, 'LOGOUT', 'session', row.family_id)
            db.commit()
    _clear_cookies(response)
    return Envelope(data=None, message='Signed out')


@router.get('/me', response_model=Envelope[Me])
def get_me(current: CurrentUser = Depends(get_current_user)):
    return Envelope(data=me(current.user))

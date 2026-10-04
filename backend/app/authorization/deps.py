import hmac
import uuid
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db import get_db
from app.models import User, UserStatus

ACCESS_COOKIE = 'gbu_access'
REFRESH_COOKIE = 'gbu_refresh'
CSRF_COOKIE = 'gbu_csrf'
CSRF_HEADER = 'X-CSRF-Token'
SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS'}


@dataclass
class CurrentUser:
    user: User
    roles: set[str] = field(default_factory=set)
    permissions: set[str] = field(default_factory=set)

    @property
    def id(self) -> uuid.UUID:
        return self.user.id

    @property
    def hostel_id(self) -> int | None:
        return self.user.hostel_id

    def has(self, *perms: str) -> bool:
        return any(p in self.permissions for p in perms)


def load_principal(user: User) -> CurrentUser:
    return CurrentUser(user=user, roles=user.role_names, permissions={p.name for r in user.roles for p in r.permissions})


def _unauthorized(detail='Not authenticated'):
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=detail, headers={'WWW-Authenticate': 'Bearer'})


def get_current_user(request: Request, db: Session = Depends(get_db)) -> CurrentUser:
    """Authenticate from a Bearer header or the HttpOnly access cookie.

    Roles and permissions are always read from the database, never from token claims or anything the
    client sends, so a revoked role or a deactivated account stops working immediately.
    """
    token, via_cookie = None, False
    auth = request.headers.get('Authorization', '')
    if auth.lower().startswith('bearer '):
        token = auth[7:].strip()
    elif request.cookies.get(ACCESS_COOKIE):
        token, via_cookie = request.cookies[ACCESS_COOKIE], True
    if not token:
        raise _unauthorized()
    user_id = decode_access_token(token)
    if user_id is None:
        raise _unauthorized('Session expired. Please sign in again.')
    user = db.get(User, user_id)
    if user is None or user.status != UserStatus.ACTIVE:
        raise _unauthorized('Account is not active')

    # Cookie-authenticated state-changing requests must echo the CSRF cookie in a header (double-submit)
    if via_cookie and request.method not in SAFE_METHODS:
        cookie, header = request.cookies.get(CSRF_COOKIE, ''), request.headers.get(CSRF_HEADER, '')
        if not cookie or not hmac.compare_digest(cookie, header):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail='CSRF token missing or invalid')
    return load_principal(user)


def require_permission(*perms: str):
    """Dependency: the user must hold at least one of `perms`. Scope is checked separately against the record."""
    def checker(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current.has(*perms):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail='You do not have permission to perform this action')
        return current
    return checker

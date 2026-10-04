import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings

# Argon2id with the library's recommended parameters
_hasher = PasswordHasher()
# Verified against when the email is unknown, so response time does not reveal whether an account exists
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: uuid.UUID) -> tuple[str, datetime]:
    s = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=s.access_token_minutes)
    token = jwt.encode({'sub': str(user_id), 'type': 'access', 'iat': now, 'exp': exp, 'jti': uuid.uuid4().hex},
                       s.jwt_secret, algorithm=s.jwt_algorithm)
    return token, exp


def decode_access_token(token: str) -> uuid.UUID | None:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm], options={'require': ['exp', 'sub', 'type']})
    except jwt.PyJWTError:
        return None
    if payload.get('type') != 'access':
        return None
    try:
        return uuid.UUID(payload['sub'])
    except ValueError:
        return None


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)

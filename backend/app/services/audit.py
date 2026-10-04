import ipaddress
import uuid

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog


def _client_ip(request: Request | None) -> str | None:
    host = request.client.host if request and request.client else None
    try:
        return str(ipaddress.ip_address(host)) if host else None
    except ValueError:  # e.g. a hostname or a unix socket peer
        return None


def audit(db: Session, request: Request | None, user_id: uuid.UUID | None, action: str, resource_type: str,
          resource_id: str | uuid.UUID | None = None, old_value: dict | None = None, new_value: dict | None = None,
          result: str = 'SUCCESS') -> None:
    """Add an audit entry to the current transaction; it is committed together with the change it records."""
    db.add(AuditLog(
        user_id=user_id, action=action, resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        old_value=old_value, new_value=new_value, result=result,
        ip_address=_client_ip(request),
        user_agent=(request.headers.get('user-agent') or '')[:300] if request else None,
    ))

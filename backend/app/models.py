import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (Boolean, Column, DateTime, Enum, ForeignKey, Integer, Sequence, String, Table, Text, func)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid_pk():
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _created():
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _updated():
    return mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


def _enum(cls, name):
    return Enum(cls, name=name, values_callable=lambda e: [x.value for x in e])


user_roles = Table('user_roles', Base.metadata,
                   Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
                   Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True))

role_permissions = Table('role_permissions', Base.metadata,
                         Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
                         Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True))


class Role(Base):
    __tablename__ = 'roles'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str] = mapped_column(String(255), default='')
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()
    permissions: Mapped[list['Permission']] = relationship(secondary=role_permissions, lazy='selectin')


class Permission(Base):
    __tablename__ = 'permissions'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(255), default='')
    module: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = _created()


class Hostel(Base):
    __tablename__ = 'hostels'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    capacity: Mapped[int | None] = mapped_column(Integer)
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Building footprint on the campus map (WGS 84); optional until the GBU GIS layers are digitised
    geom = mapped_column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()


class UserStatus(str, enum.Enum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'


class User(Base):
    __tablename__ = 'users'
    id: Mapped[uuid.UUID] = _uuid_pk()
    # University Login ID for students, Staff ID for hostel staff, Admin ID for administrators
    login_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80), default='')
    phone: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[UserStatus] = mapped_column(_enum(UserStatus, 'user_status'), default=UserStatus.ACTIVE)
    # Students: allocated hostel (from the Hostel Allocation Portal later). Wardens/caretakers: hostel they serve.
    hostel_id: Mapped[int | None] = mapped_column(ForeignKey('hostels.id'), index=True)
    room_number: Mapped[str | None] = mapped_column(String(20))
    block: Mapped[str | None] = mapped_column(String(40))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    roles: Mapped[list[Role]] = relationship(secondary=user_roles, lazy='selectin')
    hostel: Mapped[Hostel | None] = relationship(lazy='joined')

    @property
    def full_name(self) -> str:
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def role_names(self) -> set[str]:
        return {r.name for r in self.roles}


class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'
    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    persistent: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()


class Category(Base):
    __tablename__ = 'complaint_categories'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created()


class ComplaintStatus(str, enum.Enum):
    SUBMITTED = 'SUBMITTED'
    UNDER_REVIEW = 'UNDER_REVIEW'
    ASSIGNED = 'ASSIGNED'
    IN_PROGRESS = 'IN_PROGRESS'
    WAITING_FOR_INFORMATION = 'WAITING_FOR_INFORMATION'
    RESOLVED = 'RESOLVED'
    CLOSED = 'CLOSED'
    REJECTED = 'REJECTED'
    DUPLICATE = 'DUPLICATE'
    ESCALATED = 'ESCALATED'
    REOPENED = 'REOPENED'


class Priority(str, enum.Enum):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    URGENT = 'URGENT'


class AssignmentType(str, enum.Enum):
    WARDEN = 'WARDEN'
    CARETAKER = 'CARETAKER'
    AUTHORITY = 'AUTHORITY'
    ADMIN = 'ADMIN'


class CommentVisibility(str, enum.Enum):
    INTERNAL = 'INTERNAL'
    STUDENT_VISIBLE = 'STUDENT_VISIBLE'


complaint_number_seq = Sequence('complaint_number_seq', metadata=Base.metadata)


class Complaint(Base):
    __tablename__ = 'complaints'
    id: Mapped[uuid.UUID] = _uuid_pk()
    complaint_number: Mapped[str] = mapped_column(String(20), unique=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'), index=True)
    hostel_id: Mapped[int | None] = mapped_column(ForeignKey('hostels.id'), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey('complaint_categories.id'))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[ComplaintStatus] = mapped_column(_enum(ComplaintStatus, 'complaint_status'), default=ComplaintStatus.SUBMITTED,
                                                    index=True)
    priority: Mapped[Priority] = mapped_column(_enum(Priority, 'complaint_priority'), default=Priority.MEDIUM)
    expected_resolution_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    student: Mapped[User] = relationship(foreign_keys=[student_id], lazy='joined')
    hostel: Mapped[Hostel | None] = relationship(lazy='joined')
    category: Mapped[Category] = relationship(lazy='joined')
    assignments: Mapped[list['ComplaintAssignment']] = relationship(order_by='ComplaintAssignment.assigned_at', lazy='selectin')
    history: Mapped[list['ComplaintStatusHistory']] = relationship(order_by='ComplaintStatusHistory.id', lazy='selectin')
    comments: Mapped[list['ComplaintComment']] = relationship(order_by='ComplaintComment.id', lazy='selectin')
    attachments: Mapped[list['ComplaintAttachment']] = relationship(order_by='ComplaintAttachment.created_at', lazy='selectin')

    @property
    def active_assignments(self) -> list['ComplaintAssignment']:
        return [a for a in self.assignments if a.is_active]


class ComplaintAssignment(Base):
    """One row per assignment; deactivated rather than deleted, so assignment history is preserved."""
    __tablename__ = 'complaint_assignments'
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('complaints.id', ondelete='CASCADE'), index=True)
    assigned_to_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'), index=True)
    assigned_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'))
    assignment_type: Mapped[AssignmentType] = mapped_column(_enum(AssignmentType, 'assignment_type'))
    remarks: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    assigned_at: Mapped[datetime] = _created()
    unassigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    assigned_to: Mapped[User] = relationship(foreign_keys=[assigned_to_id], lazy='joined')


class ComplaintStatusHistory(Base):
    __tablename__ = 'complaint_status_history'
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('complaints.id', ondelete='CASCADE'), index=True)
    old_status: Mapped[str | None] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30))
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'))
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created()
    changed_by: Mapped[User | None] = relationship(lazy='joined')


class ComplaintComment(Base):
    __tablename__ = 'complaint_comments'
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('complaints.id', ondelete='CASCADE'), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'))
    comment: Mapped[str] = mapped_column(Text)
    visibility: Mapped[CommentVisibility] = mapped_column(_enum(CommentVisibility, 'comment_visibility'),
                                                          default=CommentVisibility.STUDENT_VISIBLE)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()
    author: Mapped[User] = relationship(lazy='joined')


class ComplaintAttachment(Base):
    """Metadata only; the file itself lives in object storage under `storage_key`."""
    __tablename__ = 'complaint_attachments'
    id: Mapped[uuid.UUID] = _uuid_pk()
    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('complaints.id', ondelete='CASCADE'), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    mime_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = _created()


class AuditLog(Base):
    """Append-only: UPDATE, DELETE and TRUNCATE are blocked by database triggers (see the initial migration)."""
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    resource_type: Mapped[str] = mapped_column(String(40))
    resource_id: Mapped[str | None] = mapped_column(String(64))
    old_value: Mapped[dict | None] = mapped_column(JSONB)
    new_value: Mapped[dict | None] = mapped_column(JSONB)
    result: Mapped[str] = mapped_column(String(10), default='SUCCESS')
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(String(300))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

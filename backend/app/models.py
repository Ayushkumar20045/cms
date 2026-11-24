import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (Boolean, Column, DateTime, Enum, ForeignKey, Integer, Sequence, String, Table, Text, UniqueConstraint,
                        func)
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


# ---------------------------------------------------------------- campus locations
# Zone -> Building -> Floor -> Room. Geometry is WGS 84 and optional until the GBU GIS layers are digitised.

class BuildingType(str, enum.Enum):
    ACADEMIC = 'ACADEMIC'
    HOSTEL = 'HOSTEL'
    ADMINISTRATIVE = 'ADMINISTRATIVE'
    RESIDENTIAL = 'RESIDENTIAL'
    LIBRARY = 'LIBRARY'
    SPORTS = 'SPORTS'
    MEDICAL = 'MEDICAL'
    UTILITY = 'UTILITY'
    OTHER = 'OTHER'


class RoomType(str, enum.Enum):
    CLASSROOM = 'CLASSROOM'
    LABORATORY = 'LABORATORY'
    OFFICE = 'OFFICE'
    HOSTEL_ROOM = 'HOSTEL_ROOM'
    WASHROOM = 'WASHROOM'
    COMMON_AREA = 'COMMON_AREA'
    STORE = 'STORE'
    OTHER = 'OTHER'


class Campus(Base):
    """The university boundary drawn on the private campus map. One row per campus (GBU has one)."""
    __tablename__ = 'campuses'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    geom = mapped_column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=False)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()


class Zone(Base):
    __tablename__ = 'zones'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    geom = mapped_column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()


class Building(Base):
    __tablename__ = 'buildings'
    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[int | None] = mapped_column(ForeignKey('zones.id'), index=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    building_type: Mapped[BuildingType] = mapped_column(_enum(BuildingType, 'building_type'), default=BuildingType.OTHER, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    geom = mapped_column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    zone: Mapped[Zone | None] = relationship(lazy='joined')
    floors: Mapped[list['Floor']] = relationship(order_by='Floor.level', back_populates='building')


class Floor(Base):
    __tablename__ = 'floors'
    __table_args__ = (UniqueConstraint('building_id', 'level'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    building_id: Mapped[int] = mapped_column(ForeignKey('buildings.id', ondelete='CASCADE'), index=True)
    # 0 = ground floor, negative = basement
    level: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = _created()

    building: Mapped[Building] = relationship(back_populates='floors')
    rooms: Mapped[list['Room']] = relationship(order_by='Room.number', back_populates='floor')


class Room(Base):
    __tablename__ = 'rooms'
    __table_args__ = (UniqueConstraint('floor_id', 'number'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    floor_id: Mapped[int] = mapped_column(ForeignKey('floors.id', ondelete='CASCADE'), index=True)
    number: Mapped[str] = mapped_column(String(30))
    name: Mapped[str | None] = mapped_column(String(120))
    room_type: Mapped[RoomType] = mapped_column(_enum(RoomType, 'room_type'), default=RoomType.OTHER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created()

    floor: Mapped[Floor] = relationship(back_populates='rooms', lazy='joined')


class Department(Base):
    """A maintenance or service department that requests are routed to (Electrical, Civil, IT ...)."""
    __tablename__ = 'departments'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()


class Hostel(Base):
    """Hostel administration (wardens, allocations). Its physical structure is the linked HOSTEL building."""
    __tablename__ = 'hostels'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    building_id: Mapped[int | None] = mapped_column(ForeignKey('buildings.id'), unique=True)
    capacity: Mapped[int | None] = mapped_column(Integer)
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    building: Mapped[Building | None] = relationship(lazy='joined')


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
    # Technicians, supervisors and department heads: the department they work in (also scopes what they see)
    department_id: Mapped[int | None] = mapped_column(ForeignKey('departments.id'), index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    roles: Mapped[list[Role]] = relationship(secondary=user_roles, lazy='selectin')
    hostel: Mapped[Hostel | None] = relationship(lazy='joined')
    department: Mapped[Department | None] = relationship(lazy='joined')

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
    # Requests in this category are routed to this department
    department_id: Mapped[int | None] = mapped_column(ForeignKey('departments.id'))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created()

    department: Mapped[Department | None] = relationship(lazy='joined')


class ComplaintStatus(str, enum.Enum):
    SUBMITTED = 'SUBMITTED'
    UNDER_REVIEW = 'UNDER_REVIEW'
    ASSIGNED = 'ASSIGNED'
    IN_PROGRESS = 'IN_PROGRESS'
    WAITING_FOR_INFORMATION = 'WAITING_FOR_INFORMATION'
    WAITING_FOR_MATERIALS = 'WAITING_FOR_MATERIALS'
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
    TECHNICIAN = 'TECHNICIAN'
    ADMIN = 'ADMIN'


class CommentVisibility(str, enum.Enum):
    INTERNAL = 'INTERNAL'
    STUDENT_VISIBLE = 'STUDENT_VISIBLE'


class ComplaintDecision(str, enum.Enum):
    """Whether the responsible staff member took the request on or turned it down."""
    ACCEPTED = 'ACCEPTED'
    REJECTED = 'REJECTED'


complaint_number_seq = Sequence('complaint_number_seq', metadata=Base.metadata)


class Complaint(Base):
    """A service request. Raised by any requester (student, faculty, staff) about a place on campus."""
    __tablename__ = 'complaints'
    id: Mapped[uuid.UUID] = _uuid_pk()
    complaint_number: Mapped[str] = mapped_column(String(20), unique=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'), index=True)
    # Where the problem is. hostel_id is set when the building is a hostel, so warden scoping keeps working.
    building_id: Mapped[int | None] = mapped_column(ForeignKey('buildings.id'), index=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey('rooms.id'))
    location_details: Mapped[str | None] = mapped_column(String(255))
    hostel_id: Mapped[int | None] = mapped_column(ForeignKey('hostels.id'), index=True)
    # Responsible department, taken from the category when the request is raised
    department_id: Mapped[int | None] = mapped_column(ForeignKey('departments.id'), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey('complaint_categories.id'))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[ComplaintStatus] = mapped_column(_enum(ComplaintStatus, 'complaint_status'), default=ComplaintStatus.SUBMITTED,
                                                    index=True)
    priority: Mapped[Priority] = mapped_column(_enum(Priority, 'complaint_priority'), default=Priority.MEDIUM)
    expected_resolution_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Accept / reject decision by the caretaker, warden, supervisor or admin; shown to the requester and admins
    decision: Mapped[ComplaintDecision | None] = mapped_column(_enum(ComplaintDecision, 'complaint_decision'), index=True)
    decision_reason: Mapped[str | None] = mapped_column(Text)
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    requester: Mapped[User] = relationship(foreign_keys=[requester_id], lazy='joined')
    decided_by: Mapped[User | None] = relationship(foreign_keys=[decided_by_id], lazy='joined')
    building: Mapped[Building | None] = relationship(lazy='joined')
    room: Mapped[Room | None] = relationship(lazy='joined')
    hostel: Mapped[Hostel | None] = relationship(lazy='joined')
    department: Mapped[Department | None] = relationship(lazy='joined')
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


class RequirementStatus(str, enum.Enum):
    PENDING = 'PENDING'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    FULFILLED = 'FULFILLED'


requirement_number_seq = Sequence('requirement_number_seq', metadata=Base.metadata)


class Requirement(Base):
    """A request for materials or equipment (taps, bulbs, locks ...) raised by hostel or maintenance staff."""
    __tablename__ = 'requirements'
    id: Mapped[uuid.UUID] = _uuid_pk()
    requirement_number: Mapped[str] = mapped_column(String(20), unique=True)
    item: Mapped[str] = mapped_column(String(150))
    category_id: Mapped[int | None] = mapped_column(ForeignKey('complaint_categories.id'))
    quantity: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[RequirementStatus] = mapped_column(_enum(RequirementStatus, 'requirement_status'),
                                                      default=RequirementStatus.PENDING, index=True)
    # Where it is needed, copied from the requester so hostel and department staff see their own requests
    hostel_id: Mapped[int | None] = mapped_column(ForeignKey('hostels.id'), index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey('departments.id'), index=True)
    # Optional link to the request that is waiting for these materials
    complaint_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('complaints.id'))
    requested_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id'), index=True)
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    category: Mapped[Category | None] = relationship(lazy='joined')
    hostel: Mapped[Hostel | None] = relationship(lazy='joined')
    department: Mapped[Department | None] = relationship(lazy='joined')
    complaint: Mapped[Complaint | None] = relationship(lazy='joined')
    requested_by: Mapped[User] = relationship(foreign_keys=[requested_by_id], lazy='joined')
    decided_by: Mapped[User | None] = relationship(foreign_keys=[decided_by_id], lazy='joined')


class Notification(Base):
    """An in-app message for one user (shown in the bell and as a popup). Email copies are sent separately."""
    __tablename__ = 'notifications'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    # e.g. COMPLAINT_RAISED, COMPLAINT_ACCEPTED, COMPLAINT_REJECTED, STATUS_CHANGED, RECURRING_ISSUE
    kind: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default='')
    complaint_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('complaints.id', ondelete='CASCADE'), index=True)
    # Page in the frontend to open when the notification is clicked
    link: Mapped[str | None] = mapped_column(String(255))
    emailed: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
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

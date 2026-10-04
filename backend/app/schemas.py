"""API shapes. JSON uses camelCase to match the frontend; every response is wrapped as
{"success": true, "data": ..., "message": ...} per section 58 of the handoff specification."""
import uuid
from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.models import AssignmentType, ComplaintStatus, CommentVisibility, Priority, UserStatus

T = TypeVar('T')


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class In(Camel):
    # Unknown fields are rejected, so a client cannot set status, assignee or priority by adding fields
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra='forbid', str_strip_whitespace=True)


class Envelope(Camel, Generic[T]):
    success: bool = True
    data: T
    message: str | None = None


class Pagination(Camel):
    page: int
    limit: int
    total: int
    total_pages: int


class PageOf(Camel, Generic[T]):
    success: bool = True
    data: list[T]
    pagination: Pagination


# ---------------------------------------------------------------- auth
Portal = Literal['student', 'staff', 'admin']


class LoginIn(In):
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)
    portal: Portal
    staff_role: Literal['warden', 'caretaker'] | None = None
    remember_me: bool = False


class HostelBrief(Camel):
    id: int
    code: str
    name: str


class Me(Camel):
    id: uuid.UUID
    login_id: str
    email: str | None
    first_name: str
    last_name: str
    full_name: str
    phone: str | None
    status: UserStatus
    roles: list[str]
    permissions: list[str]
    hostel: HostelBrief | None
    room_number: str | None
    block: str | None


class LoginOut(Camel):
    user: Me
    redirect_to: str
    csrf_token: str
    access_token_expires_at: datetime


# ---------------------------------------------------------------- reference data
class CategoryOut(Camel):
    id: int
    name: str
    description: str | None
    is_active: bool


# ---------------------------------------------------------------- complaints
class UserBrief(Camel):
    id: uuid.UUID
    full_name: str
    login_id: str


class AssignmentOut(Camel):
    id: int
    assigned_to: UserBrief
    assignment_type: AssignmentType
    remarks: str | None
    is_active: bool
    assigned_at: datetime
    unassigned_at: datetime | None


class HistoryOut(Camel):
    id: int
    old_status: str | None
    new_status: str
    remarks: str | None
    changed_by: UserBrief | None
    created_at: datetime


class CommentOut(Camel):
    id: int
    comment: str
    visibility: CommentVisibility
    author: UserBrief
    created_at: datetime


class AttachmentOut(Camel):
    id: uuid.UUID
    original_filename: str
    mime_type: str
    size_bytes: int
    created_at: datetime


class ComplaintSummary(Camel):
    id: uuid.UUID
    complaint_number: str
    title: str
    category: str
    status: ComplaintStatus
    priority: Priority
    hostel: HostelBrief | None
    student: UserBrief
    assigned_to: str | None
    is_overdue: bool
    expected_resolution_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ComplaintDetail(ComplaintSummary):
    description: str
    resolved_at: datetime | None
    closed_at: datetime | None
    assignments: list[AssignmentOut]
    history: list[HistoryOut]
    comments: list[CommentOut]
    attachments: list[AttachmentOut]
    allowed_statuses: list[ComplaintStatus]


def _words(v: str) -> int:
    return len(v.split())


class CommentIn(In):
    comment: str = Field(min_length=1, max_length=2000)
    visibility: CommentVisibility = CommentVisibility.STUDENT_VISIBLE


class ReopenIn(In):
    reason: str = Field(min_length=3, max_length=1000)


class AdminComplaintUpdateIn(In):
    status: ComplaintStatus | None = None
    priority: Priority | None = None
    expected_resolution_at: datetime | None = None
    remarks: str | None = Field(default=None, max_length=1000)
    override: bool = False


class AssignIn(In):
    assignee_id: uuid.UUID
    remarks: str | None = Field(default=None, max_length=1000)


class EscalateIn(In):
    reason: str = Field(min_length=3, max_length=1000)
    assignee_id: uuid.UUID | None = None


# ---------------------------------------------------------------- student
class StudentSummary(Camel):
    total: int
    active: int
    resolved: int


class ActivityOut(Camel):
    complaint_number: str
    title: str
    old_status: str | None
    new_status: str
    remarks: str | None
    actor_role: str | None
    created_at: datetime


class StudentProfile(Camel):
    user: Me
    summary: StudentSummary


# ---------------------------------------------------------------- admin
class AdminCounts(Camel):
    total: int
    pending: int
    in_progress: int
    resolved: int
    overdue: int


class HostelCount(Camel):
    hostel: str
    count: int


class AdminDashboard(Camel):
    counts: AdminCounts
    by_status: dict[str, int]
    by_hostel: list[HostelCount]
    recent_complaints: list[ComplaintSummary]
    pending_requirements: int


class UserOut(Camel):
    id: uuid.UUID
    login_id: str
    email: str | None
    first_name: str
    last_name: str
    full_name: str
    phone: str | None
    status: UserStatus
    roles: list[str]
    hostel: HostelBrief | None
    room_number: str | None
    block: str | None
    last_login_at: datetime | None
    created_at: datetime


class UserCreateIn(In):
    login_id: str = Field(min_length=3, max_length=40, pattern=r'^[A-Za-z0-9._/-]+$')
    email: str | None = Field(default=None, max_length=254, pattern=r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
    password: str = Field(min_length=10, max_length=256)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(default='', max_length=80)
    phone: str | None = Field(default=None, max_length=20)
    roles: list[str] = Field(min_length=1)
    hostel_id: int | None = None
    room_number: str | None = Field(default=None, max_length=20)
    block: str | None = Field(default=None, max_length=40)


class UserUpdateIn(In):
    email: str | None = Field(default=None, max_length=254, pattern=r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=20)
    roles: list[str] | None = Field(default=None, min_length=1)
    hostel_id: int | None = None
    room_number: str | None = Field(default=None, max_length=20)
    block: str | None = Field(default=None, max_length=40)


class PasswordResetIn(In):
    new_password: str = Field(min_length=10, max_length=256)


class HostelOut(Camel):
    id: int
    code: str
    name: str
    capacity: int | None
    contact_phone: str | None
    contact_email: str | None
    is_active: bool
    student_count: int = 0
    open_complaints: int = 0
    wardens: list[UserBrief] = []


class HostelIn(In):
    code: str = Field(min_length=2, max_length=30, pattern=r'^[A-Za-z0-9_-]+$')
    name: str = Field(min_length=2, max_length=120)
    capacity: int | None = Field(default=None, ge=0)
    contact_phone: str | None = Field(default=None, max_length=20)
    contact_email: str | None = Field(default=None, max_length=254)


class HostelUpdateIn(In):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    capacity: int | None = Field(default=None, ge=0)
    contact_phone: str | None = Field(default=None, max_length=20)
    contact_email: str | None = Field(default=None, max_length=254)
    is_active: bool | None = None


class CategoryIn(In):
    name: str = Field(min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=255)


class CategoryUpdateIn(In):
    name: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class AuditOut(Camel):
    id: int
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    old_value: dict | None
    new_value: dict | None
    result: str
    ip_address: str | None
    timestamp: datetime

    @field_validator('ip_address', mode='before')
    @classmethod
    def ip_str(cls, v):
        return str(v) if v is not None else None

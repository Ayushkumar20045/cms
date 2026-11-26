"""API shapes. JSON uses camelCase to match the frontend; every response is wrapped as
{"success": true, "data": ..., "message": ...} per section 58 of the handoff specification."""
import uuid
from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.models import (AssignmentType, BuildingType, ComplaintDecision, ComplaintStatus, CommentVisibility, LinkType, Priority,
                        RequirementStatus, RoomType, SubtaskStatus, UserStatus)

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
    staff_role: Literal['warden', 'caretaker', 'technician', 'supervisor', 'department_head', 'store_manager', 'authority'] | None = None
    remember_me: bool = False


class HostelBrief(Camel):
    id: int
    code: str
    name: str


class DepartmentBrief(Camel):
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
    department: DepartmentBrief | None = None


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
    department: DepartmentBrief | None = None


class DepartmentOut(Camel):
    id: int
    code: str
    name: str
    description: str | None
    contact_email: str | None
    contact_phone: str | None
    is_active: bool


class ZoneOut(Camel):
    id: int
    code: str
    name: str
    description: str | None
    is_active: bool


class BuildingOut(Camel):
    id: int
    code: str
    name: str
    building_type: BuildingType
    zone: ZoneOut | None
    is_active: bool
    hostel: HostelBrief | None = None


class RoomOut(Camel):
    id: int
    number: str
    name: str | None
    room_type: RoomType
    is_active: bool


class FloorOut(Camel):
    id: int
    level: int
    name: str
    rooms: list[RoomOut] = []


class BuildingDetail(BuildingOut):
    floors: list[FloorOut]


class MapBuilding(Camel):
    id: int
    code: str
    name: str
    building_type: BuildingType
    hostel: HostelBrief | None
    geometry: dict
    open_requests: int


class CampusMap(Camel):
    """The private GBU map: no third-party tiles, only shapes from the campus GIS import."""
    name: str | None
    boundary: dict | None
    # [minLng, minLat, maxLng, maxLat] of everything drawn
    bounds: list[float] | None
    buildings: list[MapBuilding]


class GisImportReport(Camel):
    dry_run: bool
    boundary: str | None
    created: list[str]
    updated: list[str]
    skipped: list[str]
    warnings: list[str]


class LocationOut(Camel):
    """Where a request is: building, optional floor and room, and free-text details."""
    building: BuildingOut | None
    floor: str | None
    room: str | None
    details: str | None
    label: str


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
    requester: UserBrief
    # Same person as `requester`; kept under its original name for the existing student/admin pages
    student: UserBrief
    location: LocationOut
    department: DepartmentBrief | None
    assigned_to: str | None
    is_overdue: bool
    expected_resolution_at: datetime | None
    # Accepted or rejected by the responsible staff member, with the reason for a rejection
    decision: ComplaintDecision | None = None
    decision_reason: str | None = None
    decided_by: UserBrief | None = None
    decided_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------- labels, links, sub-tasks
LABEL_COLORS = ('slate', 'maroon', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink')


class LabelOut(Camel):
    id: int
    name: str
    color: str


class LabelIn(In):
    name: str = Field(min_length=2, max_length=40)
    color: str | None = None

    @field_validator('name')
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = ' '.join(v.split()).lower()
        if not all(ch.isalnum() or ch in ' -_' for ch in v):
            raise ValueError('Use letters, numbers, spaces, - or _ only')
        return v

    @field_validator('color')
    @classmethod
    def known_color(cls, v: str | None) -> str | None:
        if v is not None and v not in LABEL_COLORS:
            raise ValueError(f"Choose one of: {', '.join(LABEL_COLORS)}")
        return v


class LinkedTicket(Camel):
    id: uuid.UUID
    complaint_number: str
    title: str
    status: ComplaintStatus


class LinkOut(Camel):
    id: int
    link_type: LinkType
    # How it reads from this ticket: "blocks", "is blocked by", "duplicates", "is duplicated by", "relates to"
    label: str
    outward: bool
    ticket: LinkedTicket


class LinkIn(In):
    target_key: str = Field(min_length=3, max_length=30)
    # 'IS_BLOCKED_BY' and 'IS_DUPLICATED_BY' are stored as the reverse link, so the wording matches on both tickets
    link_type: Literal['BLOCKS', 'IS_BLOCKED_BY', 'DUPLICATES', 'IS_DUPLICATED_BY', 'RELATES_TO']


class SubtaskOut(Camel):
    id: int
    title: str
    status: SubtaskStatus
    assignee: 'UserBrief | None' = None
    position: int
    completed_at: datetime | None
    created_at: datetime
    # True when the signed-in user may change this sub-task's status
    can_update: bool = False


class SubtaskIn(In):
    title: str = Field(min_length=3, max_length=150)
    assignee_id: uuid.UUID | None = None


class SubtaskPatch(In):
    title: str | None = Field(None, min_length=3, max_length=150)
    status: SubtaskStatus | None = None
    assignee_id: uuid.UUID | None = None
    position: int | None = Field(None, ge=0, le=999)


class SubtaskProgress(Camel):
    done: int
    total: int


class ComplaintDetail(ComplaintSummary):
    description: str
    resolved_at: datetime | None
    closed_at: datetime | None
    assignments: list[AssignmentOut]
    history: list[HistoryOut]
    comments: list[CommentOut]
    attachments: list[AttachmentOut]
    allowed_statuses: list[ComplaintStatus]
    # True when the signed-in user may accept or reject this request now
    can_decide: bool = False
    # Earlier requests in the recurring window that describe the same issue (staff only)
    similar: list['SimilarComplaint'] = []
    # Staff only: tags, linked tickets the user may see, and the steps of the job
    labels: list[LabelOut] = []
    links: list[LinkOut] = []
    subtasks: list[SubtaskOut] = []
    # True when the user may add or remove labels, links and sub-tasks
    can_organise: bool = False


class BoardCard(ComplaintSummary):
    # Statuses this user may drag the card to; empty when it must be accepted or rejected first
    allowed_moves: list[ComplaintStatus]
    needs_decision: bool
    labels: list[LabelOut] = []
    subtasks: SubtaskProgress | None = None


class BoardColumn(Camel):
    status: ComplaintStatus
    title: str
    statuses: list[ComplaintStatus]
    total: int
    cards: list[BoardCard]


class BoardOut(Camel):
    columns: list[BoardColumn]


class SimilarComplaint(Camel):
    id: uuid.UUID
    complaint_number: str
    title: str
    status: ComplaintStatus
    created_at: datetime


class BuildingSummary(Camel):
    """A building on the campus map, with counts of the requests the viewer is allowed to see there."""
    building: BuildingOut
    pending: int
    in_progress: int
    resolved: int
    recent: list[ComplaintSummary]


def _words(v: str) -> int:
    return len(v.split())


class CommentIn(In):
    comment: str = Field(min_length=1, max_length=2000)
    visibility: CommentVisibility = CommentVisibility.STUDENT_VISIBLE


class ReopenIn(In):
    reason: str = Field(min_length=3, max_length=1000)


class AcceptIn(In):
    remarks: str | None = Field(default=None, max_length=1000)


class RejectIn(In):
    reason: str = Field(min_length=5, max_length=1000)


class StaffStatusIn(In):
    status: ComplaintStatus
    remarks: str | None = Field(default=None, max_length=1000)


class NotificationOut(Camel):
    id: int
    kind: str
    title: str
    body: str
    link: str | None
    complaint_id: uuid.UUID | None
    read: bool
    created_at: datetime


class NotificationList(Camel):
    items: list[NotificationOut]
    unread: int


class RecurringIssue(Camel):
    """A group of similar requests (same place and category) raised again and again."""
    key: str
    title: str
    category: str
    location: str
    count: int
    open: int
    first_at: datetime
    latest_at: datetime
    complaints: list[SimilarComplaint]


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


# ---------------------------------------------------------------- requirements
class RequirementOut(Camel):
    id: uuid.UUID
    requirement_number: str
    item: str
    category: str | None
    quantity: int
    reason: str
    status: RequirementStatus
    hostel: HostelBrief | None
    department: DepartmentBrief | None
    complaint_number: str | None
    requested_by: UserBrief
    requested_by_role: str
    decided_by: UserBrief | None
    decided_at: datetime | None
    decision_remarks: str | None
    created_at: datetime


class RequirementIn(In):
    item: str = Field(min_length=2, max_length=150)
    category_id: int | None = None
    quantity: int = Field(ge=1, le=100000)
    reason: str = Field(min_length=5, max_length=2000)
    complaint_id: uuid.UUID | None = None


class RequirementDecisionIn(In):
    decision: Literal['APPROVED', 'REJECTED', 'FULFILLED']
    remarks: str | None = Field(default=None, max_length=1000)


class RequirementCounts(Camel):
    total: int
    pending: int
    approved: int
    rejected: int
    fulfilled: int


# ---------------------------------------------------------------- reports
class NamedCount(Camel):
    name: str
    count: int


class MonthCount(Camel):
    month: str
    raised: int
    resolved: int


class ReportOut(Camel):
    days: int | None
    total: int
    open: int
    resolved: int
    escalated: int
    overdue: int
    avg_resolution_hours: float | None
    resolved_on_time_percent: float | None
    by_status: list[NamedCount]
    by_category: list[NamedCount]
    by_hostel: list[NamedCount]
    by_department: list[NamedCount]
    by_month: list[MonthCount]


# ---------------------------------------------------------------- staff
class StaffCounts(Camel):
    total: int
    # Not yet with a worker: submitted, under review or reopened
    pending: int
    assigned: int
    # In progress or escalated
    in_progress: int
    waiting_for_materials: int
    waiting_for_information: int
    resolved: int
    overdue: int


class StaffHostel(Camel):
    hostel: HostelBrief
    students: int
    # Open requests in the whole hostel
    active_issues: int


class StaffDashboard(Camel):
    """Counts and recent requests within the signed-in staff member's scope (their hostel, department or assignments)."""
    counts: StaffCounts
    recent: list[ComplaintSummary]
    hostel: StaffHostel | None


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
    department: DepartmentBrief | None = None
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
    department_id: int | None = None


class UserUpdateIn(In):
    email: str | None = Field(default=None, max_length=254, pattern=r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=20)
    roles: list[str] | None = Field(default=None, min_length=1)
    hostel_id: int | None = None
    room_number: str | None = Field(default=None, max_length=20)
    block: str | None = Field(default=None, max_length=40)
    department_id: int | None = None


class PasswordResetIn(In):
    new_password: str = Field(min_length=10, max_length=256)


class HostelOut(Camel):
    id: int
    code: str
    name: str
    building_id: int | None = None
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
    department_id: int | None = None


class CategoryUpdateIn(In):
    name: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=255)
    department_id: int | None = None
    is_active: bool | None = None


_CODE = r'^[A-Za-z0-9_-]+$'


class DepartmentIn(In):
    code: str = Field(min_length=2, max_length=30, pattern=_CODE)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=254, pattern=r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
    contact_phone: str | None = Field(default=None, max_length=20)


class DepartmentUpdateIn(In):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=254, pattern=r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
    contact_phone: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class ZoneIn(In):
    code: str = Field(min_length=1, max_length=30, pattern=_CODE)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)


class ZoneUpdateIn(In):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class BuildingIn(In):
    code: str = Field(min_length=1, max_length=30, pattern=_CODE)
    name: str = Field(min_length=2, max_length=120)
    building_type: BuildingType = BuildingType.OTHER
    zone_id: int | None = None


class BuildingUpdateIn(In):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    building_type: BuildingType | None = None
    zone_id: int | None = None
    is_active: bool | None = None


class FloorIn(In):
    level: int = Field(ge=-5, le=200)
    name: str | None = Field(default=None, min_length=1, max_length=60)


class RoomIn(In):
    number: str = Field(min_length=1, max_length=30)
    name: str | None = Field(default=None, max_length=120)
    room_type: RoomType = RoomType.OTHER


class RoomUpdateIn(In):
    name: str | None = Field(default=None, max_length=120)
    room_type: RoomType | None = None
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


# Resolve the forward reference to SimilarComplaint
ComplaintDetail.model_rebuild()

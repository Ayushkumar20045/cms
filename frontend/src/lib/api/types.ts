export type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_INFORMATION"
  | "WAITING_FOR_MATERIALS"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED"
  | "DUPLICATE"
  | "ESCALATED"
  | "REOPENED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface HostelBrief {
  id: number;
  code: string;
  name: string;
}

export interface DepartmentBrief {
  id: number;
  code: string;
  name: string;
}

export type BuildingType =
  | "ACADEMIC"
  | "HOSTEL"
  | "ADMINISTRATIVE"
  | "RESIDENTIAL"
  | "LIBRARY"
  | "SPORTS"
  | "MEDICAL"
  | "UTILITY"
  | "OTHER";

export interface Building {
  id: number;
  code: string;
  name: string;
  buildingType: BuildingType;
  zone: { id: number; code: string; name: string } | null;
  isActive: boolean;
  hostel: HostelBrief | null;
}

export interface Room {
  id: number;
  number: string;
  name: string | null;
  roomType: string;
  isActive: boolean;
}

export interface BuildingDetail extends Building {
  floors: Array<{ id: number; level: number; name: string; rooms: Room[] }>;
}

export interface RequestLocation {
  building: Building | null;
  floor: string | null;
  room: string | null;
  details: string | null;
  label: string;
}

export interface UserBrief {
  id: string;
  fullName: string;
  loginId: string;
}

export interface CurrentUser {
  id: string;
  loginId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  roles: string[];
  permissions: string[];
  hostel: HostelBrief | null;
  roomNumber: string | null;
  block: string | null;
  department: DepartmentBrief | null;
  /** Faculty or staff quarters on campus, and the house or flat number */
  residence?: ResidenceBrief | null;
  residenceUnit?: string | null;
}

export interface ResidenceBrief {
  id: number;
  code: string;
  name: string;
}

export interface LoginResult {
  user: CurrentUser;
  redirectTo: string;
  csrfToken: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ComplaintSummary {
  id: string;
  complaintNumber: string;
  title: string;
  category: string;
  status: ComplaintStatus;
  priority: Priority;
  hostel: HostelBrief | null;
  requester: UserBrief;
  /** Same person as `requester`; kept for pages written before faculty and staff could raise requests */
  student: UserBrief;
  location: RequestLocation;
  department: DepartmentBrief | null;
  assignedTo: string | null;
  isOverdue: boolean;
  expectedResolutionAt: string | null;
  /** Accepted or rejected by the caretaker, warden, supervisor or admin */
  decision: ComplaintDecision | null;
  decisionReason: string | null;
  decidedBy: UserBrief | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintDecision = "ACCEPTED" | "REJECTED";

export interface SimilarComplaint {
  id: string;
  complaintNumber: string;
  title: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  complaintId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

/** The same problem reported again and again (same place and category) */
export interface RecurringIssue {
  key: string;
  title: string;
  category: string;
  location: string;
  count: number;
  open: number;
  firstAt: string;
  latestAt: string;
  complaints: SimilarComplaint[];
}

export interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type AssignmentType = "WARDEN" | "CARETAKER" | "AUTHORITY" | "TECHNICIAN" | "ADMIN";
export type CommentVisibility = "INTERNAL" | "STUDENT_VISIBLE";

export type LabelColor = "slate" | "maroon" | "red" | "orange" | "amber" | "green" | "teal" | "blue" | "violet" | "pink";

export interface Label {
  id: number;
  name: string;
  color: LabelColor;
}

export type LinkType = "BLOCKS" | "DUPLICATES" | "RELATES_TO";
/** How a new link reads from the ticket it is added on */
export type LinkChoice = "BLOCKS" | "IS_BLOCKED_BY" | "DUPLICATES" | "IS_DUPLICATED_BY" | "RELATES_TO";

export interface TicketLink {
  id: number;
  linkType: LinkType;
  /** "blocks", "is blocked by", "duplicates", "is duplicated by" or "relates to" */
  label: string;
  outward: boolean;
  ticket: { id: string; complaintNumber: string; title: string; status: ComplaintStatus };
}

export type SubtaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface Subtask {
  id: number;
  title: string;
  status: SubtaskStatus;
  assignee: UserBrief | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  /** True when the signed-in user may change this sub-task's status */
  canUpdate: boolean;
}

export interface ComplaintDetail extends ComplaintSummary {
  description: string;
  resolvedAt: string | null;
  closedAt: string | null;
  attachments: Attachment[];
  allowedStatuses: ComplaintStatus[];
  /** True when the signed-in user may accept or reject this request now */
  canDecide: boolean;
  /** Earlier requests describing the same issue (staff only) */
  similar: SimilarComplaint[];
  /** Staff only: tags, linked tickets and the steps of the job */
  labels: Label[];
  links: TicketLink[];
  subtasks: Subtask[];
  /** True when the user may add or remove labels, links and sub-tasks */
  canOrganise: boolean;
  assignments: Array<{
    id: number;
    assignedTo: UserBrief;
    assignmentType: AssignmentType;
    remarks: string | null;
    isActive: boolean;
    assignedAt: string;
    unassignedAt: string | null;
  }>;
  history: Array<{
    id: number;
    oldStatus: ComplaintStatus | null;
    newStatus: ComplaintStatus;
    remarks: string | null;
    changedBy: UserBrief | null;
    createdAt: string;
  }>;
  comments: Array<{
    id: number;
    comment: string;
    visibility: CommentVisibility;
    author: UserBrief;
    createdAt: string;
  }>;
}

export interface StudentProfile {
  user: CurrentUser;
  summary: { total: number; active: number; resolved: number };
}

export interface Activity {
  complaintNumber: string;
  title: string;
  oldStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  remarks: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface AdminDashboard {
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    overdue: number;
  };
  byStatus: Record<string, number>;
  byHostel: Array<{ hostel: string; count: number }>;
  recentComplaints: ComplaintSummary[];
  pendingRequirements: number;
}

/** A GeoJSON Polygon or MultiPolygon geometry, in [longitude, latitude] pairs */
export type MapGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface MapBuilding {
  id: number;
  code: string;
  name: string;
  buildingType: BuildingType;
  hostel: HostelBrief | null;
  geometry: MapGeometry;
  /** Open requests in this building that the viewer is allowed to see */
  openRequests: number;
}

export interface CampusMap {
  name: string | null;
  boundary: MapGeometry | null;
  /** [minLng, minLat, maxLng, maxLat] */
  bounds: [number, number, number, number] | null;
  buildings: MapBuilding[];
}

export interface BuildingSummary {
  building: Building;
  pending: number;
  inProgress: number;
  resolved: number;
  recent: ComplaintSummary[];
}

export interface StaffDashboard {
  counts: {
    total: number;
    /** Not yet with a worker: submitted, under review or reopened */
    pending: number;
    assigned: number;
    /** In progress or escalated */
    inProgress: number;
    waitingForMaterials: number;
    waitingForInformation: number;
    resolved: number;
    overdue: number;
  };
  recent: ComplaintSummary[];
  hostel: { hostel: HostelBrief; students: number; activeIssues: number } | null;
}

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface AdminUser {
  id: string;
  loginId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  roles: string[];
  hostel: HostelBrief | null;
  roomNumber: string | null;
  block: string | null;
  department: DepartmentBrief | null;
  residence?: ResidenceBrief | null;
  residenceUnit?: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserInput {
  loginId?: string;
  password?: string;
  email?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  roles?: string[];
  hostelId?: number | null;
  roomNumber?: string | null;
  block?: string | null;
  departmentId?: number | null;
  residenceBuildingId?: number | null;
  residenceUnit?: string | null;
}

export interface AdminHostel {
  id: number;
  code: string;
  name: string;
  buildingId: number | null;
  capacity: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
  studentCount: number;
  openComplaints: number;
  wardens: UserBrief[];
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
}

export type RequirementStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";

export interface Requirement {
  id: string;
  requirementNumber: string;
  item: string;
  category: string | null;
  quantity: number;
  reason: string;
  status: RequirementStatus;
  hostel: HostelBrief | null;
  department: DepartmentBrief | null;
  complaintNumber: string | null;
  requestedBy: UserBrief;
  requestedByRole: string;
  decidedBy: UserBrief | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
  createdAt: string;
}

export interface RequirementCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  fulfilled: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface Report {
  days: number | null;
  total: number;
  open: number;
  resolved: number;
  escalated: number;
  overdue: number;
  avgResolutionHours: number | null;
  resolvedOnTimePercent: number | null;
  byStatus: NamedCount[];
  byCategory: NamedCount[];
  byHostel: NamedCount[];
  byDepartment: NamedCount[];
  byMonth: Array<{ month: string; raised: number; resolved: number }>;
}

export interface BoardCard extends ComplaintSummary {
  /** Statuses this user may drag the card to; empty when it must be accepted or rejected first */
  allowedMoves: ComplaintStatus[];
  needsDecision: boolean;
  labels: Label[];
  subtasks: { done: number; total: number } | null;
}

export interface BoardColumn {
  status: ComplaintStatus;
  title: string;
  statuses: ComplaintStatus[];
  total: number;
  cards: BoardCard[];
}

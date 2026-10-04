export type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_INFORMATION"
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
  student: UserBrief;
  assignedTo: string | null;
  isOverdue: boolean;
  expectedResolutionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  description: string;
  resolvedAt: string | null;
  closedAt: string | null;
  attachments: Attachment[];
  allowedStatuses: ComplaintStatus[];
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

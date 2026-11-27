import { api, apiPage } from "./client";
import type {
  Activity,
  AdminDashboard,
  AdminHostel,
  AdminUser,
  CommentVisibility,
  Department,
  Priority,
  Report,
  Requirement,
  RequirementCounts,
  RequirementStatus,
  UserInput,
  UserStatus,
  Building,
  BuildingDetail,
  BuildingSummary,
  CampusMap,
  Category,
  ComplaintDetail,
  ComplaintStatus,
  ComplaintSummary,
  CurrentUser,
  LoginResult,
  NotificationList,
  RecurringIssue,
  StaffDashboard,
  StudentProfile,
  BoardColumn,
  Label,
  LinkChoice,
  SubtaskStatus,
  UserBrief,
} from "./types";

export type Portal = "student" | "staff" | "admin";

export type StaffRole =
  | "warden"
  | "caretaker"
  | "technician"
  | "supervisor"
  | "department_head"
  | "store_manager"
  | "authority";

export const auth = {
  login: (body: {
    identifier: string;
    password: string;
    portal: Portal;
    staffRole?: StaffRole;
    rememberMe: boolean;
  }) => api<LoginResult>("/auth/login", { method: "POST", json: body }),

  logout: () => api<null>("/auth/logout", { method: "POST" }),

  me: () => api<CurrentUser>("/auth/me"),
};

export const student = {
  profile: () => api<StudentProfile>("/students/me"),

  complaints: (query: {
    search?: string;
    status?: ComplaintStatus | "";
    category?: string;
    page?: number;
    limit?: number;
  } = {}) => apiPage<ComplaintSummary>("/students/me/complaints", { query }),

  activity: (limit = 5) => api<Activity[]>("/students/me/activity", { query: { limit } }),
};

export const complaints = {
  categories: () => api<Category[]>("/categories"),

  /** Every request the signed-in user may see (own, hostel, department or assigned), newest first */
  list: (query: {
    search?: string;
    status?: ComplaintStatus | "";
    state?: "open" | "completed";
    page?: number;
    limit?: number;
  } = {}) => apiPage<ComplaintSummary>("/complaints", { query }),

  create: (form: FormData) =>
    api<ComplaintDetail>("/complaints", { method: "POST", form }),

  get: (id: string) => api<ComplaintDetail>(`/complaints/${id}`),

  /** Take a newly raised request on (caretaker, warden, supervisor, admin) */
  accept: (id: string, remarks?: string) =>
    api<ComplaintDetail>(`/complaints/${id}/accept`, { method: "POST", json: { remarks: remarks || undefined } }),

  /** Turn a request down; the requester sees the reason */
  reject: (id: string, reason: string) =>
    api<ComplaintDetail>(`/complaints/${id}/reject`, { method: "POST", json: { reason } }),

  /** Progress work: start, wait for materials or information, resolve, escalate */
  setStatus: (id: string, status: ComplaintStatus, remarks?: string) =>
    api<ComplaintDetail>(`/complaints/${id}/status`, { method: "POST", json: { status, remarks: remarks || undefined } }),
};

export const notifications = {
  list: (limit = 15) => api<NotificationList>("/notifications", { query: { limit } }),

  markRead: (id: number) => api<NotificationList>(`/notifications/${id}/read`, { method: "POST" }),

  markAllRead: () => api<NotificationList>("/notifications/read-all", { method: "POST" }),
};

export const staff = {
  dashboard: () => api<StaffDashboard>("/staff/me/dashboard"),

  /** Problems reported again and again within the signed-in user's hostel, department or (admins) campus */
  recurring: () => api<RecurringIssue[]>("/staff/me/recurring"),
};

export const locations = {
  buildings: () => api<Building[]>("/locations/buildings"),

  building: (id: number) => api<BuildingDetail>(`/locations/buildings/${id}`),

  map: () => api<CampusMap>("/map"),

  mapBuilding: (id: number) => api<BuildingSummary>(`/map/buildings/${id}`),
};

export const admin = {
  dashboard: () => api<AdminDashboard>("/admin/dashboard"),

  complaints: (query: {
    search?: string;
    status?: ComplaintStatus | "";
    category?: string;
    hostelId?: number | "";
    priority?: Priority | "";
    overdue?: boolean;
    page?: number;
    limit?: number;
  } = {}) => apiPage<ComplaintSummary>("/admin/complaints", { query }),

  complaint: (id: string) => api<ComplaintDetail>(`/admin/complaints/${id}`),

  updateComplaint: (
    id: string,
    body: {
      status?: ComplaintStatus;
      priority?: Priority;
      expectedResolutionAt?: string | null;
      remarks?: string;
      override?: boolean;
    },
  ) => api<ComplaintDetail>(`/admin/complaints/${id}`, { method: "PATCH", json: body }),

  assign: (id: string, assigneeId: string, remarks?: string, replace = false) =>
    api<ComplaintDetail>(`/admin/complaints/${id}/${replace ? "reassign" : "assign"}`, {
      method: "POST",
      json: { assigneeId, remarks: remarks || undefined },
    }),

  escalate: (id: string, reason: string) =>
    api<ComplaintDetail>(`/admin/complaints/${id}/escalate`, { method: "POST", json: { reason } }),

  comment: (id: string, comment: string, visibility: CommentVisibility) =>
    api<ComplaintDetail>(`/complaints/${id}/comments`, { method: "POST", json: { comment, visibility } }),

  staff: (query: { hostelId?: number; departmentId?: number } = {}) =>
    api<AdminUser[]>("/admin/staff", { query }),

  users: (query: {
    search?: string;
    role?: string;
    status?: UserStatus | "";
    hostelId?: number | "";
    departmentId?: number | "";
    page?: number;
    limit?: number;
  } = {}) => apiPage<AdminUser>("/admin/users", { query }),

  createUser: (body: UserInput) => api<AdminUser>("/admin/users", { method: "POST", json: body }),

  updateUser: (id: string, body: UserInput) => api<AdminUser>(`/admin/users/${id}`, { method: "PATCH", json: body }),

  setUserActive: (id: string, active: boolean) =>
    api<AdminUser>(`/admin/users/${id}/${active ? "activate" : "deactivate"}`, { method: "POST" }),

  resetPassword: (id: string, newPassword: string) =>
    api<AdminUser>(`/admin/users/${id}/reset-password`, { method: "POST", json: { newPassword } }),

  roles: () => api<string[]>("/admin/roles"),

  hostels: () => api<AdminHostel[]>("/admin/hostels"),

  createHostel: (body: { code: string; name: string; capacity?: number | null; contactPhone?: string | null; contactEmail?: string | null }) =>
    api<AdminHostel>("/admin/hostels", { method: "POST", json: body }),

  updateHostel: (
    id: number,
    body: { name?: string; capacity?: number | null; contactPhone?: string | null; contactEmail?: string | null; isActive?: boolean },
  ) => api<AdminHostel>(`/admin/hostels/${id}`, { method: "PATCH", json: body }),

  departments: () => api<Department[]>("/admin/departments"),

  reports: (days?: number) => api<Report>("/admin/reports", { query: { days } }),
};

export const board = {
  get: (query: { search?: string; category?: string; priority?: Priority | ""; assignee?: "me" | "unassigned" | ""; label?: string } = {}) =>
    api<{ columns: BoardColumn[] }>("/board", { query }),

  /** One ticket by key, e.g. CMP-2026-0001 */
  ticket: (key: string) => api<ComplaintDetail>(`/tickets/${encodeURIComponent(key)}`),

  /** The requester reopens their own resolved complaint */
  reopen: (id: string, reason: string) => api<ComplaintDetail>(`/complaints/${id}/reopen`, { method: "POST", json: { reason } }),

  labels: () => api<Label[]>("/labels"),
  addLabel: (id: string, name: string) => api<ComplaintDetail>(`/complaints/${id}/labels`, { method: "POST", json: { name } }),
  removeLabel: (id: string, labelId: number) => api<ComplaintDetail>(`/complaints/${id}/labels/${labelId}`, { method: "DELETE" }),

  addLink: (id: string, targetKey: string, linkType: LinkChoice) =>
    api<ComplaintDetail>(`/complaints/${id}/links`, { method: "POST", json: { targetKey, linkType } }),
  removeLink: (id: string, linkId: number) => api<ComplaintDetail>(`/complaints/${id}/links/${linkId}`, { method: "DELETE" }),

  subtaskAssignees: (id: string) => api<UserBrief[]>(`/complaints/${id}/subtask-assignees`),
  addSubtask: (id: string, title: string, assigneeId?: string) =>
    api<ComplaintDetail>(`/complaints/${id}/subtasks`, { method: "POST", json: { title, assigneeId: assigneeId || undefined } }),
  updateSubtask: (subtaskId: number, body: { title?: string; status?: SubtaskStatus; assigneeId?: string | null }) =>
    api<ComplaintDetail>(`/subtasks/${subtaskId}`, { method: "PATCH", json: body }),
  deleteSubtask: (subtaskId: number) => api<ComplaintDetail>(`/subtasks/${subtaskId}`, { method: "DELETE" }),
};

export const requirements = {
  list: (query: { search?: string; status?: RequirementStatus | ""; page?: number; limit?: number } = {}) =>
    apiPage<Requirement>("/requirements", { query }),

  summary: () => api<RequirementCounts>("/requirements/summary"),

  create: (body: { item: string; quantity: number; reason: string; categoryId?: number; complaintId?: string }) =>
    api<Requirement>("/requirements", { method: "POST", json: body }),

  decide: (id: string, decision: "APPROVED" | "REJECTED" | "FULFILLED", remarks?: string) =>
    api<Requirement>(`/requirements/${id}/decision`, { method: "POST", json: { decision, remarks: remarks || undefined } }),
};

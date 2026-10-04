import { api, apiPage } from "./client";
import type {
  Activity,
  AdminDashboard,
  Category,
  ComplaintDetail,
  ComplaintStatus,
  ComplaintSummary,
  CurrentUser,
  LoginResult,
  StudentProfile,
} from "./types";

export type Portal = "student" | "staff" | "admin";

export const auth = {
  login: (body: {
    identifier: string;
    password: string;
    portal: Portal;
    staffRole?: "warden" | "caretaker";
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

  create: (form: FormData) =>
    api<ComplaintDetail>("/complaints", { method: "POST", form }),
};

export const admin = {
  dashboard: () => api<AdminDashboard>("/admin/dashboard"),

  complaints: (query: {
    search?: string;
    status?: ComplaintStatus | "";
    page?: number;
    limit?: number;
  } = {}) => apiPage<ComplaintSummary>("/admin/complaints", { query }),
};

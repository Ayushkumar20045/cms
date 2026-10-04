/*
 * Single entry point for backend calls.
 *
 * - Requests go to /api/v1 on this origin (forwarded to the backend by next.config.ts).
 * - The session lives in HttpOnly cookies; JavaScript never sees the tokens.
 * - State-changing requests echo the readable CSRF cookie in the X-CSRF-Token header.
 * - An expired access token is refreshed once, transparently, before giving up.
 */

const API_BASE = "/api/v1";
const CSRF_COOKIE = "gbu_csrf";
const CSRF_HEADER = "X-CSRF-Token";

export interface FieldError {
  field: string | null;
  message: string;
}

export class ApiError extends Error {
  status: number;
  errors: FieldError[];

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  fieldError(field: string): string | undefined {
    return this.errors.find((error) => error.field === field)?.message;
  }
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return `${API_BASE}${path}${search ? `?${search}` : ""}`;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;

  if (options.form) {
    body = options.form;
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  if (method !== "GET") {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) {
      headers[CSRF_HEADER] = csrf;
    }
  }

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body,
    credentials: "same-origin",
    cache: "no-store",
  });
}

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  // Several requests may expire at once; they share one refresh call
  refreshing ??= send("/auth/refresh", { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function parse(response: Response): Promise<{ data?: unknown; pagination?: Pagination; message?: string; errors?: FieldError[] }> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: "The server returned an unexpected response." };
  }
}

async function request(path: string, options: RequestOptions = {}, retry = true) {
  let response: Response;

  try {
    response = await send(path, options);
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      return request(path, options, false);
    }
  }

  const payload = await parse(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.message ?? "Something went wrong. Please try again.",
      payload.errors ?? [],
    );
  }

  return payload;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await request(path, options);
  return payload.data as T;
}

export async function apiPage<T>(path: string, options: RequestOptions = {}): Promise<Paged<T>> {
  const payload = await request(path, options);
  return { data: payload.data as T[], pagination: payload.pagination as Pagination };
}

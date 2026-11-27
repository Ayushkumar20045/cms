"use client";

import { useRouter } from "next/navigation";
import { DependencyList, useCallback, useEffect, useState } from "react";

import { ApiError } from "./api/client";
import { auth } from "./api/endpoints";
import type { CurrentUser } from "./api/types";

type Area = "student" | "admin" | "warden" | "caretaker" | "board" | "any" | StaffPortalRole;

/** Campus staff roles served by the shared staff portal at /staff/<slug>/dashboard */
export type StaffPortalRole = "technician" | "supervisor" | "department-head" | "store" | "authority";

export const STAFF_PORTALS: Record<StaffPortalRole, { role: string; label: string }> = {
  "department-head": { role: "DEPARTMENT_HEAD", label: "Department Head" },
  supervisor: { role: "SUPERVISOR", label: "Supervisor" },
  store: { role: "STORE_MANAGER", label: "Store Manager" },
  technician: { role: "TECHNICIAN", label: "Technician" },
  authority: { role: "AUTHORITY", label: "Authority" },
};

// Faculty and non-teaching staff raise and track requests through the student pages
const REQUESTER_ROLES = ["STUDENT", "FACULTY", "STAFF"];
const isRequester = (user: CurrentUser) => user.roles.some((role) => REQUESTER_ROLES.includes(role));

// Same precedence as the backend's login redirect
export const homeFor = (user: CurrentUser): string => {
  const has = (role: string) => user.roles.includes(role);
  if (has("ADMIN") || has("SUPER_ADMIN")) return "/admin/dashboard";
  if (has("DEPARTMENT_HEAD")) return "/staff/department-head/dashboard";
  if (has("SUPERVISOR")) return "/staff/supervisor/dashboard";
  if (has("WARDEN")) return "/staff/warden/dashboard";
  if (has("STORE_MANAGER")) return "/staff/store/dashboard";
  if (has("TECHNICIAN")) return "/staff/technician/dashboard";
  if (has("CARETAKER")) return "/staff/caretaker/dashboard";
  if (has("AUTHORITY")) return "/staff/authority/dashboard";
  if (isRequester(user)) return "/student/dashboard";
  return "/";
};

const allowed: Record<Area, (user: CurrentUser) => boolean> = {
  student: isRequester,
  admin: (user) => user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN"),
  board: (user) => user.roles.some((role) => !REQUESTER_ROLES.includes(role)),
  any: () => true,
  warden: (user) => user.roles.includes("WARDEN"),
  caretaker: (user) => user.roles.includes("CARETAKER"),
  ...(Object.fromEntries(
    Object.entries(STAFF_PORTALS).map(([slug, portal]) => [slug, (user: CurrentUser) => user.roles.includes(portal.role)]),
  ) as Record<StaffPortalRole, (user: CurrentUser) => boolean>),
};

/**
 * Loads the signed-in user for a portal page. Signed-out visitors go to the login page and users of
 * another portal go to their own dashboard. This only shapes navigation: every API call is still
 * authorised by the backend.
 */
export function useSession(area: Area) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;

    auth
      .me()
      .then((me) => {
        if (!active) return;
        if (!allowed[area](me)) {
          router.replace(homeFor(me));
          return;
        }
        setUser(me);
      })
      .catch(() => {
        if (active) router.replace("/");
      });

    return () => {
      active = false;
    };
  }, [area, router]);

  const signOut = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      router.replace("/");
    }
  }, [router]);

  return { user, signOut };
}

/** Runs a loader when `deps` change and tracks loading and error state. */
export function useLoad<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // `loading` is true until the first result arrives; later reloads keep showing the previous
  // data until the new result replaces it, which avoids flicker while filters change.
  useEffect(() => {
    let active = true;

    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // A new notification (new complaint, decision, status change) means the data on screen may be stale
  useEffect(() => {
    window.addEventListener(NOTIFICATION_EVENT, reload);
    return () => window.removeEventListener(NOTIFICATION_EVENT, reload);
  }, [reload]);

  return { data, error, loading, reload };
}

/** Fired by the notification bell when new notifications arrive; open pages reload their data. */
export const NOTIFICATION_EVENT = "gbu:notifications";

"use client";

import { useRouter } from "next/navigation";
import { DependencyList, useCallback, useEffect, useState } from "react";

import { ApiError } from "./api/client";
import { auth } from "./api/endpoints";
import type { CurrentUser } from "./api/types";

type Area = "student" | "admin";

const homeFor = (user: CurrentUser): string => {
  if (user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) return "/admin/dashboard";
  if (user.roles.includes("WARDEN")) return "/staff/warden/dashboard";
  if (user.roles.includes("CARETAKER")) return "/staff/caretaker/dashboard";
  if (user.roles.includes("STUDENT")) return "/student/dashboard";
  return "/";
};

const allowed: Record<Area, (user: CurrentUser) => boolean> = {
  student: (user) => user.roles.includes("STUDENT"),
  admin: (user) => user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN"),
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

  return { data, error, loading, reload };
}

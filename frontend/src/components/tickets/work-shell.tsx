"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { UserMenu } from "@/components/student/user-menu";
import type { CurrentUser } from "@/lib/api/types";
import { homeFor } from "@/lib/session";

const REQUESTER_ROLES = ["STUDENT", "FACULTY", "STAFF"];

function roleLabel(user: CurrentUser | null) {
  if (!user) return "";
  const order = ["SUPER_ADMIN", "ADMIN", "DEPARTMENT_HEAD", "SUPERVISOR", "WARDEN", "STORE_MANAGER", "TECHNICIAN", "CARETAKER", "AUTHORITY", "FACULTY", "STAFF", "STUDENT"];
  const role = order.find((r) => user.roles.includes(r)) ?? user.roles[0] ?? "";
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Top bar for the ticket board and ticket pages, shared by every role. */
export function WorkShell({ user, onSignOut, children }: { user: CurrentUser | null; onSignOut: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const isStaff = Boolean(user?.roles.some((r) => !REQUESTER_ROLES.includes(r)));
  const home = user ? homeFor(user) : "/";
  const links = [
    { href: home, label: "Dashboard" },
    ...(isStaff ? [{ href: "/board", label: "Board" }] : [{ href: "/student/complaints", label: "My Complaints" }]),
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href={home} className="flex items-center gap-2.5" aria-label="Go to your dashboard">
            <img src="/images/gbu-logo.png" alt="" className="h-9 w-9 object-contain" />
            <span className="hidden text-sm font-bold text-slate-900 sm:block">GBU Smart Campus</span>
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {links.map((l) => {
              const active = pathname === l.href || (l.href === "/board" && pathname.startsWith("/tickets"));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-[#f8e9ef] text-[#8e123f]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu user={user} roleLabel={roleLabel(user)} onSignOut={onSignOut} />
        </div>
      </header>
      {user ? children : null}
    </div>
  );
}

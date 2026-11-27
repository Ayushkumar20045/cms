"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import type { CurrentUser } from "@/lib/api/types";
import { initials } from "@/lib/format";

const icon = (d: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
    {d}
  </svg>
);

const NAV_MAIN = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: icon(
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </>,
    ),
  },
  {
    label: "Complaints",
    href: "/admin/complaints",
    icon: icon(<path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M8 9h8 M8 13h5" strokeLinecap="round" strokeLinejoin="round" />),
  },
  {
    label: "Ticket Board",
    href: "/board",
    icon: icon(<path d="M4 5h4v14H4z M10 5h4v9h-4z M16 5h4v6h-4z" strokeLinejoin="round" />),
  },
  {
    label: "Requirements",
    href: "/admin/requirements",
    icon: icon(<path d="M8 4h8l3 3v13H5V4h3Z M8 10h8 M8 14h8 M8 18h5" strokeLinecap="round" strokeLinejoin="round" />),
  },
  {
    label: "Escalations",
    href: "/admin/escalations",
    icon: icon(<path d="M12 19V5 M6 11l6-6 6 6 M5 20h14" strokeLinecap="round" strokeLinejoin="round" />),
  },
];

const NAV_MANAGE = [
  {
    label: "Users",
    href: "/admin/users",
    icon: icon(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0 M16 11a3 3 0 1 0-1-5.8 M17 14.5a5 5 0 0 1 3.5 4.5" strokeLinecap="round" />
      </>,
    ),
  },
  {
    label: "Hostels",
    href: "/admin/hostels",
    icon: icon(<path d="M4 20V6l8-3 8 3v14 M9 20v-5h6v5 M8 9h1 M15 9h1 M8 12h1 M15 12h1" strokeLinecap="round" strokeLinejoin="round" />),
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: icon(<path d="M4 19V5 M4 19h16 M8 16v-4 M12 16V8 M16 16v-6" strokeLinecap="round" />),
  },
  {
    label: "Campus Map",
    href: "/admin/map",
    icon: icon(<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z M9 4v14 M15 6v14" strokeLinejoin="round" />),
  },
];

function NavLink({ item, active }: { item: (typeof NAV_MAIN)[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-[#f8e9ef] font-semibold text-[#8e123f]" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className={active ? "text-[#a5174d]" : "text-slate-400"}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

/** Sidebar, top bar and page frame shared by every administration page. */
export function AdminShell({
  title,
  section,
  user,
  onSignOut,
  children,
}: {
  title: string;
  section: string;
  user: CurrentUser | null;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const allNav = [...NAV_MAIN, ...NAV_MANAGE];

  return (
    <div className="flex min-h-screen bg-[#f7f7f8] text-slate-900">
      <aside className="hidden w-[248px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-[76px] items-center border-b border-slate-200 px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-3" aria-label="Admin dashboard">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src="/images/gbu-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">GBU CMS</p>
              <p className="text-[10px] font-medium text-slate-500">Administration Portal</p>
            </div>
          </Link>
        </div>

        <nav aria-label="Administration" className="flex-1 px-4 py-6">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Main</p>
          <div className="mt-3 space-y-1.5">
            {NAV_MAIN.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
          <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Management</p>
          <div className="mt-3 space-y-1.5">
            {NAV_MANAGE.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Access Level</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {user?.roles.includes("SUPER_ADMIN") ? "Super Administrator" : "Administrator"}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Administration / {section}</p>
            <h1 className="mt-0.5 truncate text-lg font-bold text-slate-900">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {user && <NotificationBell />}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.fullName ?? " "}</p>
              <p className="text-xs text-slate-500">Gautam Buddha University</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8e9ef] text-sm font-bold text-[#8e123f]">
              {user ? initials(user.fullName) : ""}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Compact navigation on small screens, where the sidebar is hidden */}
        <nav aria-label="Administration" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {allNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                isActive(item.href) ? "bg-[#f8e9ef] text-[#8e123f]" : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-5 sm:p-7">
          <div className="mx-auto max-w-[1500px]">{user ? children : null}</div>
        </main>
      </div>
    </div>
  );
}

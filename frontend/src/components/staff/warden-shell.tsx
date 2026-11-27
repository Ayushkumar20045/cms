"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { UserMenu } from "@/components/student/user-menu";
import type { CurrentUser } from "@/lib/api/types";

/* Sidebar, top bar and mobile menu shared by every warden page. */

export function SidebarIcon({
  type,
}: {
  type:
    | "dashboard"
    | "requirements"
    | "escalations"
    | "students"
    | "hostel"
    | "history";
}) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-4.5 w-4.5",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  if (type === "dashboard") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (type === "requirements") {
    return (
      <svg {...common}>
        <path
          d="M4.5 7.5h15v12h-15z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8v1.7M4.5 11h15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 15h4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "escalations") {
    return (
      <svg {...common}>
        <path
          d="m12 4 7 16H5L12 4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 9v4M12 16h.01" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "students") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path
          d="M5.5 20a6.5 6.5 0 0 1 13 0M4 6.5 12 3l8 3.5L12 10 4 6.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "hostel") {
    return (
      <svg {...common}>
        <path
          d="M4 20V6.5L12 3l8 3.5V20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 20v-5h8v5M8 9h2M14 9h2M8 12h2M14 12h2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M5 5h14v14H5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

const mainNavigation = [
  {
    label: "Dashboard",
    href: "/staff/warden/dashboard",
    icon: "dashboard" as const,
  },
  {
    label: "Complaints",
    href: "/staff/warden/complaints",
    icon: "history" as const,
  },
  {
    label: "Ticket Board",
    href: "/board",
    icon: "dashboard" as const,
  },
  {
    label: "Requirements",
    href: "/staff/warden/requirements",
    icon: "requirements" as const,
  },
  {
    label: "Escalations",
    href: "/staff/warden/escalations",
    icon: "escalations" as const,
  },
];

const managementNavigation = [
  {
    label: "Students",
    href: "/staff/warden/students",
    icon: "students" as const,
  },
  {
    label: "Hostel",
    href: "/staff/warden/hostel",
    icon: "hostel" as const,
  },
  {
    label: "Complaint History",
    href: "/staff/warden/history",
    icon: "history" as const,
  },
];

function Navigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      pathname === href ? "bg-[#f8e9ef] text-[#a5174d]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Main
      </p>

      <div className="space-y-1">
        {mainNavigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={linkClass(item.href)}
          >
            <SidebarIcon type={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <p className="px-3 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Management
      </p>

      <div className="space-y-1">
        {managementNavigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={linkClass(item.href)}
          >
            <SidebarIcon type={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function SidebarHeader({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-slate-100 ${
        mobile ? "h-20 px-5" : "h-20 px-6"
      }`}
    >
      <div
        className={`flex items-center justify-center overflow-hidden ${
          mobile ? "h-9 w-9" : "h-10 w-10"
        }`}
      >
        <img
          src="/images/gbu-logo.png"
          alt="GBU"
          className={mobile ? "h-full w-full object-contain" : "h-full w-full object-contain"}
        />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">GBU Portal</p>
        <p className="truncate text-xs text-slate-500">Hostel Services</p>
      </div>
    </div>
  );
}

function SignedInCard({ hostel }: { hostel: string | null }) {
  return (
    <div className="rounded-xl bg-[#fdf3f7] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5174d]">
        Signed in as
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">Warden</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {hostel ?? "No hostel assigned"}
      </p>
    </div>
  );
}

export function WardenShell({
  user,
  signOut,
  hostelName,
  title = "Warden Portal",
  children,
}: {
  user: CurrentUser | null;
  signOut: () => void;
  hostelName: string | null;
  title?: string;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <SidebarHeader />

          <div className="border-b border-slate-100 px-4 py-4">
            <SignedInCard hostel={hostelName} />
          </div>

          <Navigation />
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/30"
            />

            <aside className="relative flex h-full w-[280px] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100">
                <SidebarHeader mobile />

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation"
                  className="mr-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="px-3 pt-5">
                <SignedInCard hostel={hostelName} />
              </div>

              <Navigation
                mobile
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <MenuIcon />
              </button>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Hostel Services
                </p>
                <h1 className="text-sm font-bold text-slate-900">
                  {title}
                </h1>
              </div>
            </div>

            <UserMenu user={user} roleLabel="Warden" onSignOut={signOut} />
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { RecurringIssues } from "@/components/complaints/recurring-issues";
import { DecisionNote, RequestActions } from "@/components/complaints/request-actions";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { UserMenu } from "@/components/student/user-menu";
import { staff as staffApi } from "@/lib/api/endpoints";
import { useLoad, useSession } from "@/lib/session";
import { staffRow } from "@/lib/staff";

interface DashboardStat {
  label: string;
  value: number;
  description: string;
  icon: "complaints" | "pending" | "progress" | "resolved" | "overdue";
}

function StatIcon({ type }: { type: DashboardStat["icon"] }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-5 w-5",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  if (type === "complaints") {
    return (
      <svg {...common}>
        <path
          d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v9a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4.3A2.5 2.5 0 0 1 5 14.5v-9Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 8h6M9 11.5h4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path
          d="M12 7.5v5l3 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "progress") {
    return (
      <svg {...common}>
        <path
          d="M5 18.5 9.5 14l3 2.5L19 9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 9H19v4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "resolved") {
    return (
      <svg {...common}>
        <path
          d="M7 12.5 10.5 16 17 8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M12 3.5 19 6v5.2c0 4.4-2.8 7.9-7 9.3-4.2-1.4-7-4.9-7-9.3V6l7-2.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8v4M12 15.5h.01" strokeLinecap="round" />
    </svg>
  );
}

function SidebarIcon({
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
    active: true,
  },
  {
    label: "Ticket Board",
    href: "/board",
    icon: "dashboard" as const,
    active: false,
  },
  {
    label: "Requirements",
    href: "/staff/requirements",
    icon: "requirements" as const,
    active: false,
  },
  {
    label: "Escalations",
    href: "/staff/escalations",
    icon: "escalations" as const,
    active: false,
  },
];

const managementNavigation = [
  {
    label: "Students",
    href: "/staff/students",
    icon: "students" as const,
  },
  {
    label: "Hostel",
    href: "/staff/hostel",
    icon: "hostel" as const,
  },
  {
    label: "Complaint History",
    href: "/staff/history",
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              item.active
                ? "bg-[#f8e9ef] text-[#a5174d]"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
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
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
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

export default function WardenDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useSession("warden");
  const ready = Boolean(user);
  const dashboard = useLoad(() => (ready ? staffApi.dashboard() : Promise.resolve(null)), [ready]);
  const counts = dashboard.data?.counts;
  const overview = dashboard.data?.hostel ?? null;
  const hostelName = overview?.hostel.name ?? user?.hostel?.name ?? null;
  const visibleComplaints = (dashboard.data?.recent ?? []).map(staffRow);
  const stats: DashboardStat[] = [
    { label: "Total Complaints", value: counts?.total ?? 0, description: "All complaints for your hostel", icon: "complaints" },
    { label: "Pending", value: counts?.pending ?? 0, description: "Need review or assignment", icon: "pending" },
    {
      label: "In Progress",
      value: counts ? counts.assigned + counts.inProgress + counts.waitingForMaterials + counts.waitingForInformation : 0,
      description: "Currently being handled",
      icon: "progress",
    },
    { label: "Resolved", value: counts?.resolved ?? 0, description: "Resolved or closed", icon: "resolved" },
    { label: "Overdue", value: counts?.overdue ?? 0, description: "Past expected resolution", icon: "overdue" },
  ];

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
                  Warden Portal
                </h1>
              </div>
            </div>

            <UserMenu user={user} roleLabel="Warden" onSignOut={signOut} />
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
            <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-medium text-[#a5174d]">
                  Good morning
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Warden Portal
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Monitor and manage complaints and hostel services for your
                  assigned hostel.
                </p>
              </div>

              <Link
                href="/staff/complaints"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#a5174d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#8e123f]"
              >
                View Complaints
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {stat.value}
                      </p>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8e9ef] text-[#a5174d]">
                      <StatIcon type={stat.icon} />
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400">
                    {stat.description}
                  </p>
                </div>
              ))}
            </section>

            <RecurringIssues ready={ready} />

            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Recent Complaints
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Latest complaints requiring hostel-side attention.
                    </p>
                  </div>

                  <Link
                    href="/staff/complaints"
                    className="text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
                  >
                    View all
                  </Link>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Complaint
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Student
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Category
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Status
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Updated
                        </th>
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visibleComplaints.map((complaint) => (
                        <tr key={complaint.id}>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {complaint.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {complaint.complaintNumber}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {complaint.student}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {complaint.place}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.category}
                          </td>

                          <td className="px-5 py-4">
                            <StaffStatusBadge status={complaint.status} />
                            <DecisionNote complaint={complaint.raw} />
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            {complaint.updatedAt}
                          </td>

                          <td className="px-5 py-4">
                            <RequestActions complaint={complaint.raw} user={user} onChanged={dashboard.reload} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(dashboard.loading || dashboard.error || visibleComplaints.length === 0) && (
                  <p role={dashboard.error ? "alert" : undefined} className={`px-5 py-8 text-center text-sm ${dashboard.error ? "text-red-600" : "text-slate-500"}`}>
                    {dashboard.error ?? (dashboard.loading ? "Loading complaints…" : "No complaints for your hostel yet.")}
                  </p>
                )}

                <div className="divide-y divide-slate-100 md:hidden">
                  {visibleComplaints.map((complaint) => (
                    <div key={complaint.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {complaint.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {complaint.complaintNumber}
                          </p>
                        </div>

                        <StaffStatusBadge status={complaint.status} />
                      </div>

                      <DecisionNote complaint={complaint.raw} />

                      <div className="mt-3">
                        <RequestActions complaint={complaint.raw} user={user} onChanged={dashboard.reload} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">Student</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {complaint.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Location</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {complaint.place}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Category</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {complaint.category}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Updated</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {complaint.updatedAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900">
                    Quick Actions
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Common hostel tasks.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <Link
                      href="/staff/complaints"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-[#e9c5d3] hover:bg-[#fdf8fa]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Review Complaints
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Check complaints needing attention.
                        </p>
                      </div>
                      <span className="text-[#a5174d]" aria-hidden="true">
                        →
                      </span>
                    </Link>

                    <Link
                      href="/staff/requirements"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-[#e9c5d3] hover:bg-[#fdf8fa]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Raise Requirement
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Request hostel equipment or materials.
                        </p>
                      </div>
                      <span className="text-[#a5174d]" aria-hidden="true">
                        →
                      </span>
                    </Link>

                    <Link
                      href="/staff/escalations"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-[#e9c5d3] hover:bg-[#fdf8fa]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Escalations
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Review complaints requiring escalation.
                        </p>
                      </div>
                      <span className="text-[#a5174d]" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Hostel Overview
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Current assigned hostel.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8e9ef] text-[#a5174d]">
                      <SidebarIcon type="hostel" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400">Hostel</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {hostelName ?? "No hostel assigned"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Students</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {overview?.students ?? "–"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Active Issues</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {overview?.activeIssues ?? "–"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ead0db] bg-[#fdf7fa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a5174d]">
                    Warden responsibility
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Keep hostel complaints moving toward resolution.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Review pending complaints, coordinate hostel staff, monitor
                    expected resolution dates and escalate issues that require
                    higher-level intervention.
                  </p>
                </div>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
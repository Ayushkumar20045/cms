"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { admin } from "@/lib/api/endpoints";
import type { ComplaintStatus, ComplaintSummary } from "@/lib/api/types";
import { adminStatusLabel, formatDate, initials } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

type DisplayStatus = ComplaintStatus | "OVERDUE";

type Complaint = {
  key: string;
  id: string;
  student: string;
  hostel: string;
  category: string;
  status: DisplayStatus;
  assignedTo: string;
  date: string;
};

function toRow(complaint: ComplaintSummary): Complaint {
  return {
    key: complaint.id,
    id: complaint.complaintNumber,
    student: complaint.student.fullName,
    hostel: complaint.hostel?.name ?? "—",
    category: complaint.category,
    status: complaint.isOverdue ? "OVERDUE" : complaint.status,
    assignedTo: complaint.assignedTo ?? "Unassigned",
    date: formatDate(complaint.createdAt),
  };
}

type RequirementStatus =
  | "REQUESTED"
  | "UNDER REVIEW"
  | "APPROVED"
  | "FULFILLED";

type Requirement = {
  id: string;
  item: string;
  hostel: string;
  requestedBy: string;
  quantity: number;
  status: RequirementStatus;
  date: string;
};

// Requirement tickets are created by wardens and caretakers; that module is not connected yet,
// so this list stays empty and the section shows an empty state.
const requirements: Requirement[] = [];

const statusStyles: Record<DisplayStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-amber-50 text-amber-700",
  ASSIGNED: "bg-violet-50 text-violet-700",
  IN_PROGRESS: "bg-violet-50 text-violet-700",
  WAITING_FOR_INFORMATION: "bg-slate-100 text-slate-600",
  ESCALATED: "bg-rose-50 text-rose-700",
  REOPENED: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-600",
  DUPLICATE: "bg-slate-100 text-slate-600",
  OVERDUE: "bg-rose-50 text-rose-700",
};

const statusText = (status: DisplayStatus) =>
  status === "OVERDUE" ? "OVERDUE" : adminStatusLabel(status);

const requirementStyles: Record<RequirementStatus, string> = {
  REQUESTED: "bg-blue-50 text-blue-700",
  "UNDER REVIEW": "bg-amber-50 text-amber-700",
  APPROVED: "bg-violet-50 text-violet-700",
  FULFILLED: "bg-emerald-50 text-emerald-700",
};

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function ComplaintIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 4.5h14v11H9l-4 4v-15Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 11h4" strokeLinecap="round" />
    </svg>
  );
}

function RequirementIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M6 4.5h12v15H6z"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
    </svg>
  );
}

function EscalationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 19V5" strokeLinecap="round" />
      <path
        d="m7 10 5-5 5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path
        d="M15 5.5a3 3 0 0 1 0 5.8M16 14a5 5 0 0 1 4.5 5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HostelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 20V5h16v15" />
      <path d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h8" />
      <path d="M2.5 20h19" strokeLinecap="round" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 20V10M12 20V4M19 20v-7" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.2 4.2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 3.5 21 19H3l9-15.5Z"
        strokeLinejoin="round"
      />
      <path d="M12 9v4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r=".7" fill="currentColor" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path
        d="m7 15 3-4 3 2 5-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminSidebar() {
  const navigation = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <DashboardIcon />,
      active: true,
    },
    {
      label: "Complaints",
      href: "/admin/complaints",
      icon: <ComplaintIcon />,
    },
    {
      label: "Requirements",
      href: "/admin/requirements",
      icon: <RequirementIcon />,
    },
    {
      label: "Escalations",
      href: "/admin/escalations",
      icon: <EscalationIcon />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: <UsersIcon />,
    },
    {
      label: "Hostels",
      href: "/admin/hostels",
      icon: <HostelIcon />,
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: <ReportsIcon />,
    },
  ];

  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-[76px] items-center border-b border-slate-200 px-6">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="GBU Complaint Management System home"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#f8e9ef]">
            <img
              src="/images/gbu-logo.png"
              alt="GBU"
              className="h-8 w-8 object-contain"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">GBU CMS</p>
            <p className="text-[10px] font-medium text-slate-500">
              Administration Portal
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Main
        </p>

        <div className="mt-3 space-y-1.5">
          {navigation.slice(0, 4).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                item.active
                  ? "bg-[#f8e9ef] font-semibold text-[#8e123f]"
                  : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={item.active ? "text-[#a5174d]" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>

        <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Management
        </p>

        <div className="mt-3 space-y-1.5">
          {navigation.slice(4).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="text-slate-400">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Access Level
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            Full Administrator
          </p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Complete system management and oversight access.
          </p>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ name, onSignOut }: { name: string | null; onSignOut: () => void }) {
  return (
    <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-7">
      <div>
        <p className="text-xs font-medium text-slate-400">
          Administration / Overview
        </p>
        <h1 className="mt-0.5 text-lg font-bold text-slate-900">
          Admin Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">
            {name ?? " "}
          </p>
          <p className="text-xs text-slate-500">
            Gautam Buddha University
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8e9ef] text-sm font-bold text-[#8e123f]">
          {name ? initials(name) : ""}
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
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const dashboard = useLoad(
    () => (ready ? admin.dashboard() : Promise.resolve(null)),
    [ready],
  );
  // Searching goes to the server so it covers every complaint, not only the five on screen
  const searched = useLoad(
    () =>
      ready && query
        ? admin.complaints({ search: query, limit: 10 })
        : Promise.resolve(null),
    [ready, query],
  );

  const filteredComplaints: Complaint[] = (
    query ? searched.data?.data ?? [] : dashboard.data?.recentComplaints ?? []
  ).map(toRow);

  const counts = dashboard.data?.counts;
  const totalComplaints = counts?.total ?? 0;
  const pendingComplaints = counts?.pending ?? 0;
  const inProgressComplaints = counts?.inProgress ?? 0;
  const resolvedComplaints = counts?.resolved ?? 0;
  const overdueComplaints = counts?.overdue ?? 0;
  const pendingRequirements = dashboard.data?.pendingRequirements ?? 0;

  const byHostel = dashboard.data?.byHostel ?? [];
  const hostelRows: Array<[string, number]> = [
    ...byHostel.slice(0, 3).map((item): [string, number] => [item.hostel, item.count]),
    ...(byHostel.length > 3
      ? [["Other Hostels", byHostel.slice(3).reduce((sum, item) => sum + item.count, 0)] as [string, number]]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-[#f7f7f8]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <TopBar name={user?.fullName ?? null} onSignOut={signOut} />

        <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <section className="mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  System Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monitor complaints, hostel operations, requirements and
                  system activity from one place.
                </p>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="Total Complaints"
                value={String(totalComplaints)}
                subtitle="All registered complaints"
                icon={<ComplaintIcon />}
                iconClass="bg-[#f8e9ef] text-[#a5174d]"
              />

              <StatCard
                title="Pending"
                value={String(pendingComplaints)}
                subtitle="Awaiting action"
                icon={<AlertIcon />}
                iconClass="bg-amber-50 text-amber-600"
              />

              <StatCard
                title="In Progress"
                value={String(inProgressComplaints)}
                subtitle="Currently being handled"
                icon={<ChartIcon />}
                iconClass="bg-violet-50 text-violet-600"
              />

              <StatCard
                title="Resolved"
                value={String(resolvedComplaints)}
                subtitle="Successfully resolved"
                icon={<span className="text-lg">✓</span>}
                iconClass="bg-emerald-50 text-emerald-600"
              />

              <StatCard
                title="Overdue"
                value={String(overdueComplaints)}
                subtitle="Require attention"
                icon={<AlertIcon />}
                iconClass="bg-rose-50 text-rose-600"
              />
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Recent Complaints
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Latest complaints requiring monitoring or action.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <SearchIcon />
                      </span>

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search complaints..."
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-[#a5174d] focus:bg-white focus:ring-2 focus:ring-[#a5174d]/10"
                      />
                    </div>

                    <Link
                      href="/admin/complaints"
                      className="hidden h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:flex"
                    >
                      View All
                    </Link>
                  </div>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[850px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Complaint
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Student
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Hostel
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Category
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Assigned To
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredComplaints.map((complaint) => (
                        <tr
                          key={complaint.key}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {complaint.id}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {complaint.date}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {complaint.student}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.hostel}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.category}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[complaint.status]}`}
                            >
                              {statusText(complaint.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.assignedTo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredComplaints.map((complaint) => (
                    <article key={complaint.key} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {complaint.id}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {complaint.date}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[complaint.status]}`}
                        >
                          {statusText(complaint.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Student
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {complaint.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Category
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {complaint.category}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Hostel
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {complaint.hostel}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Assigned
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {complaint.assignedTo}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {(dashboard.error || searched.error) && (
                  <p role="alert" className="px-6 py-6 text-center text-xs text-rose-600">
                    {dashboard.error ?? searched.error}
                  </p>
                )}

                {filteredComplaints.length === 0 && !dashboard.loading && !searched.loading && (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No complaints found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {query ? "Try a different search term." : "Complaints raised by students will appear here."}
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-200 p-4 sm:hidden">
                  <Link
                    href="/admin/complaints"
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    View All Complaints
                  </Link>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-rose-200 bg-[#fff8fa] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <AlertIcon />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-500">
                        Attention Required
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        {overdueComplaints} overdue complaints
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        These complaints have passed their expected
                        resolution date and may require intervention.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/admin/escalations"
                    className="mt-4 flex h-10 items-center justify-center rounded-lg bg-[#a5174d] text-xs font-semibold text-white transition-colors hover:bg-[#8e123f]"
                  >
                    Review Escalations
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Requirements
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Requests awaiting admin action.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8e9ef] text-[#a5174d]">
                      <RequirementIcon />
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-slate-900">
                        {pendingRequirements}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Pending requests
                      </p>
                    </div>

                    <Link
                      href="/admin/requirements"
                      className="text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
                    >
                      Review →
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Complaint Overview
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Current complaint distribution
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <ChartIcon />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    ["Resolved", resolvedComplaints, "bg-emerald-500"],
                    ["In Progress", inProgressComplaints, "bg-violet-500"],
                    ["Pending", pendingComplaints, "bg-amber-500"],
                    ["Overdue", overdueComplaints, "bg-rose-500"],
                  ].map(([label, value, color]) => (
                    <div key={label as string}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">
                          {label}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {value}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{
                            width: `${totalComplaints ? Math.min(
                              100,
                              (Number(value) / totalComplaints) * 100,
                            ) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Hostel Operations
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      System-wide hostel management
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <HostelIcon />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {hostelRows.length === 0 && (
                    <p className="text-xs text-slate-400">No complaints recorded yet.</p>
                  )}
                  {hostelRows.map(([hostel, count]) => (
                    <div
                      key={hostel as string}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <span className="text-xs font-medium text-slate-600">
                        {hostel}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/admin/hostels"
                  className="mt-4 block text-center text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
                >
                  Manage Hostels →
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Quick Management
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Administrative controls
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <UsersIcon />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href="/admin/users"
                    className="rounded-xl border border-slate-200 p-3 transition-colors hover:border-[#e6c4d2] hover:bg-[#fdf7f9]"
                  >
                    <UsersIcon />
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      Manage Users
                    </p>
                  </Link>

                  <Link
                    href="/admin/hostels"
                    className="rounded-xl border border-slate-200 p-3 transition-colors hover:border-[#e6c4d2] hover:bg-[#fdf7f9]"
                  >
                    <HostelIcon />
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      Manage Hostels
                    </p>
                  </Link>

                  <Link
                    href="/admin/reports"
                    className="rounded-xl border border-slate-200 p-3 transition-colors hover:border-[#e6c4d2] hover:bg-[#fdf7f9]"
                  >
                    <ReportsIcon />
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      View Reports
                    </p>
                  </Link>

                  <Link
                    href="/admin/escalations"
                    className="rounded-xl border border-slate-200 p-3 transition-colors hover:border-[#e6c4d2] hover:bg-[#fdf7f9]"
                  >
                    <EscalationIcon />
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      Escalations
                    </p>
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Recent Requirement Requests
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Hostel resource requests requiring monitoring.
                  </p>
                </div>

                <Link
                  href="/admin/requirements"
                  className="text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
                >
                  View All →
                </Link>
              </div>

              {requirements.length === 0 && (
                <p className="px-5 py-10 text-center text-xs text-slate-400">
                  Requirement requests from wardens and caretakers will appear here once
                  the hostel staff module is connected.
                </p>
              )}

              <div className={requirements.length ? "hidden overflow-x-auto md:block" : "hidden"}>
                <table className="w-full min-w-[750px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Request
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Hostel
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Requested By
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Quantity
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {requirements.map((requirement) => (
                      <tr
                        key={requirement.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {requirement.item}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {requirement.id} · {requirement.date}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {requirement.hostel}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {requirement.requestedBy}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {requirement.quantity}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${requirementStyles[requirement.status]}`}
                          >
                            {requirement.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {requirements.map((requirement) => (
                  <article key={requirement.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {requirement.item}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {requirement.id}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${requirementStyles[requirement.status]}`}
                      >
                        {requirement.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Hostel
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          {requirement.hostel}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Quantity
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {requirement.quantity}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Requested By
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          {requirement.requestedBy}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Date
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          {requirement.date}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-6 rounded-xl border border-[#ead2dc] bg-[#fdf7f9] px-4 py-3">
              <p className="text-xs leading-5 text-slate-600">
                <span className="font-semibold text-[#8e123f]">
                  Live data:
                </span>{" "}
                Complaint counts, recent complaints and hostel figures come
                from the backend. Requirement requests will appear once the
                Warden and Caretaker modules are connected.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
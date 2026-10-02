"use client";

import { useState } from "react";
import Link from "next/link";

type WorkStatus =
  | "ASSIGNED"
  | "IN PROGRESS"
  | "WAITING FOR MATERIALS"
  | "COMPLETED";

interface Assignment {
  id: string;
  title: string;
  student: string;
  room: string;
  category: string;
  status: WorkStatus;
  updatedAt: string;
}

interface DashboardStat {
  label: string;
  value: number;
  description: string;
  icon: "assigned" | "pending" | "progress" | "materials" | "completed";
}

const assignments: Assignment[] = [
  {
    id: "CMP-2026-0146",
    title: "Water leakage in bathroom",
    student: "Arjun Singh",
    room: "A-118",
    category: "Plumbing",
    status: "IN PROGRESS",
    updatedAt: "38 min ago",
  },
  {
    id: "CMP-2026-0139",
    title: "Broken study table",
    student: "Aditya Verma",
    room: "B-211",
    category: "Furniture",
    status: "WAITING FOR MATERIALS",
    updatedAt: "2 hrs ago",
  },
  {
    id: "CMP-2026-0137",
    title: "Door lock replacement",
    student: "Vikas Kumar",
    room: "A-307",
    category: "Maintenance",
    status: "ASSIGNED",
    updatedAt: "3 hrs ago",
  },
  {
    id: "CMP-2026-0134",
    title: "Tube light replacement",
    student: "Kunal Yadav",
    room: "A-102",
    category: "Electrical",
    status: "COMPLETED",
    updatedAt: "Yesterday",
  },
  {
    id: "CMP-2026-0129",
    title: "Window handle repair",
    student: "Rohit Singh",
    room: "B-104",
    category: "Maintenance",
    status: "COMPLETED",
    updatedAt: "Yesterday",
  },
];

const stats: DashboardStat[] = [
  {
    label: "My Assignments",
    value: 12,
    description: "Assigned to you",
    icon: "assigned",
  },
  {
    label: "Pending Work",
    value: 4,
    description: "Need attention",
    icon: "pending",
  },
  {
    label: "In Progress",
    value: 5,
    description: "Currently being handled",
    icon: "progress",
  },
  {
    label: "Waiting for Materials",
    value: 2,
    description: "Material required",
    icon: "materials",
  },
  {
    label: "Completed",
    value: 18,
    description: "This month",
    icon: "completed",
  },
];

function StatIcon({ type }: { type: DashboardStat["icon"] }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-5 w-5",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  if (type === "assigned") {
    return (
      <svg {...common}>
        <path
          d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
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

  if (type === "materials") {
    return (
      <svg {...common}>
        <path
          d="M4.5 7.5h15v12h-15z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8v1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 12h8M10 15h4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path
        d="m8.5 12 2.3 2.3 4.7-4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: WorkStatus }) {
  const styles: Record<WorkStatus, string> = {
    ASSIGNED: "bg-violet-50 text-violet-700 border-violet-200",
    "IN PROGRESS": "bg-sky-50 text-sky-700 border-sky-200",
    "WAITING FOR MATERIALS":
      "bg-orange-50 text-orange-700 border-orange-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function SidebarIcon({
  type,
}: {
  type: "dashboard" | "assignments" | "requirements" | "history";
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

  if (type === "assignments") {
    return (
      <svg {...common}>
        <path
          d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 8h8M8 12h5M8 16h3"
          strokeLinecap="round"
        />
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
          d="M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8v1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 13h4M12 11v4" strokeLinecap="round" />
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

function HostelIcon() {
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

const navigation = [
  {
    label: "Dashboard",
    href: "/staff/caretaker/dashboard",
    icon: "dashboard" as const,
    active: true,
  },
  {
    label: "My Assignments",
    href: "/staff/caretaker/assignments",
    icon: "assignments" as const,
    active: false,
  },
  {
    label: "Requirements",
    href: "/staff/requirements",
    icon: "requirements" as const,
    active: false,
  },
  {
    label: "Work History",
    href: "/staff/caretaker/history",
    icon: "history" as const,
    active: false,
  },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Main
      </p>

      <div className="space-y-1">
        {navigation.map((item) => (
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
        className={`flex items-center justify-center overflow-hidden bg-[#f8e9ef] ${
          mobile ? "h-9 w-9 rounded-lg" : "h-10 w-10 rounded-xl"
        }`}
      >
        <img
          src="/images/gbu-logo.png"
          alt="GBU"
          className={
            mobile ? "h-7 w-7 object-contain" : "h-8 w-8 object-contain"
          }
        />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">GBU Portal</p>
        <p className="truncate text-xs text-slate-500">Hostel Services</p>
      </div>
    </div>
  );
}

function SignedInCard() {
  return (
    <div className="rounded-xl bg-[#fdf3f7] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5174d]">
        Signed in as
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">Caretaker</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Gautam Buddha Boys Hostel
      </p>
    </div>
  );
}

export default function CaretakerDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleAssignments = assignments.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <SidebarHeader />

          <div className="border-b border-slate-100 px-4 py-4">
            <SignedInCard />
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
                <SignedInCard />
              </div>

              <Navigation onNavigate={() => setMobileMenuOpen(false)} />
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
                  Caretaker Portal
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-slate-800">
                  Amit Kumar
                </p>
                <p className="text-[10px] text-slate-500">Caretaker</p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e9ef] text-xs font-bold text-[#a5174d]">
                AK
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
            <section className="mb-7">
              <p className="text-xs font-medium text-[#a5174d]">
                Good morning
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Caretaker Portal
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Manage your assigned hostel work and keep maintenance tasks
                moving toward completion.
              </p>
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

            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Recent Assigned Work
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Latest maintenance and hostel tasks assigned to you.
                    </p>
                  </div>

                  <Link
                    href="/staff/caretaker/assignments"
                    className="text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
                  >
                    View all
                  </Link>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Assignment
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
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visibleAssignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {assignment.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {assignment.id}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {assignment.student}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Room {assignment.room}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {assignment.category}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={assignment.status} />
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            {assignment.updatedAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {visibleAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {assignment.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {assignment.id}
                          </p>
                        </div>

                        <StatusBadge status={assignment.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">Student</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {assignment.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Room</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {assignment.room}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Category</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {assignment.category}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Updated</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {assignment.updatedAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Hostel Overview
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Your assigned hostel.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8e9ef] text-[#a5174d]">
                      <HostelIcon />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400">Hostel</p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        Gautam Buddha Boys Hostel
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Students</p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          312
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">My Open Work</p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          11
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ead0db] bg-[#fdf7fa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a5174d]">
                    Caretaker responsibility
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Complete assigned hostel work and keep progress updated.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Handle maintenance tasks, update work progress, report
                    material requirements and mark completed work for review.
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
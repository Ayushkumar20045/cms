"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/student/status-badge";
import { UserMenu } from "@/components/student/user-menu";
import { student } from "@/lib/api/endpoints";
import type { ComplaintStatus } from "@/lib/api/types";
import { formatDate, studentStatusLabel, timeAgo } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

const activityDot: Partial<Record<ComplaintStatus, string>> = {
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-emerald-500",
  UNDER_REVIEW: "bg-blue-500",
  SUBMITTED: "bg-blue-500",
};

function NavigationIcon({ type }: { type: "dashboard" | "complaints" }) {
  if (type === "dashboard") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-[18px] w-[18px]"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 9.5h9M7.5 12.5h6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function activityText(complaintNumber: string, status: ComplaintStatus): string {
  switch (status) {
    case "SUBMITTED":
      return `Complaint ${complaintNumber} was submitted.`;
    case "UNDER_REVIEW":
      return `Review started for ${complaintNumber}.`;
    case "WAITING_FOR_INFORMATION":
      return `More information is needed for ${complaintNumber}.`;
    case "RESOLVED":
      return `Complaint ${complaintNumber} was resolved.`;
    case "REOPENED":
      return `Complaint ${complaintNumber} was reopened.`;
    default:
      return `Complaint ${complaintNumber} is now ${studentStatusLabel[status].toLowerCase()}.`;
  }
}

function StatIcon({
  type,
}: {
  type: "total" | "active" | "resolved";
}) {
  if (type === "total") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path
          d="M6 4.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"
          strokeLinecap="round"
        />
        <path
          d="M8 9h8M8 12.5h8M8 16h5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "active") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path
          d="M12 7.5v5l3 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="m7 12 3.2 3.2L17.5 8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}

export default function StudentDashboard() {
  const { user, signOut } = useSession("student");
  const ready = Boolean(user);

  const profile = useLoad(() => (ready ? student.profile() : Promise.resolve(null)), [ready]);
  const recent = useLoad(
    () => (ready ? student.complaints({ limit: 4 }) : Promise.resolve(null)),
    [ready],
  );
  const activity = useLoad(
    () => (ready ? student.activity(3) : Promise.resolve(null)),
    [ready],
  );

  const summary = profile.data?.summary;
  const complaints = recent.data?.data ?? [];
  const hostelUser = profile.data?.user ?? user;

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-[76px] items-center border-b border-slate-100 px-5">
            <Link
              href="/student/dashboard"
              className="flex items-center gap-3"
              aria-label="Student dashboard"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img
                  src="/images/gbu-logo.png"
                  alt="Gautam Buddha University"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-900">
                  GBU
                </p>
                <p className="text-[10px] text-slate-400">
                  Student Portal
                </p>
              </div>
            </Link>
          </div>

          <nav
            aria-label="Student navigation"
            className="flex-1 px-3 py-5"
          >
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Main Menu
            </p>

            <div className="space-y-1">
              <Link
                href="/student/dashboard"
                className="flex w-full items-center gap-3 rounded-lg bg-[#a5174d]/8 px-3 py-2.5 text-sm font-medium text-[#a5174d]"
              >
                <NavigationIcon type="dashboard" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/student/complaints"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <NavigationIcon type="complaints" />
                <span>My Complaints</span>
              </Link>
            </div>
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Student Portal
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
                Dashboard
              </h1>
            </div>

            <UserMenu user={user} roleLabel="Student" onSignOut={signOut} />
          </header>

          <div className="mx-auto max-w-[1350px] px-5 py-7 sm:px-8">
            <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#a5174d]">
                  {user ? `Welcome back, ${user.firstName}` : " "}
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  Here's your complaint overview.
                </h2>

                <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                  Track your complaints, check updates and raise a new
                  concern whenever you need assistance.
                </p>
              </div>

              <Link
                href="/student/complaints/new"
                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-[#a5174d] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#8e123f] sm:self-auto"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeLinecap="round"
                  />
                </svg>
                Raise Complaint
              </Link>
            </section>

            <section
              aria-label="Complaint statistics"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Total Complaints
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {summary?.total ?? "–"}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <StatIcon type="total" />
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  All complaints submitted
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Active Complaints
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {summary?.active ?? "–"}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <StatIcon type="active" />
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  Currently being processed
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:col-span-2 xl:col-span-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Resolved
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {summary?.resolved ?? "–"}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <StatIcon type="resolved" />
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  Successfully resolved
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recent Complaints
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Your latest submitted complaints
                  </p>
                </div>

                <Link
                  href="/student/complaints"
                  className="self-start text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
                >
                  View all complaints →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Complaint
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Category
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Submitted
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {complaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="max-w-[300px] truncate text-sm font-medium text-slate-800">
                              {complaint.title}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {complaint.complaintNumber}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {complaint.category}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={complaint.status} />
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatDate(complaint.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!recent.loading && complaints.length === 0 && !recent.error && (
                  <p className="px-5 py-10 text-center text-xs text-slate-400">
                    You have not raised any complaints yet.
                  </p>
                )}

                {recent.error && (
                  <p role="alert" className="px-5 py-10 text-center text-xs text-rose-600">
                    {recent.error}
                  </p>
                )}
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Complaint Activity
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Latest updates on your complaints
                  </p>
                </div>

                <div className="mt-5 space-y-5">
                  {(activity.data ?? []).map((item) => (
                    <div
                      key={`${item.complaintNumber}-${item.createdAt}-${item.newStatus}`}
                      className="flex gap-3"
                    >
                      <div
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          activityDot[item.newStatus] ?? "bg-[#a5174d]"
                        }`}
                      />

                      <div>
                        <p className="text-xs font-medium text-slate-700">
                          {activityText(item.complaintNumber, item.newStatus)}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {timeAgo(item.createdAt)}
                          {item.actorRole ? ` · ${item.actorRole}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}

                  {!activity.loading && (activity.data ?? []).length === 0 && (
                    <p className="text-xs text-slate-400">
                      Updates on your complaints will appear here.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Your Hostel
                </h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  Information from university records
                </p>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Hostel
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {hostelUser?.hostel?.name ?? "Not allocated"}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400">Room</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {hostelUser?.roomNumber ?? "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400">Block</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {hostelUser?.block ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-4 text-slate-400">
                  Hostel information is managed through the university
                  allocation system.
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
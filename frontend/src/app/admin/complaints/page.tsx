"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER REVIEW"
  | "IN PROGRESS"
  | "WAITING FOR INFORMATION"
  | "RESOLVED"
  | "ESCALATED";

type Complaint = {
  id: string;
  student: string;
  hostel: string;
  room: string;
  category: string;
  title: string;
  assignedTo: string;
  status: ComplaintStatus;
  date: string;
};

const complaints: Complaint[] = [
  {
    id: "CMP-2026-0148",
    student: "Arjun Singh",
    hostel: "Boys Hostel A",
    room: "A-118",
    category: "Plumbing",
    title: "Water leakage in bathroom",
    assignedTo: "Rakesh Kumar",
    status: "IN PROGRESS",
    date: "04 Oct 2026",
  },
  {
    id: "CMP-2026-0147",
    student: "Aditya Verma",
    hostel: "Boys Hostel B",
    room: "B-211",
    category: "Furniture",
    title: "Broken study table",
    assignedTo: "Vikas Sharma",
    status: "WAITING FOR INFORMATION",
    date: "04 Oct 2026",
  },
  {
    id: "CMP-2026-0146",
    student: "Vikas Kumar",
    hostel: "Boys Hostel A",
    room: "A-307",
    category: "Maintenance",
    title: "Door lock replacement",
    assignedTo: "Amit Kumar",
    status: "UNDER REVIEW",
    date: "03 Oct 2026",
  },
  {
    id: "CMP-2026-0145",
    student: "Kunal Yadav",
    hostel: "Boys Hostel A",
    room: "A-102",
    category: "Electrical",
    title: "Tube light not working",
    assignedTo: "Sanjay Kumar",
    status: "RESOLVED",
    date: "03 Oct 2026",
  },
  {
    id: "CMP-2026-0144",
    student: "Rohit Singh",
    hostel: "Boys Hostel B",
    room: "B-104",
    category: "Maintenance",
    title: "Window handle damaged",
    assignedTo: "Rakesh Kumar",
    status: "SUBMITTED",
    date: "02 Oct 2026",
  },
  {
    id: "CMP-2026-0143",
    student: "Mohit Kumar",
    hostel: "Boys Hostel B",
    room: "B-306",
    category: "Plumbing",
    title: "Washroom tap replacement",
    assignedTo: "Amit Kumar",
    status: "ESCALATED",
    date: "02 Oct 2026",
  },
  {
    id: "CMP-2026-0142",
    student: "Rahul Sharma",
    hostel: "Boys Hostel A",
    room: "A-214",
    category: "Cleaning",
    title: "Washroom cleaning issue",
    assignedTo: "Hostel Staff",
    status: "IN PROGRESS",
    date: "01 Oct 2026",
  },
  {
    id: "CMP-2026-0141",
    student: "Aman Gupta",
    hostel: "Boys Hostel B",
    room: "B-118",
    category: "Electrical",
    title: "Ceiling fan not working",
    assignedTo: "Sanjay Kumar",
    status: "RESOLVED",
    date: "01 Oct 2026",
  },
];

const statusStyles: Record<ComplaintStatus, string> = {
  SUBMITTED: "bg-slate-100 text-slate-600",
  "UNDER REVIEW": "bg-amber-50 text-amber-700",
  "IN PROGRESS": "bg-violet-50 text-violet-700",
  "WAITING FOR INFORMATION": "bg-orange-50 text-orange-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  ESCALATED: "bg-rose-50 text-rose-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
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
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v8A2.5 2.5 0 0 1 16.5 16H11l-4.5 4v-4.25A2.5 2.5 0 0 1 5 13.25v-7.75Z"
        strokeLinejoin="round"
      />
      <path d="M8.5 8h7M8.5 11h5" strokeLinecap="round" />
    </svg>
  );
}

function RequirementIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5v-9Z"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}

function EscalationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 4v10M8 8l4-4 4 4M6 19h12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
      <path
        d="M15 5.5a3 3 0 0 1 0 5.9M17 14a5 5 0 0 1 3.5 4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HostelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 20V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v15M2 20h20"
        strokeLinecap="round"
      />
      <path d="M8 8h3M8 12h3M14 8h3M14 12h3M9 20v-4h6v4" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
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
    },
    {
      label: "Complaints",
      href: "/admin/complaints",
      icon: <ComplaintIcon />,
      active: true,
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
            <p className="text-[10px] font-medium text-slate-400">
              Administration
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Main
        </p>

        <div className="mt-3 space-y-1.5">
          {navigation.slice(0, 4).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-[#f8e9ef] text-[#a5174d]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={
                  item.active ? "text-[#a5174d]" : "text-slate-400"
                }
              >
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

function TopBar() {
  const name = "Admin";

  return (
    <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-7">
      <div>
        <p className="text-xs font-medium text-slate-400">
          Administration / Complaints
        </p>
        <h1 className="mt-0.5 text-lg font-bold text-slate-900">
          Complaint Management
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          <p className="text-xs text-slate-500">Gautam Buddha University</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8e9ef] text-sm font-bold text-[#8e123f]">
          {initials(name)}
        </div>

        <button
          type="button"
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
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");

  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(complaints.map((item) => item.category)))],
    [],
  );

  const filteredComplaints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesSearch =
        !normalizedQuery ||
        complaint.id.toLowerCase().includes(normalizedQuery) ||
        complaint.student.toLowerCase().includes(normalizedQuery) ||
        complaint.title.toLowerCase().includes(normalizedQuery) ||
        complaint.hostel.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        status === "ALL" || complaint.status === status;

      const matchesCategory =
        category === "ALL" || complaint.category === category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [query, status, category]);

  const total = complaints.length;
  const pending = complaints.filter(
    (item) =>
      item.status === "SUBMITTED" || item.status === "UNDER REVIEW",
  ).length;
  const inProgress = complaints.filter(
    (item) =>
      item.status === "IN PROGRESS" ||
      item.status === "WAITING FOR INFORMATION",
  ).length;
  const resolved = complaints.filter(
    (item) => item.status === "RESOLVED",
  ).length;
  const escalated = complaints.filter(
    (item) => item.status === "ESCALATED",
  ).length;

  return (
    <div className="flex min-h-screen bg-[#f7f7f8] text-slate-900">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="flex-1 p-5 sm:p-7">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  All Complaints
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monitor, review and manage complaints submitted by students.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="Total Complaints"
                value={String(total)}
                subtitle="All registered complaints"
              />
              <StatCard
                title="Pending"
                value={String(pending)}
                subtitle="Awaiting review"
              />
              <StatCard
                title="In Progress"
                value={String(inProgress)}
                subtitle="Currently being handled"
              />
              <StatCard
                title="Resolved"
                value={String(resolved)}
                subtitle="Successfully resolved"
              />
              <StatCard
                title="Escalated"
                value={String(escalated)}
                subtitle="Require intervention"
              />
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Complaint Records
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {filteredComplaints.length} complaint
                      {filteredComplaints.length === 1 ? "" : "s"} shown
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="11" cy="11" r="6.5" />
                        <path d="m16 16 4 4" strokeLinecap="round" />
                      </svg>

                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search complaints..."
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#a5174d] focus:ring-2 focus:ring-[#a5174d]/10 sm:w-[230px]"
                      />
                    </div>

                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-[#a5174d] focus:ring-2 focus:ring-[#a5174d]/10"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER REVIEW">Under Review</option>
                      <option value="IN PROGRESS">In Progress</option>
                      <option value="WAITING FOR INFORMATION">
                        Waiting for Information
                      </option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="ESCALATED">Escalated</option>
                    </select>

                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-[#a5174d] focus:ring-2 focus:ring-[#a5174d]/10"
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item === "ALL" ? "All Categories" : item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Complaint
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Hostel
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredComplaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-[#a5174d]">
                            {complaint.id}
                          </p>
                          <p className="mt-1 max-w-[230px] text-xs font-semibold text-slate-800">
                            {complaint.title}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-semibold text-slate-800">
                            {complaint.student}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs font-medium text-slate-700">
                            {complaint.hostel}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Room {complaint.room}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {complaint.category}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {complaint.assignedTo}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[complaint.status]}`}
                          >
                            {complaint.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-500">
                          {complaint.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredComplaints.map((complaint) => (
                  <div key={complaint.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#a5174d]">
                          {complaint.id}
                        </p>
                        <h4 className="mt-1 text-sm font-bold text-slate-900">
                          {complaint.title}
                        </h4>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${statusStyles[complaint.status]}`}
                      >
                        {complaint.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Student
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {complaint.student}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Category
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {complaint.category}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Hostel
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {complaint.hostel} · {complaint.room}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Assigned To
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {complaint.assignedTo}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-[11px] text-slate-400">
                        {complaint.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredComplaints.length === 0 && (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No complaints found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try changing your search or filters.
                  </p>
                </div>
              )}
            </section>

            <div className="mt-5 rounded-xl border border-[#ead2dc] bg-[#fff8fa] px-4 py-3">
              <p className="text-xs leading-5 text-slate-600">
                <span className="font-bold text-[#a5174d]">Demo data:</span>{" "}
                Complaint records are currently displayed using frontend mock
                data. These records will be replaced by backend API data when
                the complaint management service is connected.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
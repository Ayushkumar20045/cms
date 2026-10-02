"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ComplaintStatus =
  | "In Progress"
  | "Under Review"
  | "Resolved"
  | "Waiting";

interface Complaint {
  id: string;
  title: string;
  category: string;
  status: ComplaintStatus;
  submitted: string;
  updated: string;
}

const complaints: Complaint[] = [
  {
    id: "CMP-2026-0148",
    title: "Water leakage in hostel washroom",
    category: "Maintenance",
    status: "In Progress",
    submitted: "02 Oct 2026",
    updated: "02 Oct 2026",
  },
  {
    id: "CMP-2026-0139",
    title: "Ceiling fan not working",
    category: "Electrical",
    status: "Under Review",
    submitted: "30 Sep 2026",
    updated: "01 Oct 2026",
  },
  {
    id: "CMP-2026-0117",
    title: "Hostel corridor light replacement",
    category: "Electrical",
    status: "Resolved",
    submitted: "25 Sep 2026",
    updated: "25 Sep 2026",
  },
  {
    id: "CMP-2026-0104",
    title: "Cleaning request for common area",
    category: "Cleanliness",
    status: "Waiting",
    submitted: "21 Sep 2026",
    updated: "23 Sep 2026",
  },
  {
    id: "CMP-2026-0098",
    title: "Water cooler not functioning",
    category: "Maintenance",
    status: "Resolved",
    submitted: "18 Sep 2026",
    updated: "20 Sep 2026",
  },
  {
    id: "CMP-2026-0089",
    title: "Bathroom tap replacement request",
    category: "Maintenance",
    status: "Resolved",
    submitted: "14 Sep 2026",
    updated: "16 Sep 2026",
  },
  {
    id: "CMP-2026-0075",
    title: "Hostel room tube light issue",
    category: "Electrical",
    status: "Resolved",
    submitted: "09 Sep 2026",
    updated: "10 Sep 2026",
  },
  {
    id: "CMP-2026-0068",
    title: "Common area cleanliness concern",
    category: "Cleanliness",
    status: "Resolved",
    submitted: "05 Sep 2026",
    updated: "06 Sep 2026",
  },
];

const categories = [
  "All Categories",
  "Maintenance",
  "Electrical",
  "Ethernet",
  "Cleanliness",
  "Civil",
];

const statuses = [
  "All Status",
  "In Progress",
  "Under Review",
  "Resolved",
  "Waiting",
];

function DashboardIcon() {
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

function ComplaintIcon() {
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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path
        d="m16 16 4 4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        d="M4 6h16M7 12h10M10 18h4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
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
        d="m6 9 6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const styles: Record<ComplaintStatus, string> = {
    "In Progress": "bg-amber-50 text-amber-700 ring-amber-600/10",
    "Under Review": "bg-blue-50 text-blue-700 ring-blue-600/10",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    Waiting: "bg-slate-100 text-slate-600 ring-slate-500/10",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <ComplaintIcon />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        No complaints found
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
        Try changing your search or filters to find the complaint you are
        looking for.
      </p>
    </div>
  );
}

export default function MyComplaintsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [category, setCategory] = useState("All Categories");

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesSearch =
        !query ||
        complaint.id.toLowerCase().includes(query) ||
        complaint.title.toLowerCase().includes(query) ||
        complaint.category.toLowerCase().includes(query);

      const matchesStatus =
        status === "All Status" || complaint.status === status;

      const matchesCategory =
        category === "All Categories" ||
        complaint.category === category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [search, status, category]);

  const hasFilters =
    Boolean(search.trim()) ||
    status !== "All Status" ||
    category !== "All Categories";

  function clearFilters() {
    setSearch("");
    setStatus("All Status");
    setCategory("All Categories");
  }

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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <DashboardIcon />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/student/complaints"
                className="flex w-full items-center gap-3 rounded-lg bg-[#a5174d]/8 px-3 py-2.5 text-sm font-medium text-[#a5174d]"
              >
                <ComplaintIcon />
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
                My Complaints
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a5174d]/10 text-xs font-bold text-[#a5174d]">
                AK
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">
                  Ayush Kumar
                </p>
                <p className="text-[10px] text-slate-400">
                  Student
                </p>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1350px] px-5 py-7 sm:px-8">
            <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#a5174d]">
                  Complaint History
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  Your complaints
                </h2>

                <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                  View, search and track all complaints submitted through the
                  university portal.
                </p>
              </div>

              <Link
                href="/student/complaints/new"
                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-[#a5174d] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#8e123f] sm:self-auto"
              >
                <span aria-hidden="true">+</span>
                Raise Complaint
              </Link>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative w-full xl:max-w-[430px]">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <SearchIcon />
                    </span>

                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by complaint ID, title or category"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        <FilterIcon />
                      </span>

                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-600 outline-none transition focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10 sm:w-[175px]"
                      >
                        {statuses.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        <ChevronDownIcon />
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-600 outline-none transition focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10 sm:w-[175px]"
                      >
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    Showing{" "}
                    <span className="font-semibold text-slate-600">
                      {filteredComplaints.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-600">
                      {complaints.length}
                    </span>{" "}
                    complaints
                  </p>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-[#a5174d] transition-colors hover:text-[#8e123f]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {filteredComplaints.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px]">
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
                          <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Last Updated
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredComplaints.map((complaint) => (
                          <tr
                            key={complaint.id}
                            className="transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-5 py-4">
                              <div className="min-w-0">
                                <p className="max-w-[310px] truncate text-sm font-medium text-slate-800">
                                  {complaint.title}
                                </p>

                                <p className="mt-1 text-[11px] text-slate-400">
                                  {complaint.id}
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
                              {complaint.submitted}
                            </td>

                            <td className="px-5 py-4 text-xs text-slate-500">
                              {complaint.updated}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredComplaints.map((complaint) => (
                      <article
                        key={complaint.id}
                        className="p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {complaint.title}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {complaint.id}
                            </p>
                          </div>

                          <StatusBadge status={complaint.status} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Category
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {complaint.category}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Submitted
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {complaint.submitted}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="text-[11px] text-slate-400">
                            Updated {complaint.updated}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
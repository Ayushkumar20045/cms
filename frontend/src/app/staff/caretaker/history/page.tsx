"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { UserMenu } from "@/components/student/user-menu";
import { complaints as complaintsApi } from "@/lib/api/endpoints";
import type { ComplaintSummary, CurrentUser } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";
import { staffRow } from "@/lib/staff";

interface WorkRecord {
  id: string;
  complaintId: string;
  requester: string;
  description: string;
  category: string;
  room: string;
  completedOn: string;
  completedAt: Date;
  material: string | null;
  quantity: number | null;
  materialCost: number | null;
  otherCost: number | null;
  totalCost: number | null;
  vendor: string | null;
  billNumber: string | null;
  remarks: string | null;
}

function toRecord(c: ComplaintSummary): WorkRecord {
  const row = staffRow(c);
  return {
    id: c.id,
    complaintId: c.complaintNumber,
    requester: row.student,
    description: c.title,
    category: c.category,
    room: row.place,
    completedOn: formatDate(c.updatedAt),
    completedAt: new Date(c.updatedAt),
    material: null,
    quantity: null,
    materialCost: null,
    otherCost: null,
    totalCost: null,
    vendor: null,
    billNumber: null,
    remarks: null,
  };
}

const NOT_RECORDED = "—";

function sumCosts(values: Array<number | null>) {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

function isSameMonth(date: Date, monthsAgo: number) {
  const ref = new Date();
  ref.setDate(1);
  ref.setMonth(ref.getMonth() - monthsAgo);
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function categoryIcon(category: string) {
  if (category === "Electrical") return "⚡";
  if (category === "Plumbing") return "⌁";
  if (category === "Furniture") return "▣";
  if (category === "Cleaning" || category === "Cleanliness") return "✦";
  return "🔧";
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" />
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

function FilterIcon() {
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
        d="M4 6h16M7 12h10M10 18h4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon() {
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
        d="M4 12a8 8 0 1 0 2.34-5.66"
        strokeLinecap="round"
      />
      <path
        d="M4 5v4h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8v4l2.8 1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8v.7" />
      <path d="M9 10h6M9 14h6M9 18h3.5" strokeLinecap="round" />
    </svg>
  );
}

function RupeeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 5h10M7 9h8" strokeLinecap="round" />
      <path
        d="M8 5c4.5 0 7 1.2 7 4s-2.5 4-7 4l7 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m5 12 4 4L19 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkHistorySidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-[76px] items-center border-b border-slate-200 px-6">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="GBU Complaint Management System home"
        >
          <div className="flex h-10 w-10 items-center justify-center">
            <img
              src="/images/gbu-logo.png"
              alt="GBU"
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">GBU CMS</p>
            <p className="text-[10px] font-medium text-slate-500">
              Hostel Staff Portal
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Main
        </p>

        <div className="mt-3 space-y-1.5">
          <Link
            href="/staff/caretaker/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Dashboard
          </Link>

          <Link
            href="/staff/caretaker/assignments"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            My Assignments
          </Link>

          <Link
            href="/board"
            className="h-2 w-2 rounded-full bg-slate-300"
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Ticket Board
          </Link>

          <Link
            href="/staff/caretaker/requirements"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Requirements
          </Link>

          <Link
            href="/staff/caretaker/history"
            className="flex items-center gap-3 rounded-xl bg-[#f8e9ef] px-3 py-2.5 text-sm font-semibold text-[#8e123f]"
          >
            <span className="h-2 w-2 rounded-full bg-[#a5174d]" />
            Work History
          </Link>
        </div>
      </nav>
    </aside>
  );
}

function TopBar({ user, onSignOut }: { user: CurrentUser | null; onSignOut: () => void }) {
  return (
    <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-7">
      <div>
        <p className="text-xs font-medium text-slate-400">
          Hostel Staff / Caretaker
        </p>
        <h1 className="mt-0.5 text-lg font-bold text-slate-900">
          Work History
        </h1>
      </div>

      <UserMenu user={user} roleLabel="Caretaker" onSignOut={onSignOut} />
    </header>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
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

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8e9ef] text-[#a5174d]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function CaretakerWorkHistoryPage() {
  const { user, signOut } = useSession("caretaker");
  const ready = Boolean(user);
  const completed = useLoad(
    () => (ready ? complaintsApi.list({ state: "completed", limit: 100 }) : Promise.resolve(null)),
    [ready],
  );
  const workRecords = useMemo(() => (completed.data?.data ?? []).map(toRecord), [completed.data]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(workRecords.map((r) => r.category))).sort()],
    [workRecords],
  );
  const hostelName = user?.hostel?.name ?? null;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workRecords.filter((record) => {
      const matchesSearch =
        !query ||
        record.id.toLowerCase().includes(query) ||
        record.complaintId.toLowerCase().includes(query) ||
        record.description.toLowerCase().includes(query) ||
        record.room.toLowerCase().includes(query);

      const matchesCategory =
        category === "All" || record.category === category;

      const matchesDate =
        dateFilter === "All Time" ||
        (dateFilter === "This Month" && isSameMonth(record.completedAt, 0)) ||
        (dateFilter === "Last Month" && isSameMonth(record.completedAt, 1));

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [workRecords, search, category, dateFilter]);

  const totalMaterialCost = sumCosts(workRecords.map((record) => record.materialCost));
  const totalExpenditure = sumCosts(workRecords.map((record) => record.totalCost));
  const thisMonthCount = workRecords.filter((record) => isSameMonth(record.completedAt, 0)).length;
  const thisMonthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="flex min-h-screen bg-[#f7f7f8]">
      <WorkHistorySidebar />

      <div className="min-w-0 flex-1">
        <TopBar user={user} onSignOut={signOut} />

        <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8e9ef] text-[#a5174d]">
                  <HistoryIcon />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Work History
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Completed maintenance and repair records for your
                    assigned hostel work.
                  </p>
                </div>
              </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total Completed Work"
                value={String(workRecords.length)}
                subtitle="All completed work records"
                icon={<ClipboardIcon />}
              />

              <SummaryCard
                title="This Month"
                value={String(thisMonthCount)}
                subtitle={`Completed in ${thisMonthName}`}
                icon={<CheckIcon />}
              />

              <SummaryCard
                title="Material Cost"
                value={totalMaterialCost === null ? NOT_RECORDED : formatCurrency(totalMaterialCost)}
                subtitle="Recorded once material logging is added"
                icon={<RupeeIcon />}
              />

              <SummaryCard
                title="Total Expenditure"
                value={totalExpenditure === null ? NOT_RECORDED : formatCurrency(totalExpenditure)}
                subtitle="Recorded once material logging is added"
                icon={<RupeeIcon />}
              />
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Completed Work Records
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Search and review previous maintenance work,
                      materials and expenses.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 sm:w-72">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <SearchIcon />
                      </span>

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search work, complaint or room..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#a5174d] focus:bg-white focus:ring-2 focus:ring-[#a5174d]/10"
                      />
                    </div>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <FilterIcon />
                      </span>

                      <select
                        value={category}
                        onChange={(event) =>
                          setCategory(
                            event.target.value as (typeof categories)[number],
                          )
                        }
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-[#a5174d] focus:bg-white focus:ring-2 focus:ring-[#a5174d]/10 sm:w-44"
                        aria-label="Filter by category"
                      >
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {item === "All" ? "All Categories" : item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <CalendarIcon />
                      </span>

                      <select
                        value={dateFilter}
                        onChange={(event) =>
                          setDateFilter(event.target.value)
                        }
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-[#a5174d] focus:bg-white focus:ring-2 focus:ring-[#a5174d]/10 sm:w-36"
                        aria-label="Filter by date"
                      >
                        <option>All Time</option>
                        <option>This Month</option>
                        <option>Last Month</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <SearchIcon />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-800">
                    {completed.loading ? "Loading work history…" : completed.error ? "Could not load work history" : "No work records found"}
                  </h3>

                  <p role={completed.error ? "alert" : undefined} className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                    {completed.error ??
                      (workRecords.length ? "Try changing your search or filter options." : "Completed work assigned to you will appear here.")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1050px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Work
                          </th>
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Description
                          </th>
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Category
                          </th>
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Room
                          </th>
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Completed
                          </th>
                          <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Cost
                          </th>
                          <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {record.complaintId}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {record.requester}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="max-w-[230px] text-sm font-medium text-slate-700">
                                {record.description}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {record.material ? `${record.material} · Qty ${record.quantity}` : "Materials not recorded"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                                <span aria-hidden="true">
                                  {categoryIcon(record.category)}
                                </span>
                                {record.category}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {record.room}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {record.completedOn}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <p className="text-sm font-semibold text-slate-800">
                                {record.totalCost === null ? NOT_RECORDED : formatCurrency(record.totalCost)}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {record.billNumber ? `Bill ${record.billNumber}` : "No bill recorded"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 lg:hidden">
                    {filteredRecords.map((record) => (
                      <article
                        key={record.id}
                        className="p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {record.complaintId}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {record.requester}
                            </p>
                          </div>

                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Completed
                          </span>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {record.description}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                              <span aria-hidden="true">
                                {categoryIcon(record.category)}
                              </span>
                              {record.category}
                            </span>

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                              {record.room}
                            </span>

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                              {record.completedOn}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Material
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              {record.material ?? "Not recorded"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {record.quantity === null ? "" : `Qty ${record.quantity}`}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Total Cost
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {record.totalCost === null ? NOT_RECORDED : formatCurrency(record.totalCost)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {record.billNumber ?? "No bill recorded"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Remarks
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {record.remarks ?? "No remarks recorded."}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e9ef] text-[#a5174d]">
                    <ClipboardIcon />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Record Keeping
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Maintain accurate records for completed hostel work.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Materials
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Record materials and quantities used during repairs.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Expenses
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Track actual expenditure against maintenance work.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Bills
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Store bill and receipt references for future records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ead2dc] bg-[#fdf7f9] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a5174d]">
                  Hostel
                </p>

                <h3 className="mt-2 text-base font-bold text-slate-900">
                  {hostelName ?? "No hostel assigned"}
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Completed work comes from your assigned requests. Material costs and bills
                  will appear once material logging is added.
                </p>

                <div className="mt-4 border-t border-[#ead2dc] pt-4">
                  <p className="text-[11px] font-medium text-slate-500">
                    Current recorded expenditure
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#8e123f]">
                    {totalExpenditure === null ? NOT_RECORDED : formatCurrency(totalExpenditure)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
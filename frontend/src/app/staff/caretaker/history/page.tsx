"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Category =
  | "Electrical"
  | "Plumbing"
  | "Maintenance"
  | "Furniture"
  | "Cleaning";

interface WorkRecord {
  id: string;
  complaintId: string;
  description: string;
  category: Category;
  room: string;
  completedOn: string;
  material: string;
  quantity: number;
  materialCost: number;
  otherCost: number;
  totalCost: number;
  vendor: string;
  billNumber: string;
  remarks: string;
}

const workRecords: WorkRecord[] = [
  {
    id: "WRK-2026-0024",
    complaintId: "CMP-2026-0134",
    description: "LED tube light replacement",
    category: "Electrical",
    room: "A-102",
    completedOn: "02 Oct 2026",
    material: "LED Tube Light",
    quantity: 1,
    materialCost: 420,
    otherCost: 0,
    totalCost: 420,
    vendor: "GBU Electrical Store",
    billNumber: "BILL-1024",
    remarks: "Old tube light replaced and tested successfully.",
  },
  {
    id: "WRK-2026-0023",
    complaintId: "CMP-2026-0125",
    description: "Washroom tap replacement",
    category: "Plumbing",
    room: "B-306",
    completedOn: "01 Oct 2026",
    material: "Brass Tap",
    quantity: 1,
    materialCost: 680,
    otherCost: 0,
    totalCost: 680,
    vendor: "GBU Maintenance Store",
    billNumber: "BILL-1021",
    remarks: "Damaged tap replaced and water leakage checked.",
  },
  {
    id: "WRK-2026-0022",
    complaintId: "CMP-2026-0119",
    description: "Door lock replacement",
    category: "Maintenance",
    room: "A-307",
    completedOn: "30 Sep 2026",
    material: "Heavy Duty Door Lock",
    quantity: 1,
    materialCost: 750,
    otherCost: 100,
    totalCost: 850,
    vendor: "GBU Hardware Store",
    billNumber: "BILL-1018",
    remarks: "Faulty lock replaced and door alignment checked.",
  },
  {
    id: "WRK-2026-0021",
    complaintId: "CMP-2026-0108",
    description: "Study table repair",
    category: "Furniture",
    room: "B-211",
    completedOn: "28 Sep 2026",
    material: "Wood Repair Kit",
    quantity: 1,
    materialCost: 250,
    otherCost: 100,
    totalCost: 350,
    vendor: "Hostel Workshop",
    billNumber: "INT-0094",
    remarks: "Damaged table leg repaired and reinforced.",
  },
  {
    id: "WRK-2026-0020",
    complaintId: "CMP-2026-0097",
    description: "Bathroom pipe replacement",
    category: "Plumbing",
    room: "A-118",
    completedOn: "25 Sep 2026",
    material: "PVC Water Pipe",
    quantity: 4,
    materialCost: 950,
    otherCost: 300,
    totalCost: 1250,
    vendor: "GBU Plumbing Store",
    billNumber: "BILL-1009",
    remarks: "Damaged pipe section replaced and pressure tested.",
  },
  {
    id: "WRK-2026-0019",
    complaintId: "CMP-2026-0089",
    description: "Window handle replacement",
    category: "Maintenance",
    room: "B-104",
    completedOn: "23 Sep 2026",
    material: "Window Handle",
    quantity: 2,
    materialCost: 280,
    otherCost: 0,
    totalCost: 280,
    vendor: "GBU Hardware Store",
    billNumber: "BILL-1005",
    remarks: "Two damaged handles replaced.",
  },
];

const categories: Array<"All" | Category> = [
  "All",
  "Electrical",
  "Plumbing",
  "Maintenance",
  "Furniture",
  "Cleaning",
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function categoryIcon(category: Category) {
  if (category === "Electrical") return "⚡";
  if (category === "Plumbing") return "⌁";
  if (category === "Furniture") return "▣";
  if (category === "Cleaning") return "✦";
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

function TopBar() {
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

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">
            Rahul Kumar
          </p>
          <p className="text-xs text-slate-500">
            Caretaker · Gautam Buddha Hostel
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8e9ef] text-sm font-bold text-[#8e123f]">
          RK
        </div>
      </div>
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
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("All");
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
        (dateFilter === "This Month" &&
          record.completedOn.includes("Oct 2026")) ||
        (dateFilter === "Last Month" &&
          record.completedOn.includes("Sep 2026"));

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [search, category, dateFilter]);

  const totalMaterialCost = workRecords.reduce(
    (sum, record) => sum + record.materialCost,
    0,
  );

  const totalExpenditure = workRecords.reduce(
    (sum, record) => sum + record.totalCost,
    0,
  );

  const thisMonthCount = workRecords.filter((record) =>
    record.completedOn.includes("Oct 2026"),
  ).length;

  return (
    <div className="flex min-h-screen bg-[#f7f7f8]">
      <WorkHistorySidebar />

      <div className="min-w-0 flex-1">
        <TopBar />

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
                subtitle="Completed in October 2026"
                icon={<CheckIcon />}
              />

              <SummaryCard
                title="Material Cost"
                value={formatCurrency(totalMaterialCost)}
                subtitle="Materials used for completed work"
                icon={<RupeeIcon />}
              />

              <SummaryCard
                title="Total Expenditure"
                value={formatCurrency(totalExpenditure)}
                subtitle="Recorded maintenance expenditure"
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
                    No work records found
                  </h3>

                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                    Try changing your search or filter options.
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
                                {record.id}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {record.complaintId}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="max-w-[230px] text-sm font-medium text-slate-700">
                                {record.description}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {record.material} · Qty {record.quantity}
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
                                {formatCurrency(record.totalCost)}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                Bill {record.billNumber}
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
                              {record.id}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {record.complaintId}
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
                              Room {record.room}
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
                              {record.material}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Qty {record.quantity}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Total Cost
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {formatCurrency(record.totalCost)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {record.billNumber}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Remarks
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {record.remarks}
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
                  Gautam Buddha Hostel
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Work records and expenditure data will be connected to
                  the backend for official hostel budgeting and billing.
                </p>

                <div className="mt-4 border-t border-[#ead2dc] pt-4">
                  <p className="text-[11px] font-medium text-slate-500">
                    Current recorded expenditure
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#8e123f]">
                    {formatCurrency(totalExpenditure)}
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
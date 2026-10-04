"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type RequirementStatus = "Pending" | "Approved" | "Rejected";

type Requirement = {
  id: string;
  item: string;
  category: string;
  requestedBy: string;
  role: string;
  hostel: string;
  quantity: number;
  date: string;
  reason: string;
  status: RequirementStatus;
};

const initialRequirements: Requirement[] = [
  {
    id: "REQ-001",
    item: "Bathroom Taps",
    category: "Plumbing",
    requestedBy: "Rahul Sharma",
    role: "Caretaker",
    hostel: "Ganga Hostel",
    quantity: 8,
    date: "04 Oct 2026",
    reason: "Several bathroom taps are damaged and need replacement.",
    status: "Pending",
  },
  {
    id: "REQ-002",
    item: "LED Bulbs",
    category: "Electrical",
    requestedBy: "Amit Kumar",
    role: "Caretaker",
    hostel: "Yamuna Hostel",
    quantity: 20,
    date: "03 Oct 2026",
    reason: "Replacement bulbs are required for common areas.",
    status: "Pending",
  },
  {
    id: "REQ-003",
    item: "Door Locks",
    category: "Furniture",
    requestedBy: "Neha Singh",
    role: "Warden",
    hostel: "Saraswati Hostel",
    quantity: 6,
    date: "02 Oct 2026",
    reason: "Several room locks are damaged.",
    status: "Approved",
  },
  {
    id: "REQ-004",
    item: "PVC Pipes",
    category: "Plumbing",
    requestedBy: "Vikas Yadav",
    role: "Caretaker",
    hostel: "Brahmaputra Hostel",
    quantity: 15,
    date: "01 Oct 2026",
    reason: "Pipes are required for ongoing washroom maintenance.",
    status: "Rejected",
  },
];

function StatusBadge({ status }: { status: RequirementStatus }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function AdminRequirementsPage() {
  const [requirements, setRequirements] =
    useState<Requirement[]>(initialRequirements);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | RequirementStatus>(
    "All"
  );
  const [selected, setSelected] = useState<Requirement | null>(null);

  const filteredRequirements = useMemo(() => {
    const query = search.toLowerCase().trim();

    return requirements.filter((requirement) => {
      const matchesSearch =
        !query ||
        requirement.id.toLowerCase().includes(query) ||
        requirement.item.toLowerCase().includes(query) ||
        requirement.hostel.toLowerCase().includes(query) ||
        requirement.requestedBy.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || requirement.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requirements, search, statusFilter]);

  const updateStatus = (
    id: string,
    status: Exclude<RequirementStatus, "Pending">
  ) => {
    setRequirements((current) =>
      current.map((requirement) =>
        requirement.id === id ? { ...requirement, status } : requirement
      )
    );

    setSelected((current) =>
      current && current.id === id ? { ...current, status } : current
    );
  };

  const pending = requirements.filter((r) => r.status === "Pending").length;
  const approved = requirements.filter((r) => r.status === "Approved").length;
  const rejected = requirements.filter((r) => r.status === "Rejected").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* Temporary compact navigation */}
        <aside className="hidden w-[248px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-[76px] items-center border-b border-slate-200 px-6">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
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
              <Link
                href="/admin/dashboard"
                className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/complaints"
                className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Complaints
              </Link>

              <Link
                href="/admin/requirements"
                className="flex items-center rounded-xl bg-[#f8e9ef] px-3 py-2.5 text-sm font-semibold text-[#8e123f]"
              >
                Requirements
              </Link>

              <Link
                href="/admin/escalations"
                className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Escalations
              </Link>
            </div>

            <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Management
            </p>

            <div className="mt-3 space-y-1.5">
              {["Users", "Hostels", "Reports"].map((item) => (
                <div
                  key={item}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
                >
                  {item}
                </div>
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
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-7">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Administration / Requirements
              </p>
              <h1 className="mt-0.5 text-lg font-bold text-slate-900">
                Requirements
              </h1>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Admin
              </p>
              <p className="text-xs text-slate-500">
                Gautam Buddha University
              </p>
            </div>
          </header>

          <div className="p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Total Requirements</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {requirements.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Pending Review</p>
                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {pending}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Approved</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {approved}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Rejected</p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {rejected}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Requirement Requests
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review requests submitted by wardens and caretakers.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search requirements..."
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#a5174d]"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as "All" | RequirementStatus
                      )
                    }
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {requirement.item}
                        </p>
                        <StatusBadge status={requirement.status} />
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {requirement.id} · {requirement.category} ·{" "}
                        {requirement.hostel}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Requested by{" "}
                        <span className="font-medium text-slate-700">
                          {requirement.requestedBy}
                        </span>{" "}
                        · Qty. {requirement.quantity} · {requirement.date}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelected(requirement)}
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#a5174d] hover:text-[#8e123f]"
                    >
                      Review
                    </button>
                  </div>
                ))}

                {filteredRequirements.length === 0 && (
                  <div className="p-10 text-center text-sm text-slate-500">
                    No requirements found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  {selected.id}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {selected.item}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Category</span>
                <span className="font-medium text-slate-800">
                  {selected.category}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Hostel</span>
                <span className="font-medium text-slate-800">
                  {selected.hostel}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Requested by</span>
                <span className="font-medium text-slate-800">
                  {selected.requestedBy}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Quantity</span>
                <span className="font-medium text-slate-800">
                  {selected.quantity}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500">Reason</p>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {selected.reason}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => updateStatus(selected.id, "Rejected")}
                disabled={selected.status !== "Pending"}
                className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => updateStatus(selected.id, "Approved")}
                disabled={selected.status !== "Pending"}
                className="rounded-lg bg-[#8e123f] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

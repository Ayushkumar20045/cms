"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Pager } from "@/components/admin/ui";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { complaints as complaintsApi } from "@/lib/api/endpoints";
import type { ComplaintStatus } from "@/lib/api/types";
import { studentStatusLabel, timeAgo } from "@/lib/format";
import { useLoad } from "@/lib/session";

export type ListTab = "open" | "completed" | "rejected" | "all";

const TABS: { key: ListTab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "completed", label: "Resolved & closed" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

// Statuses offered in the filter for each tab
const TAB_STATUSES: Record<ListTab, ComplaintStatus[]> = {
  open: ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_INFORMATION", "WAITING_FOR_MATERIALS", "ESCALATED", "REOPENED"],
  completed: ["RESOLVED", "CLOSED"],
  rejected: ["REJECTED", "DUPLICATE"],
  all: Object.keys(studentStatusLabel) as ComplaintStatus[],
};

/**
 * Every complaint the signed-in staff member may see (for a warden: their hostel), with tabs, search and a
 * status filter. Each complaint opens its ticket page.
 */
export function ComplaintList({ initialTab = "open", tabs = TABS.map((t) => t.key) }: { initialTab?: ListTab; tabs?: ListTab[] }) {
  const [tab, setTab] = useState<ListTab>(initialTab);
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // "Rejected" has no server-side state, so it is narrowed by status (Rejected unless Duplicate is chosen)
  const effectiveStatus = status || (tab === "rejected" ? "REJECTED" : "");
  const list = useLoad(
    () =>
      complaintsApi.list({
        search: search || undefined,
        state: tab === "open" || tab === "completed" ? tab : undefined,
        status: effectiveStatus,
        page,
        limit: 15,
      }),
    [tab, search, effectiveStatus, page],
  );
  const rows = list.data?.data ?? [];
  const total = list.data?.pagination.total ?? 0;
  const totalPages = list.data?.pagination.totalPages ?? 1;

  function pickTab(next: ListTab) {
    setTab(next);
    setStatus("");
    setPage(1);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1" role="tablist" aria-label="Complaint groups">
          {TABS.filter((t) => tabs.includes(t.key)).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => pickTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.key ? "bg-white text-[#a5174d] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="complaint-search" className="sr-only">
            Search complaints
          </label>
          <input
            id="complaint-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, title or category"
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10 sm:w-64"
          />
          <label htmlFor="complaint-status" className="sr-only">
            Status
          </label>
          <select
            id="complaint-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ComplaintStatus | "");
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#a5174d]"
          >
            <option value="">{tab === "rejected" ? "Rejected" : "Any status"}</option>
            {TAB_STATUSES[tab]
              .filter((s) => !(tab === "rejected" && s === "REJECTED"))
              .map((s) => (
                <option key={s} value={s}>
                  {studentStatusLabel[s]}
                </option>
              ))}
          </select>
        </div>
      </div>

      {list.error ? (
        <p className="p-6 text-sm text-red-600">{list.error}</p>
      ) : list.loading && !list.data ? (
        <p className="p-6 text-sm text-slate-400">Loading complaints…</p>
      ) : rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">No complaints here.</p>
      ) : (
        <>
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Complaint</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Raised by</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5">
                    <Link href={`/tickets/${c.complaintNumber}`} className="font-semibold text-[#a5174d] hover:underline">
                      {c.complaintNumber}
                    </Link>
                    <p className="text-slate-800">{c.title}</p>
                    {c.isOverdue && <span className="text-[11px] font-semibold text-rose-600">Overdue</span>}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{c.category}</td>
                  <td className="max-w-[220px] px-4 py-3.5 text-xs text-slate-500">{c.location.label}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {c.requester.fullName}
                    {c.assignedTo && <span className="block text-xs text-slate-400">With {c.assignedTo}</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <StaffStatusBadge status={c.status} />
                    {c.decision === "REJECTED" && c.decisionReason && (
                      <p className="mt-1 max-w-[180px] text-[11px] text-slate-400">{c.decisionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{timeAgo(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/tickets/${c.complaintNumber}`} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#a5174d]">{c.complaintNumber}</p>
                      <p className="font-medium text-slate-900">{c.title}</p>
                    </div>
                    <StaffStatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.category} · {c.location.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.requester.fullName} · updated {timeAgo(c.updatedAt)}
                    {c.isOverdue && <span className="font-semibold text-rose-600"> · Overdue</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        {total} complaint{total === 1 ? "" : "s"}
      </p>
      <Pager page={page} totalPages={totalPages} onPage={setPage} />

    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ComplaintPanel } from "@/components/admin/complaint-panel";
import { Message, Pager, Panel, StatCard, filterClass } from "@/components/admin/ui";
import { DecisionNote } from "@/components/complaints/request-actions";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { admin, complaints as complaintsApi } from "@/lib/api/endpoints";
import type { ComplaintStatus, Priority } from "@/lib/api/types";
import { allStatuses, formatDate } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** "?status=ESCALATED" style links from other pages pre-set the filters */
function initialFilter(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export default function AdminComplaintsPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(initialFilter("status") as ComplaintStatus | "");
    setOverdue(initialFilter("overdue") === "true");
  }, []);

  // Search as the admin types, without a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const dashboard = useLoad(() => (ready ? admin.dashboard() : Promise.resolve(null)), [ready]);
  const categories = useLoad(() => (ready ? complaintsApi.categories() : Promise.resolve(null)), [ready]);
  const list = useLoad(
    () =>
      ready
        ? admin.complaints({ search: query, status, category, priority, overdue: overdue || undefined, page, limit: 20 })
        : Promise.resolve(null),
    [ready, query, status, category, priority, overdue, page],
  );

  const counts = dashboard.data?.counts;
  const rows = list.data?.data ?? [];
  const total = list.data?.pagination.total ?? 0;
  const refresh = () => {
    list.reload();
    dashboard.reload();
  };

  return (
    <AdminShell title="Complaints" section="Complaints" user={user} onSignOut={signOut}>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">All Complaints</h2>
        <p className="mt-1 text-sm text-slate-500">Monitor, review and manage every request raised on campus.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Complaints" value={counts?.total ?? "–"} subtitle="All registered complaints" />
        <StatCard title="Pending" value={counts?.pending ?? "–"} subtitle="Awaiting review" />
        <StatCard title="In Progress" value={counts?.inProgress ?? "–"} subtitle="Currently being handled" />
        <StatCard title="Resolved" value={counts?.resolved ?? "–"} subtitle="Resolved or closed" />
        <StatCard title="Escalated" value={dashboard.data?.byStatus.ESCALATED ?? (counts ? 0 : "–")} subtitle="Require intervention" tone="text-rose-600" />
      </div>

      <div className="mt-6">
        <Panel
          title="Complaint Records"
          subtitle={`${total} complaint${total === 1 ? "" : "s"} found`}
          actions={
            <>
              <label htmlFor="search" className="sr-only">
                Search complaints
              </label>
              <input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, title, student, hostel…"
                className={`${filterClass} w-full sm:w-[250px]`}
              />
              <label htmlFor="status" className="sr-only">
                Status
              </label>
              <select id="status" className={filterClass} value={status} onChange={(e) => { setStatus(e.target.value as ComplaintStatus | ""); setPage(1); }}>
                <option value="">All Statuses</option>
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
              <label htmlFor="category" className="sr-only">
                Category
              </label>
              <select id="category" className={filterClass} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label htmlFor="priority" className="sr-only">
                Priority
              </label>
              <select id="priority" className={filterClass} value={priority} onChange={(e) => { setPriority(e.target.value as Priority | ""); setPage(1); }}>
                <option value="">All Priorities</option>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {label(p)}
                  </option>
                ))}
              </select>
              <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={overdue} onChange={(e) => { setOverdue(e.target.checked); setPage(1); }} />
                Overdue only
              </label>
            </>
          }
        >
          {list.error ? (
            <Message error>{list.error}</Message>
          ) : list.loading ? (
            <Message>Loading complaints…</Message>
          ) : rows.length === 0 ? (
            <Message>No complaints match these filters.</Message>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      <th className="px-5 py-3">Complaint</th>
                      <th className="px-4 py-3">Raised by</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Assigned To</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <button type="button" onClick={() => setOpenId(c.id)} className="text-left">
                            <span className="block text-xs font-bold text-[#a5174d] hover:underline">{c.complaintNumber}</span>
                            <span className="mt-1 block max-w-[240px] text-xs font-semibold text-slate-800">{c.title}</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-800">{c.requester.fullName}</td>
                        <td className="px-4 py-4">
                          <p className="text-xs font-medium text-slate-700">{c.location.building?.name ?? "—"}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{c.location.room ? `Room ${c.location.room}` : (c.location.details ?? "")}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">{c.category}</td>
                        <td className="px-4 py-4 text-xs text-slate-600">{c.assignedTo ?? "Unassigned"}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StaffStatusBadge status={c.status} />
                            {c.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">OVERDUE</span>}
                          </div>
                          <DecisionNote complaint={c} />
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {rows.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setOpenId(c.id)} className="block w-full p-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#a5174d]">{c.complaintNumber}</p>
                          <p className="mt-1 text-sm font-bold text-slate-900">{c.title}</p>
                        </div>
                        <StaffStatusBadge status={c.status} />
                      </div>
                      <DecisionNote complaint={c} />
                      <p className="mt-2 text-xs text-slate-500">
                        {c.requester.fullName} · {c.category} · {c.location.label}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Pager page={page} totalPages={list.data?.pagination.totalPages ?? 1} onPage={setPage} />
        </Panel>
      </div>

      {openId && <ComplaintPanel id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />}
    </AdminShell>
  );
}

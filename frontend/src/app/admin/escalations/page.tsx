"use client";

import { useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ComplaintPanel } from "@/components/admin/complaint-panel";
import { Message, Pager, Panel, StatCard } from "@/components/admin/ui";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { admin } from "@/lib/api/endpoints";
import { formatDate, timeAgo } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

type Tab = "escalated" | "overdue";

export default function AdminEscalationsPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);
  const [tab, setTab] = useState<Tab>("escalated");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const escalated = useLoad(
    () => (ready ? admin.complaints({ status: "ESCALATED", page: tab === "escalated" ? page : 1, limit: 20 }) : Promise.resolve(null)),
    [ready, tab, page],
  );
  const overdue = useLoad(
    () => (ready ? admin.complaints({ overdue: true, page: tab === "overdue" ? page : 1, limit: 20 }) : Promise.resolve(null)),
    [ready, tab, page],
  );
  const current = tab === "escalated" ? escalated : overdue;
  const rows = current.data?.data ?? [];
  const refresh = () => {
    escalated.reload();
    overdue.reload();
  };

  return (
    <AdminShell title="Escalations" section="Escalations" user={user} onSignOut={signOut}>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Escalations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Requests that staff have escalated, and requests that have passed their expected resolution date.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Escalated" value={escalated.data?.pagination.total ?? "–"} subtitle="Raised for higher-level action" tone="text-rose-600" />
        <StatCard title="Overdue" value={overdue.data?.pagination.total ?? "–"} subtitle="Past expected resolution, still open" tone="text-amber-600" />
      </div>

      <div className="mt-6">
        <Panel
          title={tab === "escalated" ? "Escalated requests" : "Overdue requests"}
          subtitle="Open a request to reassign it, change its status or add remarks."
          actions={
            <div role="tablist" aria-label="Escalation lists" className="flex rounded-lg border border-slate-200 p-1">
              {(["escalated", "overdue"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setPage(1);
                  }}
                  className={`rounded-md px-4 py-2 text-xs font-semibold ${tab === t ? "bg-[#f8e9ef] text-[#8e123f]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {t === "escalated" ? "Escalated" : "Overdue"}
                </button>
              ))}
            </div>
          }
        >
          {current.error ? (
            <Message error>{current.error}</Message>
          ) : current.loading ? (
            <Message>Loading…</Message>
          ) : rows.length === 0 ? (
            <Message>{tab === "escalated" ? "Nothing is escalated right now." : "No request is overdue."}</Message>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#a5174d]">{c.complaintNumber}</span>
                      <StaffStatusBadge status={c.status} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{c.priority}</span>
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-900">{c.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.requester.fullName} · {c.category} · {c.location.label} · {c.assignedTo ?? "Unassigned"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Raised {formatDate(c.createdAt)} · updated {timeAgo(c.updatedAt)}
                      {c.expectedResolutionAt ? ` · due ${formatDate(c.expectedResolutionAt)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(c.id)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#a5174d] hover:text-[#8e123f]"
                  >
                    Review
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} totalPages={current.data?.pagination.totalPages ?? 1} onPage={setPage} />
        </Panel>
      </div>

      {openId && <ComplaintPanel id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />}
    </AdminShell>
  );
}

"use client";

import Link from "next/link";

import { StaffStatusBadge } from "@/components/staff/status-badge";
import { WardenShell } from "@/components/staff/warden-shell";
import { complaints as complaintsApi } from "@/lib/api/endpoints";
import type { ComplaintSummary } from "@/lib/api/types";
import { formatDate, timeAgo } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

function Rows({ items, empty, showDue = false }: { items: ComplaintSummary[]; empty: string; showDue?: boolean }) {
  if (items.length === 0) return <p className="p-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/tickets/${c.complaintNumber}`} className="flex flex-col gap-2 p-4 hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#a5174d]">{c.complaintNumber}</p>
              <p className="font-medium text-slate-900">{c.title}</p>
              <p className="text-xs text-slate-500">
                {c.category} · {c.location.label}
                {c.assignedTo ? ` · with ${c.assignedTo}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
              <StaffStatusBadge status={c.status} />
              <span className="text-[11px] text-slate-400">
                {showDue && c.expectedResolutionAt
                  ? `Due ${formatDate(c.expectedResolutionAt)}`
                  : `Updated ${timeAgo(c.updatedAt)}`}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Complaints of the warden's hostel that were escalated or are past their expected resolution date. */
export default function WardenEscalationsPage() {
  const { user, signOut } = useSession("warden");
  const ready = Boolean(user);
  const hostelName = user?.hostel?.name ?? null;
  const escalated = useLoad(
    () => (ready ? complaintsApi.list({ status: "ESCALATED", limit: 100 }) : Promise.resolve(null)),
    [ready],
  );
  const open = useLoad(() => (ready ? complaintsApi.list({ state: "open", limit: 100 }) : Promise.resolve(null)), [ready]);
  const escalatedRows = escalated.data?.data ?? [];
  const overdueRows = (open.data?.data ?? []).filter((c) => c.isOverdue && c.status !== "ESCALATED");
  const loading = escalated.loading || open.loading;

  return (
    <WardenShell user={user} signOut={signOut} hostelName={hostelName}>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a5174d]">Needs attention</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Escalations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complaints in {hostelName ?? "your hostel"} that were escalated for higher attention, and open complaints
            that are past their expected resolution date. Open a complaint to escalate, reassign or comment.
          </p>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-rose-100 bg-white p-4">
            <p className="text-xs text-slate-500">Escalated</p>
            <p className="mt-1 text-2xl font-semibold text-rose-600">{loading ? "…" : escalatedRows.length}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-white p-4">
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{loading ? "…" : overdueRows.length}</p>
          </div>
        </section>

        {escalated.error || open.error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{escalated.error ?? open.error}</p>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white">
              <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Escalated complaints</h3>
              {loading ? (
                <p className="p-6 text-sm text-slate-400">Loading…</p>
              ) : (
                <Rows items={escalatedRows} empty="Nothing is escalated right now." />
              )}
            </section>
            <section className="rounded-xl border border-slate-200 bg-white">
              <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Overdue complaints</h3>
              {loading ? (
                <p className="p-6 text-sm text-slate-400">Loading…</p>
              ) : (
                <Rows items={overdueRows} empty="No open complaint is past its due date." showDue />
              )}
            </section>
          </div>
        )}
      </div>
    </WardenShell>
  );
}

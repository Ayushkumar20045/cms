"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Dialog, Field, Message, Pager, Panel, StatCard, filterClass, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { ApiError } from "@/lib/api/client";
import { requirements as requirementsApi } from "@/lib/api/endpoints";
import type { Requirement, RequirementStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

const STATUS_STYLE: Record<RequirementStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  FULFILLED: "bg-sky-50 text-sky-700 border-sky-200",
};
const STATUS_LABEL: Record<RequirementStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FULFILLED: "Fulfilled",
};

function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
  );
}

export default function AdminRequirementsPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequirementStatus | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Requirement | null>(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const summary = useLoad(() => (ready ? requirementsApi.summary() : Promise.resolve(null)), [ready]);
  const list = useLoad(
    () => (ready ? requirementsApi.list({ search: query, status: statusFilter, page, limit: 20 }) : Promise.resolve(null)),
    [ready, query, statusFilter, page],
  );
  const rows = list.data?.data ?? [];
  const counts = summary.data;

  function open(r: Requirement) {
    setSelected(r);
    setRemarks("");
    setError(null);
  }

  async function decide(decision: "APPROVED" | "REJECTED" | "FULFILLED") {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await requirementsApi.decide(selected.id, decision, remarks.trim());
      setSelected(updated);
      setRemarks("");
      list.reload();
      summary.reload();
    } catch (e) {
      setError(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Requirements" section="Requirements" user={user} onSignOut={signOut}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Requirements" value={counts?.total ?? "–"} />
        <StatCard title="Pending Review" value={counts?.pending ?? "–"} tone="text-amber-600" />
        <StatCard title="Approved" value={counts?.approved ?? "–"} tone="text-emerald-600" />
        <StatCard title="Fulfilled" value={counts?.fulfilled ?? "–"} tone="text-sky-600" />
        <StatCard title="Rejected" value={counts?.rejected ?? "–"} tone="text-red-600" />
      </div>

      <div className="mt-6">
        <Panel
          title="Requirement Requests"
          subtitle="Materials and equipment requested by wardens, caretakers and technicians."
          actions={
            <>
              <label htmlFor="search" className="sr-only">
                Search requirements
              </label>
              <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements…" className={`${filterClass} w-full sm:w-[230px]`} />
              <label htmlFor="status" className="sr-only">
                Status
              </label>
              <select id="status" className={filterClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as RequirementStatus | ""); setPage(1); }}>
                <option value="">All Status</option>
                {(Object.keys(STATUS_LABEL) as RequirementStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </>
          }
        >
          {list.error ? (
            <Message error>{list.error}</Message>
          ) : list.loading ? (
            <Message>Loading requirements…</Message>
          ) : rows.length === 0 ? (
            <Message>No requirements found.</Message>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{r.item}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.requirementNumber}
                      {r.category ? ` · ${r.category}` : ""}
                      {r.hostel ? ` · ${r.hostel.name}` : r.department ? ` · ${r.department.name}` : ""}
                      {r.complaintNumber ? ` · for ${r.complaintNumber}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Requested by <span className="font-medium text-slate-700">{r.requestedBy.fullName}</span> ({r.requestedByRole}) · Qty. {r.quantity} ·{" "}
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => open(r)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#a5174d] hover:text-[#8e123f]"
                  >
                    Review
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} totalPages={list.data?.pagination.totalPages ?? 1} onPage={setPage} />
        </Panel>
      </div>

      {selected && (
        <Dialog title={selected.item} subtitle={selected.requirementNumber} onClose={() => setSelected(null)}>
          <div className="space-y-3 p-5 text-sm">
            {[
              ["Status", <StatusBadge key="s" status={selected.status} />],
              ["Category", selected.category ?? "—"],
              ["Hostel / department", selected.hostel?.name ?? selected.department?.name ?? "—"],
              ["For complaint", selected.complaintNumber ?? "—"],
              ["Requested by", `${selected.requestedBy.fullName} (${selected.requestedByRole})`],
              ["Quantity", selected.quantity],
              ["Requested on", formatDate(selected.createdAt)],
            ].map(([name, value]) => (
              <div key={name as string} className="flex justify-between gap-4">
                <span className="text-slate-500">{name}</span>
                <span className="text-right font-medium text-slate-800">{value}</span>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold text-slate-500">Reason</p>
              <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">{selected.reason}</p>
            </div>
            {selected.decidedBy && (
              <div>
                <p className="text-xs font-semibold text-slate-500">Decision</p>
                <p className="mt-1 text-slate-700">
                  {STATUS_LABEL[selected.status]} by {selected.decidedBy.fullName}
                  {selected.decidedAt ? ` on ${formatDate(selected.decidedAt)}` : ""}
                  {selected.decisionRemarks ? ` — ${selected.decisionRemarks}` : ""}
                </p>
              </div>
            )}

            {(selected.status === "PENDING" || selected.status === "APPROVED") && (
              <Field label={selected.status === "PENDING" ? "Remarks (required to reject)" : "Remarks (optional)"} htmlFor="decision-remarks">
                <textarea id="decision-remarks" rows={2} className={`${inputClass} h-auto py-2`} value={remarks} maxLength={1000} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
            {selected.status === "PENDING" && (
              <>
                <button type="button" className={secondaryButton} disabled={busy} onClick={() => decide("REJECTED")}>
                  Reject
                </button>
                <button type="button" className={primaryButton} disabled={busy} onClick={() => decide("APPROVED")}>
                  Approve
                </button>
              </>
            )}
            {selected.status === "APPROVED" && (
              <button type="button" className={primaryButton} disabled={busy} onClick={() => decide("FULFILLED")}>
                Mark as fulfilled
              </button>
            )}
            {(selected.status === "REJECTED" || selected.status === "FULFILLED") && (
              <button type="button" className={secondaryButton} onClick={() => setSelected(null)}>
                Close
              </button>
            )}
          </div>
        </Dialog>
      )}
    </AdminShell>
  );
}

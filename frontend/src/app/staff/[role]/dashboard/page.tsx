"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

import { RecurringIssues } from "@/components/complaints/recurring-issues";
import { DecisionNote, RequestActions } from "@/components/complaints/request-actions";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { UserMenu } from "@/components/student/user-menu";
import { ApiError } from "@/lib/api/client";
import { complaints as complaintsApi, requirements as requirementsApi, staff as staffApi } from "@/lib/api/endpoints";
import type { CurrentUser, Requirement } from "@/lib/api/types";
import { formatDate, timeAgo } from "@/lib/format";
import { STAFF_PORTALS, type StaffPortalRole, useLoad, useSession } from "@/lib/session";

const INTRO: Record<StaffPortalRole, string> = {
  technician: "Jobs assigned to you. Accept new jobs, then record progress until they are resolved.",
  supervisor: "Requests routed to your department. Accept or reject new ones and keep work moving.",
  "department-head": "Everything routed to your department, including recurring problems that need a lasting fix.",
  store: "Material and equipment requests from hostel and maintenance staff.",
  authority: "Specialised requests assigned to you.",
};

function Stat({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function RequestsPortal({ user, slug }: { user: CurrentUser; slug: StaffPortalRole }) {
  const [view, setView] = useState<"open" | "completed">("open");
  const dashboard = useLoad(() => staffApi.dashboard(), []);
  const list = useLoad(() => complaintsApi.list({ state: view, limit: 50 }), [view]);
  const counts = dashboard.data?.counts;
  const rows = list.data?.data ?? [];
  const seesRecurring = user.permissions.some((p) => p === "COMPLAINT_VIEW_DEPARTMENT" || p === "COMPLAINT_VIEW_HOSTEL");

  function reload() {
    list.reload();
    dashboard.reload();
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Total" value={counts?.total ?? "–"} hint="All requests you can see" />
        <Stat label="New" value={counts?.pending ?? "–"} hint="Waiting to be accepted" />
        <Stat
          label="In progress"
          value={counts ? counts.assigned + counts.inProgress : "–"}
          hint="Accepted and being worked on"
        />
        <Stat
          label="Waiting"
          value={counts ? counts.waitingForMaterials + counts.waitingForInformation : "–"}
          hint="For materials or information"
        />
        <Stat label="Resolved" value={counts?.resolved ?? "–"} hint="Resolved or closed" />
      </section>

      {seesRecurring && <RecurringIssues ready />}

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{slug === "technician" ? "My jobs" : "Requests"}</h3>
            <p className="mt-1 text-xs text-slate-500">{INTRO[slug]}</p>
          </div>
          <div className="flex rounded-lg border border-slate-200 p-0.5" role="tablist">
            {(["open", "completed"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={view === tab}
                onClick={() => setView(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  view === tab ? "bg-[#a5174d] text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab === "open" ? "Open" : "Completed"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Request", "Raised by", "Location", "Status", "Updated", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {c.complaintNumber} · {c.category}
                      {c.priority !== "MEDIUM" ? ` · ${c.priority}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{c.requester.fullName}</td>
                  <td className="px-5 py-4 text-xs text-slate-600">{c.location.label}</td>
                  <td className="px-5 py-4">
                    <StaffStatusBadge status={c.status} />
                    {c.isOverdue && <p className="mt-1 text-[10px] font-bold text-rose-700">OVERDUE</p>}
                    <DecisionNote complaint={c} />
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{timeAgo(c.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <RequestActions complaint={c} user={user} onChanged={reload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(list.loading || list.error || rows.length === 0) && (
          <p role={list.error ? "alert" : undefined} className={`px-5 py-8 text-center text-sm ${list.error ? "text-red-600" : "text-slate-500"}`}>
            {list.error ?? (list.loading ? "Loading…" : view === "open" ? "Nothing waiting for you right now." : "No completed requests yet.")}
          </p>
        )}
      </section>
    </>
  );
}

function StorePortal() {
  const summary = useLoad(() => requirementsApi.summary(), []);
  const list = useLoad(() => requirementsApi.list({ limit: 50 }), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = list.data?.data ?? [];

  async function decide(r: Requirement, decision: "APPROVED" | "REJECTED" | "FULFILLED") {
    let remarks: string | undefined;
    if (decision === "REJECTED") {
      remarks = window.prompt(`Reason for rejecting ${r.requirementNumber} (${r.item})`)?.trim();
      if (!remarks) return;
    }
    setBusy(r.id);
    setError(null);
    try {
      await requirementsApi.decide(r.id, decision, remarks);
      list.reload();
      summary.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const s = summary.data;
  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pending" value={s?.pending ?? "–"} hint="Waiting for approval" />
        <Stat label="Approved" value={s?.approved ?? "–"} hint="To be issued" />
        <Stat label="Fulfilled" value={s?.fulfilled ?? "–"} hint="Issued to staff" />
        <Stat label="Rejected" value={s?.rejected ?? "–"} hint="Turned down" />
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">Material requests</h3>
          <p className="mt-1 text-xs text-slate-500">{INTRO.store}</p>
        </div>
        {error && (
          <p role="alert" className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Item", "Qty", "Requested by", "For", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">{r.item}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {r.requirementNumber} · {formatDate(r.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{r.reason}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{r.quantity}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{r.requestedBy.fullName}</td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {r.hostel?.name ?? r.department?.name ?? "—"}
                    {r.complaintNumber ? ` · ${r.complaintNumber}` : ""}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                    {r.status}
                    {r.decisionRemarks && <p className="mt-1 font-normal text-slate-500">{r.decisionRemarks}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {r.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => decide(r, "APPROVED")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => decide(r, "REJECTED")}
                            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === "APPROVED" && (
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => decide(r, "FULFILLED")}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Mark issued
                        </button>
                      )}
                      {r.status !== "PENDING" && r.status !== "APPROVED" && <span className="text-[11px] text-slate-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(list.loading || list.error || rows.length === 0) && (
          <p role={list.error ? "alert" : undefined} className={`px-5 py-8 text-center text-sm ${list.error ? "text-red-600" : "text-slate-500"}`}>
            {list.error ?? (list.loading ? "Loading…" : "No material requests yet.")}
          </p>
        )}
      </section>
    </>
  );
}

/** Portal for campus staff roles that do not have a hand-built page: technician, supervisor, department head, store, authority. */
export default function StaffPortalPage() {
  const params = useParams<{ role: string }>();
  const slug = params.role as StaffPortalRole;
  if (!(slug in STAFF_PORTALS)) {
    notFound();
  }
  return <StaffPortal slug={slug} />;
}

function StaffPortal({ slug }: { slug: StaffPortalRole }) {
  const portal = STAFF_PORTALS[slug];
  const { user, signOut } = useSession(slug);
  const where = user?.department?.name ?? user?.hostel?.name ?? "Gautam Buddha University";

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
        <Link href={`/staff/${slug}/dashboard`} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/gbu-logo.png" alt="GBU" className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-500">{where}</span>
            <span className="block text-sm font-bold text-slate-900">{portal.label} Portal</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {slug !== "store" && (
            <Link
              href="/board"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Ticket Board
            </Link>
          )}
          <UserMenu user={user} roleLabel={portal.label} onSignOut={signOut} />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6">
          <p className="text-xs font-medium text-[#a5174d]">{user ? `Welcome, ${user.firstName}` : " "}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{portal.label} Portal</h1>
        </section>

        {user && (slug === "store" ? <StorePortal /> : <RequestsPortal user={user} slug={slug} />)}
      </main>
    </div>
  );
}

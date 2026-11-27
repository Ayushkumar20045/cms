"use client";

import { FormEvent, useState } from "react";

import { Pager } from "@/components/admin/ui";
import { ApiError } from "@/lib/api/client";
import { complaints as complaintsApi, requirements as requirementsApi } from "@/lib/api/endpoints";
import type { RequirementStatus } from "@/lib/api/types";
import { timeAgo } from "@/lib/format";
import { useLoad } from "@/lib/session";

const STATUS_STYLE: Record<RequirementStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-sky-200 bg-sky-50 text-sky-700",
  REJECTED: "border-slate-200 bg-slate-100 text-slate-600",
  FULFILLED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const STATUS_LABEL: Record<RequirementStatus, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FULFILLED: "Issued",
};

function Badge({ status }: { status: RequirementStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const input =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10";

/**
 * Material requirements for the signed-in hostel staff member's hostel: counts, the list, and a form to raise a
 * new one (optionally for one of their open complaints). Approval happens with the Department Head or Store Manager.
 */
export function RequirementsWorkspace() {
  const [status, setStatus] = useState<RequirementStatus | "">("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const summary = useLoad(() => requirementsApi.summary(), [version]);
  const list = useLoad(() => requirementsApi.list({ status, page, limit: 10 }), [status, page, version]);
  const openComplaints = useLoad(() => complaintsApi.list({ state: "open", limit: 100 }), []);

  const [form, setForm] = useState({ item: "", quantity: "1", reason: "", complaintId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const r = await requirementsApi.create({
        item: form.item.trim(),
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
        complaintId: form.complaintId || undefined,
      });
      setForm({ item: "", quantity: "1", reason: "", complaintId: "" });
      setMessage({ ok: true, text: `Requirement ${r.requirementNumber} raised. It now waits for approval.` });
      setPage(1);
      setVersion((v) => v + 1);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(e.errors.filter((x) => x.field).map((x) => [x.field as string, x.message])));
        setMessage({ ok: false, text: e.errors.length ? "Please correct the highlighted fields." : e.message });
      } else {
        setMessage({ ok: false, text: "Something went wrong. Please try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  const counts = summary.data;
  const tiles = [
    { label: "Total", value: counts?.total, note: "All requirements" },
    { label: "Pending", value: counts?.pending, note: "Waiting for approval" },
    { label: "Approved", value: counts?.approved, note: "Waiting to be issued" },
    { label: "Issued", value: counts?.fulfilled, note: "Handed over" },
  ];
  const rows = list.data?.data ?? [];

  return (
    <>
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{t.value ?? "…"}</p>
            <p className="mt-1 text-[11px] text-slate-400">{t.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Requirement requests</h3>
              <p className="text-xs text-slate-500">Materials and equipment requested for your hostel.</p>
            </div>
            <label htmlFor="req-status" className="sr-only">
              Status
            </label>
            <select
              id="req-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as RequirementStatus | "");
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#a5174d]"
            >
              <option value="">Any status</option>
              {(Object.keys(STATUS_LABEL) as RequirementStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {list.error ? (
            <p className="p-6 text-sm text-red-600">{list.error}</p>
          ) : list.loading && !list.data ? (
            <p className="p-6 text-sm text-slate-400">Loading requirements…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No requirements yet. Raise one with the form.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {r.item} <span className="font-normal text-slate-500">× {r.quantity}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {r.requirementNumber}
                        {r.complaintNumber ? ` · for ${r.complaintNumber}` : ""}
                      </p>
                    </div>
                    <Badge status={r.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.reason}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Raised by {r.requestedBy.fullName} ({r.requestedByRole}) · {timeAgo(r.createdAt)}
                    {r.decidedBy && ` · ${STATUS_LABEL[r.status].toLowerCase()} by ${r.decidedBy.fullName}`}
                  </p>
                  {r.decisionRemarks && <p className="mt-1 text-xs text-slate-500">&ldquo;{r.decisionRemarks}&rdquo;</p>}
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} totalPages={list.data?.pagination.totalPages ?? 1} onPage={setPage} />
        </div>

        <form onSubmit={submit} className="h-fit rounded-xl border border-slate-200 bg-white p-5" noValidate>
          <h3 className="text-sm font-semibold text-slate-900">Raise a requirement</h3>
          <p className="mt-1 text-xs text-slate-500">
            Ask for materials or equipment. The Department Head or Store Manager approves it and the store issues it.
          </p>

          <label htmlFor="req-item" className="mt-4 block text-xs font-semibold text-slate-700">
            Item
          </label>
          <input
            id="req-item"
            className={`${input} mt-1`}
            value={form.item}
            maxLength={150}
            placeholder="e.g. LED tube light 20W"
            onChange={(e) => setForm({ ...form, item: e.target.value })}
          />
          {errors.item && <p className="mt-1 text-[11px] text-red-600">{errors.item}</p>}

          <label htmlFor="req-qty" className="mt-3 block text-xs font-semibold text-slate-700">
            Quantity
          </label>
          <input
            id="req-qty"
            type="number"
            min={1}
            className={`${input} mt-1`}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          {errors.quantity && <p className="mt-1 text-[11px] text-red-600">{errors.quantity}</p>}

          <label htmlFor="req-complaint" className="mt-3 block text-xs font-semibold text-slate-700">
            For complaint <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <select
            id="req-complaint"
            className={`${input} mt-1`}
            value={form.complaintId}
            onChange={(e) => setForm({ ...form, complaintId: e.target.value })}
          >
            <option value="">Not for a specific complaint</option>
            {(openComplaints.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.complaintNumber} · {c.title}
              </option>
            ))}
          </select>
          {errors.complaintId && <p className="mt-1 text-[11px] text-red-600">{errors.complaintId}</p>}

          <label htmlFor="req-reason" className="mt-3 block text-xs font-semibold text-slate-700">
            Reason
          </label>
          <textarea
            id="req-reason"
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10"
            placeholder="Why it is needed"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          {errors.reason && <p className="mt-1 text-[11px] text-red-600">{errors.reason}</p>}

          {message && (
            <p
              role={message.ok ? "status" : "alert"}
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 h-10 w-full rounded-lg bg-[#a5174d] text-sm font-semibold text-white hover:bg-[#8e123f] disabled:opacity-60"
          >
            {busy ? "Raising…" : "Raise requirement"}
          </button>
        </form>
      </section>
    </>
  );
}

"use client";

import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { complaints as complaintsApi } from "@/lib/api/endpoints";
import type { ComplaintStatus, ComplaintSummary, CurrentUser } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

const DECIDABLE: ComplaintStatus[] = ["SUBMITTED", "UNDER_REVIEW", "REOPENED"];

// Next work steps offered to staff; the backend checks every change against the workflow and their permissions
const NEXT_STEPS: Partial<Record<ComplaintStatus, Array<{ status: ComplaintStatus; label: string }>>> = {
  ASSIGNED: [{ status: "IN_PROGRESS", label: "Start work" }],
  IN_PROGRESS: [
    { status: "RESOLVED", label: "Mark resolved" },
    { status: "WAITING_FOR_MATERIALS", label: "Waiting for materials" },
    { status: "WAITING_FOR_INFORMATION", label: "Need more information" },
  ],
  WAITING_FOR_MATERIALS: [{ status: "IN_PROGRESS", label: "Resume work" }],
  WAITING_FOR_INFORMATION: [{ status: "IN_PROGRESS", label: "Resume work" }],
  REOPENED: [{ status: "IN_PROGRESS", label: "Start work" }],
};

const button =
  "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** "Accepted by Demo Caretaker" / "Rejected: reason", for staff tables, admin and the student's own list. */
export function DecisionNote({ complaint }: { complaint: ComplaintSummary }) {
  if (!complaint.decision) return null;
  const by = complaint.decidedBy?.fullName;
  const when = complaint.decidedAt ? formatDate(complaint.decidedAt) : null;
  if (complaint.decision === "ACCEPTED") {
    return (
      <p className="mt-1 text-[11px] font-medium text-emerald-700">
        Accepted{by ? ` by ${by}` : ""}
        {when ? ` · ${when}` : ""}
      </p>
    );
  }
  return (
    <p className="mt-1 text-[11px] font-medium text-rose-700">
      Rejected{by ? ` by ${by}` : ""}
      {complaint.decisionReason ? `: ${complaint.decisionReason}` : ""}
    </p>
  );
}

/**
 * Accept / reject a newly raised request, then move accepted work along. Shown only to users whose
 * permissions allow it; the backend enforces scope and the workflow either way.
 */
export function RequestActions({
  complaint,
  user,
  onChanged,
}: {
  complaint: ComplaintSummary;
  user: CurrentUser | null;
  onChanged: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perms = user?.permissions ?? [];
  const canDecide = perms.includes("COMPLAINT_DECIDE") && DECIDABLE.includes(complaint.status);
  // A request a warden or supervisor accepted for review can still be taken on by the caretaker offered it
  const isWorker = (user?.roles ?? []).some((role) => role === "CARETAKER" || role === "TECHNICIAN");
  const needsDecision = canDecide && (complaint.decision === null || isWorker);
  const steps = perms.includes("COMPLAINT_UPDATE_STATUS") && !needsDecision ? NEXT_STEPS[complaint.status] ?? [] : [];

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setRejecting(false);
      setReason("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldError("reason") ?? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submitReject(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError("Please give a reason of at least 5 characters.");
      return;
    }
    run(() => complaintsApi.reject(complaint.id, reason.trim()));
  }

  if (!needsDecision && steps.length === 0) {
    return <span className="text-[11px] text-slate-400">—</span>;
  }

  return (
    <div className="min-w-[180px]">
      {needsDecision && !rejecting && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => complaintsApi.accept(complaint.id))}
            className={`${button} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRejecting(true)}
            className={`${button} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
          >
            Reject
          </button>
        </div>
      )}

      {rejecting && (
        <form onSubmit={submitReject} className="space-y-1.5">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={1000}
            autoFocus
            placeholder="Reason the student will see"
            aria-label="Reason for rejecting"
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#a5174d] focus:ring-2 focus:ring-[#a5174d]/10"
          />
          <div className="flex gap-1.5">
            <button type="submit" disabled={busy} className={`${button} bg-rose-600 text-white hover:bg-rose-700`}>
              Confirm reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className={`${button} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {steps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {steps.map((step) => (
            <button
              key={step.status}
              type="button"
              disabled={busy}
              onClick={() => run(() => complaintsApi.setStatus(complaint.id, step.status))}
              className={`${button} ${
                step.status === "RESOLVED"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

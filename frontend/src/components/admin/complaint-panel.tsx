"use client";

import { FormEvent, useState } from "react";

import { Dialog, Field, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { ApiError } from "@/lib/api/client";
import { admin, complaints as complaintsApi } from "@/lib/api/endpoints";
import type { CommentVisibility, ComplaintDetail, ComplaintStatus, Priority } from "@/lib/api/types";
import { formatDate, timeAgo } from "@/lib/format";
import { useLoad } from "@/lib/session";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** Datetime-local value ("2026-11-20T17:00") for an ISO timestamp, in local time */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-100 px-5 py-5 last:border-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{name}</span>
      <span className="text-right font-medium text-slate-800">{children}</span>
    </div>
  );
}

/**
 * Slide-over with one complaint and every action an administrator can take on it. Each action calls the
 * backend, which re-checks permission, scope and the status workflow; the panel only shows what it allows.
 */
export function ComplaintPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const loaded = useLoad(() => admin.complaint(id), [id]);
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const c = complaint ?? loaded.data;
  const staff = useLoad(
    () =>
      c
        ? admin.staff(c.hostel ? { hostelId: c.hostel.id } : c.department ? { departmentId: c.department.id } : {})
        : Promise.resolve(null),
    [c?.hostel?.id, c?.department?.id, Boolean(c)],
  );

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | "">("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [due, setDue] = useState<string | null>(null);
  const [assignee, setAssignee] = useState("");
  const [assignRemarks, setAssignRemarks] = useState("");
  const [escalation, setEscalation] = useState("");
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("INTERNAL");
  const [rejectReason, setRejectReason] = useState("");

  async function run(key: string, action: () => Promise<ComplaintDetail>, done: string, reset?: () => void) {
    setBusy(key);
    setNotice(null);
    try {
      const updated = await action();
      setComplaint(updated);
      reset?.();
      setNotice({ error: false, text: done });
      onChanged();
    } catch (error) {
      const text =
        error instanceof ApiError ? (error.errors[0]?.message ?? error.message) : "Something went wrong. Please try again.";
      setNotice({ error: true, text });
    } finally {
      setBusy(null);
    }
  }

  if (!c) {
    return (
      <Dialog title="Complaint" onClose={onClose} side>
        <p role={loaded.error ? "alert" : undefined} className={`p-6 text-sm ${loaded.error ? "text-red-600" : "text-slate-500"}`}>
          {loaded.error ?? "Loading complaint…"}
        </p>
      </Dialog>
    );
  }

  const active = c.assignments.filter((a) => a.isActive);
  const canEscalate = c.allowedStatuses.includes("ESCALATED");
  const dueValue = due ?? toLocalInput(c.expectedResolutionAt);

  function submitStatus(event: FormEvent) {
    event.preventDefault();
    if (!nextStatus) return;
    run("status", () => admin.updateComplaint(c!.id, { status: nextStatus, remarks: statusRemarks || undefined }), `Status changed to ${label(nextStatus)}`, () => {
      setNextStatus("");
      setStatusRemarks("");
    });
  }

  function submitPlanning(event: FormEvent) {
    event.preventDefault();
    const body: { priority?: Priority; expectedResolutionAt?: string | null } = {};
    if (priority && priority !== c!.priority) body.priority = priority;
    if (due !== null) body.expectedResolutionAt = due ? new Date(due).toISOString() : null;
    if (!Object.keys(body).length) return;
    run("plan", () => admin.updateComplaint(c!.id, body), "Priority and due date saved", () => {
      setPriority("");
      setDue(null);
    });
  }

  function submitAssign(event: FormEvent) {
    event.preventDefault();
    if (!assignee) return;
    run(
      "assign",
      async () => {
        try {
          return await admin.assign(c!.id, assignee, assignRemarks);
        } catch (error) {
          // Someone of the same kind already holds it: hand it over instead
          if (error instanceof ApiError && error.status === 409 && /reassign/i.test(error.message)) {
            return admin.assign(c!.id, assignee, assignRemarks, true);
          }
          throw error;
        }
      },
      "Assignment saved",
      () => {
        setAssignee("");
        setAssignRemarks("");
      },
    );
  }

  return (
    <Dialog
      title={c.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#a5174d]">{c.complaintNumber}</span>
          <StaffStatusBadge status={c.status} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{c.priority}</span>
          {c.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">OVERDUE</span>}
        </span>
      }
      onClose={onClose}
      side
    >
      {notice && (
        <p
          role={notice.error ? "alert" : "status"}
          className={`mx-5 mt-4 rounded-lg px-3 py-2 text-xs font-medium ${notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {notice.text}
        </p>
      )}

      <Section title="Details">
        <Row name="Raised by">
          {c.requester.fullName} <span className="text-slate-400">({c.requester.loginId})</span>
        </Row>
        <Row name="Location">{c.location.label}</Row>
        <Row name="Category">{c.category}</Row>
        <Row name="Department">{c.department?.name ?? "Not routed"}</Row>
        <Row name="Raised">{formatDate(c.createdAt)}</Row>
        <Row name="Due">{c.expectedResolutionAt ? formatDate(c.expectedResolutionAt) : "Not set"}</Row>
        {c.description && <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{c.description}</p>}
        {c.attachments.length > 0 && (
          <ul className="mt-3 space-y-1">
            {c.attachments.map((a) => (
              <li key={a.id}>
                <a href={`/api/v1/complaints/${c.id}/attachments/${a.id}`} className="text-xs font-semibold text-[#a5174d] hover:underline">
                  {a.originalFilename}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Accept or reject">
        {c.decision === "ACCEPTED" && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Accepted by {c.decidedBy?.fullName ?? "staff"}
            {c.decidedAt ? ` on ${formatDate(c.decidedAt)}` : ""}
            {c.decisionReason ? ` — ${c.decisionReason}` : ""}
          </p>
        )}
        {c.decision === "REJECTED" && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Rejected by {c.decidedBy?.fullName ?? "staff"}
            {c.decidedAt ? ` on ${formatDate(c.decidedAt)}` : ""}: {c.decisionReason}
          </p>
        )}
        {!c.decision && !c.canDecide && <p className="text-sm text-slate-500">No accept or reject decision was recorded.</p>}
        {c.canDecide && (
          <div className="mt-3 space-y-3">
            {!c.decision && <p className="text-sm text-slate-500">Waiting for the caretaker or warden to accept or reject.</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={primaryButton}
                disabled={busy !== null}
                onClick={() => run("accept", () => complaintsApi.accept(c.id), "Complaint accepted")}
              >
                {busy === "accept" ? "Accepting…" : "Accept"}
              </button>
            </div>
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (rejectReason.trim().length < 5) {
                  setNotice({ error: true, text: "Give a reason of at least 5 characters to reject." });
                  return;
                }
                run("reject", () => complaintsApi.reject(c.id, rejectReason.trim()), "Complaint rejected", () => setRejectReason(""));
              }}
            >
              <Field label="Reject with reason (the student sees it)" htmlFor="reject-reason">
                <input
                  id="reject-reason"
                  className={inputClass}
                  value={rejectReason}
                  maxLength={1000}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </Field>
              <button type="submit" className={secondaryButton} disabled={busy !== null}>
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
            </form>
          </div>
        )}
      </Section>

      {c.similar.length > 0 && (
        <Section title={`Similar complaints (${c.similar.length})`}>
          <p className="mb-2 text-xs text-amber-700">The same issue was reported before at this place. It may be a recurring problem.</p>
          <ul className="space-y-1.5">
            {c.similar.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-slate-800">{s.complaintNumber}</span>{" "}
                  <span className="text-slate-600">{s.title}</span>
                </span>
                <span className="shrink-0 text-slate-400">{formatDate(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Status">
        {c.allowedStatuses.length ? (
          <form onSubmit={submitStatus} className="space-y-3">
            <Field label="Move to" htmlFor="next-status">
              <select id="next-status" className={inputClass} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}>
                <option value="">Choose the next status</option>
                {c.allowedStatuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Remarks (optional)" htmlFor="status-remarks">
              <input id="status-remarks" className={inputClass} value={statusRemarks} maxLength={1000} onChange={(e) => setStatusRemarks(e.target.value)} />
            </Field>
            <button type="submit" className={primaryButton} disabled={!nextStatus || busy !== null}>
              {busy === "status" ? "Saving…" : "Update status"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">This complaint is {label(c.status).toLowerCase()}; no further status changes are possible.</p>
        )}
      </Section>

      <Section title="Priority and due date">
        <form onSubmit={submitPlanning} className="grid gap-3 sm:grid-cols-2">
          <Field label="Priority" htmlFor="priority">
            <select id="priority" className={inputClass} value={priority || c.priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expected resolution" htmlFor="due" hint="Past this date it counts as overdue">
            <input id="due" type="datetime-local" className={inputClass} value={dueValue} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <button type="submit" className={secondaryButton} disabled={busy !== null || (!priority && due === null)}>
              {busy === "plan" ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Assignment">
        {active.length ? (
          <ul className="mb-4 space-y-1.5">
            {active.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{a.assignedTo.fullName}</span>
                <span className="text-[11px] font-semibold text-slate-500">{label(a.assignmentType)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Not assigned to anyone yet.</p>
        )}
        <form onSubmit={submitAssign} className="space-y-3">
          <Field
            label={active.length ? "Assign or hand over to" : "Assign to"}
            htmlFor="assignee"
            hint={c.hostel ? `Staff of ${c.hostel.name}` : c.department ? `Technicians of ${c.department.name}` : undefined}
          >
            <select id="assignee" className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={staff.loading}>
              <option value="">{staff.loading ? "Loading staff…" : staff.data?.length ? "Choose a staff member" : "No staff available"}</option>
              {(staff.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} · {u.roles.map(label).join(", ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note for the assignee (optional)" htmlFor="assign-remarks">
            <input id="assign-remarks" className={inputClass} value={assignRemarks} maxLength={1000} onChange={(e) => setAssignRemarks(e.target.value)} />
          </Field>
          <button type="submit" className={primaryButton} disabled={!assignee || busy !== null}>
            {busy === "assign" ? "Saving…" : "Assign"}
          </button>
        </form>
      </Section>

      {canEscalate && (
        <Section title="Escalate">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("escalate", () => admin.escalate(c.id, escalation.trim()), "Complaint escalated", () => setEscalation(""));
            }}
            className="space-y-3"
          >
            <Field label="Reason" htmlFor="escalation">
              <textarea id="escalation" rows={2} className={`${inputClass} h-auto py-2`} value={escalation} maxLength={1000} onChange={(e) => setEscalation(e.target.value)} />
            </Field>
            <button type="submit" className={secondaryButton} disabled={escalation.trim().length < 3 || busy !== null}>
              {busy === "escalate" ? "Escalating…" : "Escalate"}
            </button>
          </form>
        </Section>
      )}

      <Section title="Comments">
        <ul className="space-y-3">
          {c.comments.map((m) => (
            <li key={m.id} className={`rounded-lg p-3 text-sm ${m.visibility === "INTERNAL" ? "bg-amber-50" : "bg-slate-50"}`}>
              <p className="whitespace-pre-line text-slate-800">{m.comment}</p>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {m.author.fullName} · {timeAgo(m.createdAt)} · {m.visibility === "INTERNAL" ? "Staff only" : "Visible to requester"}
              </p>
            </li>
          ))}
          {!c.comments.length && <li className="text-sm text-slate-500">No comments yet.</li>}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("comment", () => admin.comment(c.id, comment.trim(), visibility), "Comment added", () => setComment(""));
          }}
          className="mt-4 space-y-3"
        >
          <label htmlFor="comment" className="sr-only">
            New comment
          </label>
          <textarea id="comment" rows={3} className={`${inputClass} h-auto py-2`} value={comment} maxLength={2000} placeholder="Write a comment…" onChange={(e) => setComment(e.target.value)} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <fieldset className="flex gap-4 text-xs text-slate-600">
              <legend className="sr-only">Who can see this comment</legend>
              {(["INTERNAL", "STUDENT_VISIBLE"] as CommentVisibility[]).map((v) => (
                <label key={v} className="flex items-center gap-1.5">
                  <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} />
                  {v === "INTERNAL" ? "Staff only" : "Visible to requester"}
                </label>
              ))}
            </fieldset>
            <button type="submit" className={secondaryButton} disabled={!comment.trim() || busy !== null}>
              {busy === "comment" ? "Posting…" : "Add comment"}
            </button>
          </div>
        </form>
      </Section>

      <Section title="History">
        <ol className="space-y-3">
          {[...c.history].reverse().map((h) => (
            <li key={h.id} className="flex gap-3 text-sm">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#a5174d]" />
              <div>
                <p className="text-slate-800">
                  {h.oldStatus ? `${label(h.oldStatus)} → ` : ""}
                  <span className="font-semibold">{label(h.newStatus)}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {h.changedBy?.fullName ?? "System"} · {timeAgo(h.createdAt)}
                  {h.remarks ? ` · ${h.remarks}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </Dialog>
  );
}

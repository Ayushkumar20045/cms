"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

import { Field, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { DecisionNote } from "@/components/complaints/request-actions";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { TicketLabels, TicketLinks, TicketSubtasks } from "@/components/tickets/organise";
import { WorkShell } from "@/components/tickets/work-shell";
import { ApiError } from "@/lib/api/client";
import { admin, board as boardApi, complaints as complaintsApi } from "@/lib/api/endpoints";
import type { CommentVisibility, ComplaintDetail, ComplaintStatus, Priority } from "@/lib/api/types";
import { formatDate, initials, timeAgo } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";
import { PRIORITY_STYLE, statusLabel as label } from "@/lib/tickets";

// Changes staff make through the work endpoint; anything else (an admin closing or rejecting) goes through the admin endpoint
const STAFF_SETTABLE: ComplaintStatus[] = ["UNDER_REVIEW", "IN_PROGRESS", "WAITING_FOR_INFORMATION", "WAITING_FOR_MATERIALS", "RESOLVED", "ESCALATED"];
const REQUESTER_ROLES = ["STUDENT", "FACULTY", "STAFF"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3 py-2 text-sm">
      <dt className="text-slate-500">{name}</dt>
      <dd className="min-w-0 font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function Person({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f8e9ef] text-[10px] font-bold text-[#8e123f]">
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

export default function TicketPage() {
  const params = useParams<{ key: string }>();
  const key = decodeURIComponent(params.key ?? "");
  const { user, signOut } = useSession("any");
  const ready = Boolean(user);
  const loaded = useLoad(() => (ready ? boardApi.ticket(key) : Promise.resolve(null)), [ready, key]);
  const [override, setOverride] = useState<ComplaintDetail | null>(null);
  const t = override && override.complaintNumber.toUpperCase() === key.toUpperCase() ? override : loaded.data;

  const perms = user?.permissions ?? [];
  const isRequester = Boolean(user && user.roles.every((r) => REQUESTER_ROLES.includes(r)));
  const isAdmin = perms.includes("COMPLAINT_VIEW_ALL");
  const canAssign = perms.includes("COMPLAINT_ASSIGN");
  const canInternal = perms.includes("COMPLAINT_COMMENT_INTERNAL") || isAdmin;
  const staffQuery = t ? (t.hostel ? { hostelId: t.hostel.id } : t.department ? { departmentId: t.department.id } : {}) : {};
  const staff = useLoad(() => (t && canAssign ? admin.staff(staffQuery) : Promise.resolve(null)), [t?.id, canAssign]);

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"comments" | "history">("comments");
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("STUDENT_VISIBLE");
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | null>(null);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [due, setDue] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);

  async function run(key: string, action: () => Promise<ComplaintDetail>, done: string, reset?: () => void) {
    setBusy(key);
    setNotice(null);
    try {
      setOverride(await action());
      reset?.();
      setNotice({ error: false, text: done });
    } catch (e) {
      setNotice({ error: true, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : "Something went wrong. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  if (!t) {
    return (
      <WorkShell user={user} onSignOut={signOut}>
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          {loaded.error ? (
            <>
              <h1 className="text-lg font-bold text-slate-900">Ticket {key} was not found</h1>
              <p role="alert" className="mt-2 text-sm text-slate-500">
                It does not exist, or you do not have access to it.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Loading {key}…</p>
          )}
        </main>
      </WorkShell>
    );
  }

  const ticket = t;
  const active = ticket.assignments.filter((a) => a.isActive);
  const p = PRIORITY_STYLE[ticket.priority];
  const changeStatus = (to: ComplaintStatus, remarks: string) =>
    STAFF_SETTABLE.includes(to) ? complaintsApi.setStatus(ticket.id, to, remarks) : admin.updateComplaint(ticket.id, { status: to, remarks: remarks || undefined });

  function submitStatus(event: FormEvent) {
    event.preventDefault();
    if (!nextStatus) return;
    run("status", () => changeStatus(nextStatus, note.trim()), `Moved to ${label(nextStatus)}`, () => {
      setNextStatus(null);
      setNote("");
      setStatusOpen(false);
    });
  }

  function submitAssign(event: FormEvent) {
    event.preventDefault();
    if (!assignee) return;
    run(
      "assign",
      async () => {
        try {
          return await admin.assign(ticket.id, assignee);
        } catch (e) {
          if (e instanceof ApiError && e.status === 409 && /reassign/i.test(e.message)) return admin.assign(ticket.id, assignee, undefined, true);
          throw e;
        }
      },
      "Assignee updated",
      () => setAssignee(""),
    );
  }

  function submitPlanning(event: FormEvent) {
    event.preventDefault();
    const body: { priority?: Priority; expectedResolutionAt?: string | null } = {};
    if (priority && priority !== ticket.priority) body.priority = priority;
    if (due !== null) body.expectedResolutionAt = due ? new Date(due).toISOString() : null;
    if (!Object.keys(body).length) return;
    run("plan", () => admin.updateComplaint(ticket.id, body), "Saved", () => {
      setPriority("");
      setDue(null);
    });
  }

  return (
    <WorkShell user={user} onSignOut={signOut}>
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <Link href={isRequester ? "/student/complaints" : "/board"} className="font-semibold text-[#a5174d] hover:underline">
            {isRequester ? "My Complaints" : "Board"}
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{ticket.complaintNumber}</span>
        </nav>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#a5174d]">{ticket.complaintNumber}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{ticket.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <StaffStatusBadge status={ticket.status} />
              <span className={`flex items-center gap-1 font-bold ${p.text}`}>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${p.dot}`} />
                {label(ticket.priority)} priority
              </span>
              {ticket.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700">OVERDUE</span>}
            </div>
          </div>

          {/* Workflow actions, like Jira's transition buttons */}
          <div className="flex flex-wrap gap-2">
            {ticket.canDecide && !rejecting && (
              <>
                <button type="button" disabled={busy !== null} className={`${primaryButton} bg-emerald-600 hover:bg-emerald-700`} onClick={() => run("accept", () => complaintsApi.accept(ticket.id), "Accepted")}>
                  Accept
                </button>
                <button type="button" disabled={busy !== null} className={`${secondaryButton} border-rose-200 text-rose-700`} onClick={() => setRejecting(true)}>
                  Reject
                </button>
              </>
            )}
            {!ticket.canDecide && ticket.allowedStatuses.length > 0 && (
              <button type="button" aria-expanded={statusOpen} className={primaryButton} onClick={() => setStatusOpen((o) => !o)}>
                Move ticket ▾
              </button>
            )}
            {isRequester && ticket.status === "RESOLVED" && !reopening && (
              <button type="button" className={secondaryButton} onClick={() => setReopening(true)}>
                Not fixed? Reopen
              </button>
            )}
          </div>
        </div>

        {notice && (
          <p role={notice.error ? "alert" : "status"} className={`mt-4 rounded-lg px-3 py-2 text-xs font-medium ${notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {notice.text}
          </p>
        )}

        {statusOpen && (
          <form onSubmit={submitStatus} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-700">Move to</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ticket.allowedStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={nextStatus === s}
                  onClick={() => setNextStatus(s)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${nextStatus === s ? "border-[#a5174d] bg-[#f8e9ef] text-[#8e123f]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {label(s)}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Field label="Note (optional)" htmlFor="status-note" hint="Shown in the history; the requester is told about the change.">
                <input id="status-note" className={inputClass} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" className={primaryButton} disabled={!nextStatus || busy !== null}>
                {busy === "status" ? "Moving…" : "Move"}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setStatusOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {rejecting && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("reject", () => complaintsApi.reject(ticket.id, reason.trim()), "Rejected", () => {
                setRejecting(false);
                setReason("");
              });
            }}
            className="mt-4 rounded-2xl border border-rose-200 bg-white p-4"
          >
            <Field label="Reason for rejecting (the requester sees this)" htmlFor="reject-reason">
              <textarea id="reject-reason" rows={2} autoFocus className={`${inputClass} h-auto py-2`} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="mt-3 flex gap-2">
              <button type="submit" className={`${primaryButton} bg-rose-600 hover:bg-rose-700`} disabled={reason.trim().length < 5 || busy !== null}>
                Confirm reject
              </button>
              <button type="button" className={secondaryButton} onClick={() => setRejecting(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {reopening && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("reopen", () => boardApi.reopen(ticket.id, reason.trim()), "Reopened — the team has been told", () => {
                setReopening(false);
                setReason("");
              });
            }}
            className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <Field label="What is still wrong?" htmlFor="reopen-reason">
              <textarea id="reopen-reason" rows={2} autoFocus className={`${inputClass} h-auto py-2`} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="mt-3 flex gap-2">
              <button type="submit" className={primaryButton} disabled={reason.trim().length < 3 || busy !== null}>
                Reopen
              </button>
              <button type="button" className={secondaryButton} onClick={() => setReopening(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main column */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{ticket.description || "No description given."}</p>
              {ticket.attachments.length > 0 && (
                <>
                  <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Attachments</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {ticket.attachments.map((a) => (
                      <li key={a.id}>
                        <a href={`/api/v1/complaints/${ticket.id}/attachments/${a.id}`} className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#a5174d] hover:bg-slate-50">
                          {a.originalFilename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <DecisionNote complaint={ticket} />
            </section>

            {!isRequester && (
              <>
                <TicketSubtasks ticket={ticket} busy={busy} run={run} />
                <TicketLinks ticket={ticket} busy={busy} run={run} />
              </>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white">
              <div role="tablist" aria-label="Activity" className="flex gap-1 border-b border-slate-200 px-3 pt-3">
                {([
                  ["comments", `Comments (${ticket.comments.length})`],
                  ["history", `History (${ticket.history.length})`],
                ] as const).map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold ${tab === value ? "border-b-2 border-[#a5174d] text-[#8e123f]" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {text}
                  </button>
                ))}
              </div>

              {tab === "comments" ? (
                <div className="p-5">
                  <ul className="space-y-4">
                    {ticket.comments.map((m) => (
                      <li key={m.id} className="flex gap-3">
                        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f8e9ef] text-xs font-bold text-[#8e123f]">
                          {initials(m.author.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">{m.author.fullName}</span> · {timeAgo(m.createdAt)}
                            {m.visibility === "INTERNAL" && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">STAFF ONLY</span>}
                          </p>
                          <p className={`mt-1 whitespace-pre-line rounded-lg p-3 text-sm text-slate-800 ${m.visibility === "INTERNAL" ? "bg-amber-50" : "bg-slate-50"}`}>{m.comment}</p>
                        </div>
                      </li>
                    ))}
                    {!ticket.comments.length && <li className="text-sm text-slate-500">No comments yet.</li>}
                  </ul>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run("comment", () => admin.comment(ticket.id, comment.trim(), canInternal ? visibility : "STUDENT_VISIBLE"), "Comment added", () => setComment(""));
                    }}
                    className="mt-5 space-y-2"
                  >
                    <label htmlFor="new-comment" className="sr-only">
                      Add a comment
                    </label>
                    <textarea id="new-comment" rows={3} className={`${inputClass} h-auto py-2`} value={comment} maxLength={2000} placeholder="Add a comment…" onChange={(e) => setComment(e.target.value)} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {canInternal ? (
                        <fieldset className="flex gap-4 text-xs text-slate-600">
                          <legend className="sr-only">Who can see this comment</legend>
                          {(["STUDENT_VISIBLE", "INTERNAL"] as CommentVisibility[]).map((v) => (
                            <label key={v} className="flex items-center gap-1.5">
                              <input type="radio" name="visibility" checked={visibility === v} onChange={() => setVisibility(v)} />
                              {v === "INTERNAL" ? "Staff only" : "Visible to requester"}
                            </label>
                          ))}
                        </fieldset>
                      ) : (
                        <span className="text-xs text-slate-400">The staff handling this ticket will see your comment.</span>
                      )}
                      <button type="submit" className={secondaryButton} disabled={!comment.trim() || busy !== null}>
                        {busy === "comment" ? "Posting…" : "Comment"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <ol className="space-y-4 p-5">
                  {[...ticket.history].reverse().map((h) => (
                    <li key={h.id} className="flex gap-3 text-sm">
                      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#a5174d]" />
                      <div>
                        <p className="text-slate-800">
                          {h.changedBy?.fullName ?? (isRequester ? "Status update" : "System")}:{" "}
                          {h.oldStatus ? `${label(h.oldStatus)} → ` : "created as "}
                          <span className="font-semibold">{label(h.newStatus)}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(h.createdAt)} · {timeAgo(h.createdAt)}
                          {h.remarks ? ` · “${h.remarks}”` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {/* Details sidebar */}
          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">Details</h2>
              <dl className="mt-2 divide-y divide-slate-100">
                <DetailRow name="Status">
                  <StaffStatusBadge status={ticket.status} />
                </DetailRow>
                <DetailRow name="Assignee">
                  {active.length ? (
                    <span className="space-y-1.5">
                      {active.map((a) => (
                        <span key={a.id} className="block">
                          <Person name={a.assignedTo.fullName} />
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </DetailRow>
                <DetailRow name="Reporter">
                  <Person name={ticket.requester.fullName} />
                </DetailRow>
                <DetailRow name="Priority">{label(ticket.priority)}</DetailRow>
                {!isRequester && (
                  <DetailRow name="Labels">
                    <TicketLabels ticket={ticket} busy={busy} run={run} />
                  </DetailRow>
                )}
                <DetailRow name="Category">{ticket.category}</DetailRow>
                <DetailRow name="Department">{ticket.department?.name ?? "—"}</DetailRow>
                <DetailRow name="Location">{ticket.location.label}</DetailRow>
                <DetailRow name="Due">{ticket.expectedResolutionAt ? formatDate(ticket.expectedResolutionAt) : "Not set"}</DetailRow>
                <DetailRow name="Created">{formatDate(ticket.createdAt)}</DetailRow>
                <DetailRow name="Updated">{timeAgo(ticket.updatedAt)}</DetailRow>
                {ticket.resolvedAt && <DetailRow name="Resolved">{formatDate(ticket.resolvedAt)}</DetailRow>}
              </dl>
            </section>

            {canAssign && (
              <form onSubmit={submitAssign} className="rounded-2xl border border-slate-200 bg-white p-5">
                <Field label="Assign to" htmlFor="ticket-assignee" hint={ticket.hostel ? `Staff of ${ticket.hostel.name}` : ticket.department ? `Staff of ${ticket.department.name}` : undefined}>
                  <select id="ticket-assignee" className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">{staff.loading ? "Loading…" : "Choose a staff member"}</option>
                    {(staff.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} · {u.roles.map(label).join(", ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <button type="submit" className={`${secondaryButton} mt-3 w-full`} disabled={!assignee || busy !== null}>
                  {busy === "assign" ? "Saving…" : "Assign"}
                </button>
              </form>
            )}

            {isAdmin && (
              <form onSubmit={submitPlanning} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <Field label="Priority" htmlFor="ticket-priority">
                  <select id="ticket-priority" className={inputClass} value={priority || ticket.priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((x) => (
                      <option key={x} value={x}>
                        {label(x)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Due date" htmlFor="ticket-due" hint="Past this it counts as overdue">
                  <input id="ticket-due" type="datetime-local" className={inputClass} value={due ?? toLocalInput(ticket.expectedResolutionAt)} onChange={(e) => setDue(e.target.value)} />
                </Field>
                <button type="submit" className={`${secondaryButton} w-full`} disabled={busy !== null || (!priority && due === null)}>
                  {busy === "plan" ? "Saving…" : "Save"}
                </button>
              </form>
            )}

            {ticket.similar.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <h2 className="text-sm font-bold text-amber-800">Possibly recurring</h2>
                <p className="mt-1 text-xs text-amber-800/80">The same issue was reported at this place recently.</p>
                <ul className="mt-3 space-y-2">
                  {ticket.similar.map((s) => (
                    <li key={s.id} className="text-xs">
                      <Link href={`/tickets/${s.complaintNumber}`} className="font-bold text-[#a5174d] hover:underline">
                        {s.complaintNumber}
                      </Link>{" "}
                      <span className="text-slate-700">{s.title}</span>
                      <span className="block text-[11px] text-slate-500">
                        {label(s.status)} · {formatDate(s.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>
    </WorkShell>
  );
}

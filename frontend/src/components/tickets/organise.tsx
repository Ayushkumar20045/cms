"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { board as boardApi } from "@/lib/api/endpoints";
import type { ComplaintDetail, Label, LinkChoice, SubtaskStatus } from "@/lib/api/types";
import { useLoad } from "@/lib/session";
import { LABEL_STYLE } from "@/lib/tickets";

type Run = (key: string, action: () => Promise<ComplaintDetail>, done: string, reset?: () => void) => void;

interface Props {
  ticket: ComplaintDetail;
  busy: string | null;
  run: Run;
}

export function LabelChip({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${LABEL_STYLE[label.color] ?? LABEL_STYLE.slate}`}>
      {label.name}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove label ${label.name}`} className="-mr-0.5 rounded px-0.5 leading-none opacity-60 hover:opacity-100">
          ×
        </button>
      )}
    </span>
  );
}

/** Labels row for the details sidebar: chips, and an add box with suggestions from the shared list. */
export function TicketLabels({ ticket, busy, run }: Props) {
  const [name, setName] = useState("");
  const all = useLoad(() => (ticket.canOrganise ? boardApi.labels() : Promise.resolve(null)), [ticket.canOrganise, ticket.labels.length]);
  const onTicket = new Set(ticket.labels.map((l) => l.id));

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2) return;
    run("label", () => boardApi.addLabel(ticket.id, value), `Label "${value.toLowerCase()}" added`, () => setName(""));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {ticket.labels.map((l) => (
          <LabelChip
            key={l.id}
            label={l}
            onRemove={ticket.canOrganise && busy === null ? () => run("label", () => boardApi.removeLabel(ticket.id, l.id), `Label "${l.name}" removed`) : undefined}
          />
        ))}
        {!ticket.labels.length && <span className="text-slate-400">None</span>}
      </div>
      {ticket.canOrganise && (
        <form onSubmit={submit} className="flex gap-1.5">
          <label htmlFor="label-name" className="sr-only">
            Add a label
          </label>
          <input
            id="label-name"
            list="label-suggestions"
            className={`${inputClass} h-8 text-xs`}
            placeholder="Add a label…"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <datalist id="label-suggestions">
            {(all.data ?? []).filter((l) => !onTicket.has(l.id)).map((l) => (
              <option key={l.id} value={l.name} />
            ))}
          </datalist>
          <button type="submit" className={`${secondaryButton} h-8 px-3 text-xs`} disabled={name.trim().length < 2 || busy !== null}>
            Add
          </button>
        </form>
      )}
    </div>
  );
}

const SUBTASK_STATUSES: { value: SubtaskStatus; text: string }[] = [
  { value: "TODO", text: "To do" },
  { value: "IN_PROGRESS", text: "In progress" },
  { value: "DONE", text: "Done" },
];

const SUBTASK_STYLE: Record<SubtaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  DONE: "bg-emerald-50 text-emerald-700",
};

/** The steps of a bigger job, each with its own owner and state. */
export function TicketSubtasks({ ticket, busy, run }: Props) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [adding, setAdding] = useState(false);
  const people = useLoad(() => (ticket.canOrganise && adding ? boardApi.subtaskAssignees(ticket.id) : Promise.resolve(null)), [ticket.id, ticket.canOrganise, adding]);
  const done = ticket.subtasks.filter((s) => s.status === "DONE").length;
  const total = ticket.subtasks.length;

  if (!total && !ticket.canOrganise) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    run("subtask", () => boardApi.addSubtask(ticket.id, title.trim(), assignee || undefined), "Sub-task added", () => {
      setTitle("");
      setAssignee("");
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="subtasks-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="subtasks-heading" className="text-sm font-bold text-slate-900">
          Sub-tasks
        </h2>
        {total > 0 && (
          <span className="text-xs font-semibold text-slate-500">
            {done} of {total} done
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Sub-tasks done" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}

      <ul className="mt-3 divide-y divide-slate-100">
        {ticket.subtasks.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <span className={`min-w-0 flex-1 text-sm ${s.status === "DONE" ? "text-slate-400 line-through" : "font-medium text-slate-800"}`}>{s.title}</span>
            <span className="text-xs text-slate-500">{s.assignee ? s.assignee.fullName : "Unassigned"}</span>
            {s.canUpdate ? (
              <select
                aria-label={`Status of ${s.title}`}
                value={s.status}
                disabled={busy !== null}
                onChange={(e) => run("subtask", () => boardApi.updateSubtask(s.id, { status: e.target.value as SubtaskStatus }), "Sub-task updated")}
                className={`h-7 rounded-md border-0 px-2 text-xs font-semibold ${SUBTASK_STYLE[s.status]}`}
              >
                {SUBTASK_STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.text}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${SUBTASK_STYLE[s.status]}`}>{SUBTASK_STATUSES.find((o) => o.value === s.status)?.text}</span>
            )}
            {ticket.canOrganise && (
              <button
                type="button"
                aria-label={`Remove sub-task ${s.title}`}
                disabled={busy !== null}
                onClick={() => run("subtask", () => boardApi.deleteSubtask(s.id), "Sub-task removed")}
                className="rounded px-1.5 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                ×
              </button>
            )}
          </li>
        ))}
        {!total && <li className="py-2 text-sm text-slate-500">Break a bigger job into steps, each with its own owner.</li>}
      </ul>

      {ticket.canOrganise &&
        (adding ? (
          <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
            <label htmlFor="subtask-title" className="sr-only">
              Sub-task
            </label>
            <input id="subtask-title" autoFocus className={inputClass} placeholder="e.g. Buy replacement tube lights" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
            <label htmlFor="subtask-assignee" className="sr-only">
              Assign to
            </label>
            <select id="subtask-assignee" className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">{people.loading ? "Loading…" : "Unassigned"}</option>
              {(people.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className={primaryButton} disabled={title.trim().length < 3 || busy !== null}>
                {busy === "subtask" ? "Adding…" : "Add"}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setAdding(false)}>
                Done
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="mt-3 text-sm font-semibold text-[#a5174d] hover:underline" onClick={() => setAdding(true)}>
            + Add sub-task
          </button>
        ))}
    </section>
  );
}

const LINK_CHOICES: { value: LinkChoice; text: string }[] = [
  { value: "RELATES_TO", text: "relates to" },
  { value: "BLOCKS", text: "blocks" },
  { value: "IS_BLOCKED_BY", text: "is blocked by" },
  { value: "DUPLICATES", text: "duplicates" },
  { value: "IS_DUPLICATED_BY", text: "is duplicated by" },
];

/** Ticket-to-ticket links, grouped by how they read from this ticket. */
export function TicketLinks({ ticket, busy, run }: Props) {
  const [adding, setAdding] = useState(false);
  const [choice, setChoice] = useState<LinkChoice>("RELATES_TO");
  const [key, setKey] = useState("");

  if (!ticket.links.length && !ticket.canOrganise) return null;

  const groups = ticket.links.reduce<Record<string, ComplaintDetail["links"]>>((acc, l) => {
    (acc[l.label] ??= []).push(l);
    return acc;
  }, {});

  function submit(event: FormEvent) {
    event.preventDefault();
    const target = key.trim().toUpperCase();
    run("link", () => boardApi.addLink(ticket.id, target, choice), `Linked to ${target}`, () => setKey(""));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="links-heading">
      <h2 id="links-heading" className="text-sm font-bold text-slate-900">
        Linked tickets
      </h2>
      <div className="mt-3 space-y-3">
        {Object.entries(groups).map(([wording, links]) => (
          <div key={wording}>
            <p className="text-xs font-semibold text-slate-500">This ticket {wording}</p>
            <ul className="mt-1.5 space-y-1.5">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <Link href={`/tickets/${l.ticket.complaintNumber}`} className="shrink-0 font-bold text-[#a5174d] hover:underline">
                    {l.ticket.complaintNumber}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{l.ticket.title}</span>
                  <StaffStatusBadge status={l.ticket.status} />
                  {ticket.canOrganise && (
                    <button
                      type="button"
                      aria-label={`Remove link to ${l.ticket.complaintNumber}`}
                      disabled={busy !== null}
                      onClick={() => run("link", () => boardApi.removeLink(ticket.id, l.id), "Link removed")}
                      className="rounded px-1.5 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!ticket.links.length && <p className="text-sm text-slate-500">Mark duplicates, or tickets that must be fixed first.</p>}
      </div>

      {ticket.canOrganise &&
        (adding ? (
          <form onSubmit={submit} className="mt-3 grid items-center gap-2 sm:grid-cols-[auto_160px_minmax(0,1fr)_auto]">
            <label htmlFor="link-type" className="text-sm font-medium text-slate-600">
              This ticket
            </label>
            <select id="link-type" className={inputClass} value={choice} onChange={(e) => setChoice(e.target.value as LinkChoice)}>
              {LINK_CHOICES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.text}
                </option>
              ))}
            </select>
            <label htmlFor="link-key" className="sr-only">
              Ticket key
            </label>
            <input id="link-key" autoFocus className={inputClass} placeholder="Ticket key, e.g. CMP-2026-0004" value={key} maxLength={30} onChange={(e) => setKey(e.target.value)} />
            <div className="flex gap-2">
              <button type="submit" className={primaryButton} disabled={key.trim().length < 3 || busy !== null}>
                {busy === "link" ? "Linking…" : "Link"}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setAdding(false)}>
                Done
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="mt-3 text-sm font-semibold text-[#a5174d] hover:underline" onClick={() => setAdding(true)}>
            + Link a ticket
          </button>
        ))}
    </section>
  );
}

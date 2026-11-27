"use client";

import Link from "next/link";
import { DragEvent, FormEvent, useEffect, useState } from "react";

import { Dialog, Field, filterClass, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { LabelChip } from "@/components/tickets/organise";
import { WorkShell } from "@/components/tickets/work-shell";
import { ApiError } from "@/lib/api/client";
import { board as boardApi, complaints as complaintsApi } from "@/lib/api/endpoints";
import type { BoardCard, BoardColumn, ComplaintStatus, Priority } from "@/lib/api/types";
import { initials, timeAgo } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";
import { PRIORITY_STYLE, statusLabel } from "@/lib/tickets";

const label = statusLabel;

// Moves that ask for a short note, like Jira's transition screens
const NOTE_FOR: ComplaintStatus[] = ["RESOLVED", "WAITING_FOR_MATERIALS", "WAITING_FOR_INFORMATION", "ESCALATED"];

type PendingMove = { card: BoardCard; to: ComplaintStatus };

function Card({
  card,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onAccept,
  busy,
}: {
  card: BoardCard;
  dragging: boolean;
  onDragStart: (card: BoardCard) => void;
  onDragEnd: () => void;
  onMove: (card: BoardCard, to: ComplaintStatus) => void;
  onAccept: (card: BoardCard) => void;
  busy: boolean;
}) {
  const movable = card.allowedMoves.length > 0;
  const p = PRIORITY_STYLE[card.priority];
  return (
    <li
      draggable={movable && !busy}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(card);
      }}
      onDragEnd={onDragEnd}
      className={`rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition ${
        dragging ? "opacity-40" : ""
      } ${movable ? "cursor-grab active:cursor-grabbing" : ""} ${card.isOverdue ? "border-rose-200" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tickets/${card.complaintNumber}`} className="text-[11px] font-bold text-[#a5174d] hover:underline">
          {card.complaintNumber}
        </Link>
        <span className={`flex items-center gap-1 text-[10px] font-bold ${p.text}`} title={`Priority: ${label(card.priority)}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${p.dot}`} />
          {card.priority}
        </span>
      </div>
      <Link href={`/tickets/${card.complaintNumber}`} className="mt-1.5 block text-sm font-semibold leading-snug text-slate-900 hover:text-[#8e123f]">
        {card.title}
      </Link>
      <p className="mt-1.5 truncate text-[11px] text-slate-500" title={card.location.label}>
        {card.category} · {card.location.label}
      </p>
      {(card.labels.length > 0 || card.subtasks) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {card.labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {card.labels.length > 3 && <span className="text-[10px] font-semibold text-slate-400">+{card.labels.length - 3}</span>}
          {card.subtasks && (
            <span
              className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold ${card.subtasks.done === card.subtasks.total ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
              title={`${card.subtasks.done} of ${card.subtasks.total} sub-tasks done`}
            >
              <span aria-hidden="true">☑ </span>
              {card.subtasks.done}/{card.subtasks.total}
              <span className="sr-only"> sub-tasks done</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              card.assignedTo ? "bg-[#f8e9ef] text-[#8e123f]" : "border border-dashed border-slate-300 text-slate-400"
            }`}
          >
            {card.assignedTo ? initials(card.assignedTo) : "?"}
          </span>
          <span className="truncate text-[11px] text-slate-500">{card.assignedTo ?? "Unassigned"}</span>
        </div>
        <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(card.updatedAt)}</span>
      </div>

      {(card.isOverdue || card.status === "REOPENED") && (
        <div className="mt-2 flex gap-1.5">
          {card.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">OVERDUE</span>}
          {card.status === "REOPENED" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">REOPENED</span>}
        </div>
      )}

      {card.needsDecision ? (
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAccept(card)}
            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Accept
          </button>
          <Link href={`/tickets/${card.complaintNumber}`} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">
            Reject…
          </Link>
        </div>
      ) : movable ? (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <label className="sr-only" htmlFor={`move-${card.id}`}>
            Move {card.complaintNumber} to
          </label>
          <select
            id={`move-${card.id}`}
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && onMove(card, e.target.value as ComplaintStatus)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-[#a5174d]"
          >
            <option value="">Move to…</option>
            {card.allowedMoves.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </li>
  );
}

function Column({
  column,
  dragged,
  onDrop,
  children,
}: {
  column: BoardColumn;
  dragged: BoardCard | null;
  onDrop: (to: ComplaintStatus) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  const canDrop = Boolean(dragged && dragged.allowedMoves.includes(column.status));
  const isSource = Boolean(dragged && column.statuses.includes(dragged.status));

  return (
    <section
      aria-label={`${column.title}, ${column.total} tickets`}
      onDragOver={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (canDrop) onDrop(column.status);
      }}
      className={`flex w-[280px] shrink-0 flex-col rounded-2xl border p-2.5 transition ${
        over ? "border-[#a5174d] bg-[#f8e9ef]" : canDrop ? "border-dashed border-[#d98aa8] bg-[#fdf6f9]" : "border-slate-200 bg-slate-100/70"
      } ${dragged && !canDrop && !isSource ? "opacity-50" : ""}`}
    >
      <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">{column.title}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">{column.total}</span>
      </header>
      <ul className="flex min-h-[80px] flex-1 flex-col gap-2.5">{children}</ul>
      {column.total > column.cards.length && (
        <p className="px-1.5 pt-2 text-[11px] text-slate-500">Showing {column.cards.length} of {column.total}</p>
      )}
    </section>
  );
}

export default function BoardPage() {
  const { user, signOut } = useSession("board");
  const ready = Boolean(user);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [assignee, setAssignee] = useState<"" | "me" | "unassigned">("");
  const [labelFilter, setLabelFilter] = useState("");
  const [dragged, setDragged] = useState<BoardCard | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const categories = useLoad(() => (ready ? complaintsApi.categories() : Promise.resolve(null)), [ready]);
  const seesLabels = Boolean(user?.permissions.some((x) => x === "COMPLAINT_ORGANISE" || x === "COMPLAINT_VIEW_ALL"));
  const labels = useLoad(() => (ready && seesLabels ? boardApi.labels() : Promise.resolve(null)), [ready, seesLabels]);
  const data = useLoad(
    () => (ready ? boardApi.get({ search: query, category, priority, assignee, label: labelFilter || undefined }) : Promise.resolve(null)),
    [ready, query, category, priority, assignee, labelFilter],
  );
  const columns = data.data?.columns ?? [];
  const total = columns.reduce((n, c) => n + c.total, 0);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ error: false, text: done });
      data.reload();
    } catch (e) {
      setNotice({ error: true, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function move(card: BoardCard, to: ComplaintStatus) {
    if (NOTE_FOR.includes(to)) {
      setNote("");
      setPending({ card, to });
      return;
    }
    run(() => complaintsApi.setStatus(card.id, to), `${card.complaintNumber} moved to ${label(to)}`);
  }

  function confirmMove(event: FormEvent) {
    event.preventDefault();
    if (!pending) return;
    const { card, to } = pending;
    setPending(null);
    run(() => complaintsApi.setStatus(card.id, to, note.trim()), `${card.complaintNumber} moved to ${label(to)}`);
  }

  return (
    <WorkShell user={user} onSignOut={signOut}>
      <main className="px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ticket Board</h1>
            <p className="mt-1 text-sm text-slate-500">
              {data.data ? `${total} ticket${total === 1 ? "" : "s"} you can see.` : "Loading tickets…"} Drag a card to move it — only the moves the workflow allows are offered.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="board-search" className="sr-only">
              Search tickets
            </label>
            <input id="board-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key, title, category…" className={`${filterClass} w-full sm:w-[240px]`} />
            <label htmlFor="board-category" className="sr-only">
              Category
            </label>
            <select id="board-category" className={filterClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <label htmlFor="board-priority" className="sr-only">
              Priority
            </label>
            <select id="board-priority" className={filterClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")}>
              <option value="">All priorities</option>
              {(["URGENT", "HIGH", "MEDIUM", "LOW"] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
            {(labels.data?.length ?? 0) > 0 && (
              <>
                <label htmlFor="board-label" className="sr-only">
                  Label
                </label>
                <select id="board-label" className={filterClass} value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
                  <option value="">All labels</option>
                  {(labels.data ?? []).map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div role="group" aria-label="Assignee" className="flex rounded-lg border border-slate-200 bg-white p-1">
              {([
                ["", "Everyone"],
                ["me", "Only mine"],
                ["unassigned", "Unassigned"],
              ] as const).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={assignee === value}
                  onClick={() => setAssignee(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${assignee === value ? "bg-[#f8e9ef] text-[#8e123f]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>

        {notice && (
          <p role={notice.error ? "alert" : "status"} className={`mt-4 rounded-lg px-3 py-2 text-xs font-medium ${notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {notice.text}
          </p>
        )}

        {data.error ? (
          <p role="alert" className="mt-10 text-center text-sm text-red-600">
            {data.error}
          </p>
        ) : data.loading || !data.data ? (
          <p className="mt-10 text-center text-sm text-slate-500">Loading the board…</p>
        ) : (
          <div className="mt-5 flex gap-3 overflow-x-auto pb-4">
            {columns.map((column) => (
              <Column key={column.status} column={column} dragged={dragged} onDrop={(to) => dragged && move(dragged, to)}>
                {column.cards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    busy={busy}
                    dragging={dragged?.id === card.id}
                    onDragStart={setDragged}
                    onDragEnd={() => setDragged(null)}
                    onMove={move}
                    onAccept={(c) => run(() => complaintsApi.accept(c.id), `${c.complaintNumber} accepted`)}
                  />
                ))}
                {column.cards.length === 0 && <li className="px-1.5 py-3 text-center text-[11px] text-slate-400">No tickets</li>}
              </Column>
            ))}
          </div>
        )}
      </main>

      {pending && (
        <Dialog title={`Move to ${label(pending.to)}`} subtitle={`${pending.card.complaintNumber} · ${pending.card.title}`} onClose={() => setPending(null)}>
          <form onSubmit={confirmMove}>
            <div className="p-5">
              <Field
                label={pending.to === "RESOLVED" ? "What was done? (optional)" : pending.to === "ESCALATED" ? "Why escalate? (optional)" : "Note (optional)"}
                htmlFor="move-note"
                hint={pending.to === "RESOLVED" ? "The requester is told their complaint is resolved." : "Shown in the ticket's history."}
              >
                <textarea id="move-note" rows={3} autoFocus className={`${inputClass} h-auto py-2`} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button type="button" className={secondaryButton} onClick={() => setPending(null)}>
                Cancel
              </button>
              <button type="submit" className={primaryButton}>
                Move
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </WorkShell>
  );
}

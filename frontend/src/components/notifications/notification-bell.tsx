"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { notifications as notificationsApi } from "@/lib/api/endpoints";
import type { AppNotification } from "@/lib/api/types";
import { timeAgo } from "@/lib/format";
import { NOTIFICATION_EVENT } from "@/lib/session";

const POLL_MS = 20_000;
const TOAST_MS = 12_000;

const tone: Record<string, string> = {
  COMPLAINT_REJECTED: "border-l-rose-500",
  COMPLAINT_ACCEPTED: "border-l-emerald-500",
  RECURRING_ISSUE: "border-l-amber-500",
};

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Bell with unread count and a dropdown of recent notifications, plus a popup in the corner whenever a new
 * notification arrives (e.g. a new complaint for a caretaker, a decision for a student, a recurring issue for
 * a warden). Polls the backend; the user's notifications are scoped to them by the server.
 */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const seen = useRef<Set<number> | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await notificationsApi.list(15);
      setItems(list.items);
      setUnread(list.unread);
      // The first load only records what exists; later loads pop up anything new and unread
      if (seen.current === null) {
        seen.current = new Set(list.items.map((n) => n.id));
        return;
      }
      const fresh = list.items.filter((n) => !n.read && !seen.current!.has(n.id));
      list.items.forEach((n) => seen.current!.add(n.id));
      if (fresh.length) {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
        setToasts((current) => [...fresh.slice(0, 3), ...current].slice(0, 3));
        for (const n of fresh) {
          setTimeout(() => setToasts((current) => current.filter((t) => t.id !== n.id)), TOAST_MS);
        }
      }
    } catch {
      // Signed out or offline: the page's own session handling takes care of it
    }
  }, []);

  useEffect(() => {
    // Defer the first load so it does not run synchronously inside the effect
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function openNotification(n: AppNotification) {
    setOpen(false);
    setToasts((current) => current.filter((t) => t.id !== n.id));
    if (!n.read) {
      try {
        const result = await notificationsApi.markRead(n.id);
        setUnread(result.unread);
        setItems((current) => current.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        // Reading still works even if marking as read fails
      }
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    try {
      await notificationsApi.markAllRead();
      setUnread(0);
      setItems((current) => current.map((n) => ({ ...n, read: true })));
    } catch {
      // Leave the list as it is
    }
  }

  return (
    <>
      <div className="relative" ref={panel}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
          aria-expanded={open}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#a5174d] px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-[11px] font-semibold text-[#a5174d] hover:text-[#8e123f]">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">No notifications yet.</p>}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`block w-full border-b border-l-4 border-b-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    tone[n.kind] ?? "border-l-[#a5174d]"
                  } ${n.read ? "bg-white" : "bg-[#fdf7f9]"}`}
                >
                  <p className={`text-xs ${n.read ? "font-medium text-slate-600" : "font-semibold text-slate-900"}`}>{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {toasts.length > 0 && (
        <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
          {toasts.map((n) => (
            <div
              key={n.id}
              role="status"
              className={`rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-2xl ${tone[n.kind] ?? "border-l-[#a5174d]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => openNotification(n)} className="text-left">
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{n.body}</p>
                </button>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setToasts((current) => current.filter((t) => t.id !== n.id))}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

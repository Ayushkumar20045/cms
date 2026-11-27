"use client";

import { useState } from "react";

import { staff as staffApi } from "@/lib/api/endpoints";
import type { RecurringIssue } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/session";

const DISMISSED_KEY = "gbu-recurring-dismissed";

function readDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function signature(issue: RecurringIssue): string {
  return `${issue.key}:${issue.count}`;
}

/**
 * Problems reported again and again (same place and category). Pops up once per new pattern in a browser
 * session, and lists every recurring issue in a panel. Data is limited to the viewer's hostel, department
 * or (admins) the whole campus by the backend.
 */
export function RecurringIssues({ ready }: { ready: boolean }) {
  const issues = useLoad(() => (ready ? staffApi.recurring() : Promise.resolve(null)), [ready]);
  const list = issues.data ?? [];
  // Popup shows issues whose current size has not been dismissed in this browser session
  const [dismissed, setDismissed] = useState<string[]>(() => (typeof window === "undefined" ? [] : readDismissed()));
  const popup = list.filter((issue) => !dismissed.includes(signature(issue)));

  function dismiss() {
    const next = [...dismissed, ...popup.map(signature)];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Without storage the popup simply shows again next time
    }
  }

  if (!ready || list.length === 0) {
    return null;
  }

  return (
    <>
      {popup.length > 0 && (
        <div role="dialog" aria-modal="true" aria-labelledby="recurring-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={dismiss} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">Recurring issue</p>
              <h2 id="recurring-title" className="mt-1 text-lg font-bold text-slate-900">
                The same problem keeps being reported
              </h2>
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto px-5 py-4">
              {popup.map((issue) => (
                <div key={issue.key} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {issue.count} complaints: {issue.category} at {issue.location}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Latest: &ldquo;{issue.title}&rdquo; · {issue.open} still open · since {formatDate(issue.firstAt)}
                  </p>
                </div>
              ))}
              <p className="text-xs leading-5 text-slate-500">
                A repeated complaint usually points to a root cause (for example a failing pipe or wiring) rather than a
                one-off fault. Consider a permanent fix instead of repeated repairs.
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg bg-[#a5174d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8e123f]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <section aria-labelledby="recurring-panel" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="recurring-panel" className="text-base font-bold text-slate-900">
              Recurring issues
            </h3>
            <p className="mt-1 text-xs text-slate-500">Similar complaints raised again and again in the last two weeks.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">{list.length}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {list.map((issue) => (
            <div key={issue.key} className="rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  {issue.category} · {issue.location}
                </p>
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {issue.count}×
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {issue.open} open · first {formatDate(issue.firstAt)} · latest {formatDate(issue.latestAt)}
              </p>
              <ul className="mt-2 space-y-1">
                {issue.complaints.slice(0, 4).map((c) => (
                  <li key={c.id} className="truncate text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">{c.complaintNumber}</span> {c.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

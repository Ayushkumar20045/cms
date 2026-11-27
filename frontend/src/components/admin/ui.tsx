"use client";

import { ReactNode, useEffect, useRef } from "react";

/** Building blocks shared by the administration pages, in the portal's existing visual style. */

export const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#a5174d] focus:ring-2 focus:ring-[#a5174d]/10 disabled:bg-slate-50 disabled:text-slate-400";

export const filterClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-[#a5174d] focus:ring-2 focus:ring-[#a5174d]/10";

export const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-lg bg-[#a5174d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#8e123f] disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButton =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

export function StatCard({ title, value, subtitle, tone }: { title: string; value: ReactNode; subtitle?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tone ?? "text-slate-900"}`}>{value}</p>
      {subtitle && <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Message({ error, children }: { error?: boolean; children: ReactNode }) {
  return (
    <p role={error ? "alert" : undefined} className={`px-5 py-10 text-center text-sm ${error ? "text-red-600" : "text-slate-500"}`}>
      {children}
    </p>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button type="button" className={`${secondaryButton} h-9 px-3 text-xs`} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className={`${secondaryButton} h-9 px-3 text-xs`} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

/** Accessible dialog: closes on Escape or the backdrop, and moves focus into itself when opened. */
export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  side = false,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Slide-over panel on the right, for record details */
  side?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-slate-900/30 ${side ? "justify-end" : "items-center justify-center p-4"}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-full flex-col bg-white shadow-xl outline-none ${
          side ? "h-full w-full max-w-[560px]" : `w-full rounded-2xl ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh]`
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            {subtitle && <div className="text-xs font-medium text-slate-400">{subtitle}</div>}
            <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

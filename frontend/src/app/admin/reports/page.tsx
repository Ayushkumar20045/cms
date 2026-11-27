"use client";

import { useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Message, Panel, StatCard, filterClass } from "@/components/admin/ui";
import { admin } from "@/lib/api/endpoints";
import type { NamedCount, Report } from "@/lib/api/types";
import { useLoad, useSession } from "@/lib/session";

// Validated pair (light surface): CVD ΔE 18.2, normal-vision ΔE 27.9, both ≥ 3:1 contrast
const RAISED = "#a5174d";
const RESOLVED = "#2a78c2";

const PERIODS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
  { label: "All time", days: 0 },
];

const label = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function hours(h: number | null) {
  if (h === null) return "–";
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

/** Single-series horizontal bars with the value written beside each bar, so no legend is needed. */
function BarList({ rows, format = (s) => s, empty }: { rows: NamedCount[]; format?: (name: string) => string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <Message>{empty}</Message>;
  return (
    <ul className="space-y-3 p-5">
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_40px] items-center gap-3 text-xs">
          <span className="truncate text-slate-600" title={format(r.name)}>
            {format(r.name)}
          </span>
          <span className="h-2.5 rounded-full bg-slate-100" title={`${format(r.name)}: ${r.count}`}>
            <span className="block h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: RAISED }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-slate-800">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

function MonthlyChart({ data }: { data: Report["byMonth"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((m) => [m.raised, m.resolved]));
  const height = 180;

  return (
    <div className="p-5">
      <ul className="mb-4 flex gap-5 text-xs text-slate-600" aria-label="Legend">
        {[
          ["Raised", RAISED],
          ["Resolved", RESOLVED],
        ].map(([name, color]) => (
          <li key={name} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            {name}
          </li>
        ))}
      </ul>

      <div className="relative" role="img" aria-label="Requests raised and resolved per month for the last six months">
        <div className="flex items-end gap-3 border-b border-slate-200" style={{ height }}>
          {data.map((m, i) => (
            <div
              key={m.month}
              className={`relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-t-md ${hover === i ? "bg-slate-50" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {[
                [m.raised, RAISED],
                [m.resolved, RESOLVED],
              ].map(([value, color], k) => (
                <span
                  key={k}
                  className="w-full max-w-[22px] rounded-t"
                  style={{ height: `${((value as number) / max) * (height - 24)}px`, minHeight: (value as number) ? 3 : 0, background: color as string }}
                />
              ))}
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-md">
                  <p className="font-semibold text-slate-800">{m.month}</p>
                  <p className="text-slate-600">Raised: {m.raised}</p>
                  <p className="text-slate-600">Resolved: {m.resolved}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          {data.map((m) => (
            <span key={m.month} className="flex-1 text-center text-[11px] text-slate-500">
              {m.month.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      <details className="mt-4 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-[#a5174d]">Show as table</summary>
        <table className="mt-2 w-full max-w-md">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-1 font-semibold">Month</th>
              <th className="py-1 text-right font-semibold">Raised</th>
              <th className="py-1 text-right font-semibold">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.month} className="border-t border-slate-100">
                <td className="py-1">{m.month}</td>
                <td className="py-1 text-right tabular-nums">{m.raised}</td>
                <td className="py-1 text-right tabular-nums">{m.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export default function AdminReportsPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);
  const [days, setDays] = useState(90);
  const report = useLoad(() => (ready ? admin.reports(days || undefined) : Promise.resolve(null)), [ready, days]);
  const r = report.data;

  return (
    <AdminShell title="Reports" section="Reports" user={user} onSignOut={signOut}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">How requests are raised, handled and resolved across campus.</p>
        </div>
        <div>
          <label htmlFor="period" className="sr-only">
            Period
          </label>
          <select id="period" className={filterClass} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {PERIODS.map((p) => (
              <option key={p.days} value={p.days}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {report.error ? (
        <Message error>{report.error}</Message>
      ) : !r ? (
        <Message>Loading reports…</Message>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Requests raised" value={r.total} subtitle={PERIODS.find((p) => p.days === days)?.label} />
            <StatCard title="Still open" value={r.open} subtitle={`${r.escalated} escalated · ${r.overdue} overdue`} />
            <StatCard title="Average resolution time" value={hours(r.avgResolutionHours)} subtitle="From raised to resolved" />
            <StatCard
              title="Resolved on time"
              value={r.resolvedOnTimePercent === null ? "–" : `${r.resolvedOnTimePercent}%`}
              subtitle={r.resolvedOnTimePercent === null ? "Set due dates to measure this" : "Of resolved requests with a due date"}
            />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <Panel title="Raised vs resolved" subtitle="Last six months, by month">
              <MonthlyChart data={r.byMonth} />
            </Panel>
            <Panel title="By status" subtitle="Where requests are now">
              <BarList rows={r.byStatus} format={label} empty="No requests in this period." />
            </Panel>
            <Panel title="By category" subtitle="What is being reported">
              <BarList rows={r.byCategory} empty="No requests in this period." />
            </Panel>
            <Panel title="By hostel" subtitle="Requests from hostel buildings">
              <BarList rows={r.byHostel} empty="No hostel requests in this period." />
            </Panel>
            <Panel title="By department" subtitle="Which team the requests were routed to">
              <BarList rows={r.byDepartment} empty="No requests in this period." />
            </Panel>
          </div>
        </>
      )}
    </AdminShell>
  );
}

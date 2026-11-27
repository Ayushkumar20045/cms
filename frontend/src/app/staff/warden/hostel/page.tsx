"use client";

import Link from "next/link";

import { WardenShell } from "@/components/staff/warden-shell";
import { staff as staffApi } from "@/lib/api/endpoints";
import type { ComplaintStatus, StaffContact } from "@/lib/api/types";
import { initials, studentStatusLabel } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

function People({ title, people, empty }: { title: string; people: StaffContact[]; empty: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {people.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f8e9ef] text-[11px] font-bold text-[#8e123f]">
                {initials(p.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{p.fullName}</p>
                <p className="truncate text-xs text-slate-400">
                  {[p.email, p.phone].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bars({
  title,
  rows,
  label,
}: {
  title: string;
  rows: { name: string; count: number }[];
  label?: (name: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">No complaints yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">{label ? label(r.name) : r.name}</span>
                <span className="font-semibold text-slate-800">{r.count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-[#a5174d]" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The warden's own hostel: details, staff, residents and how its complaints stand. */
export default function WardenHostelPage() {
  const { user, signOut } = useSession("warden");
  const ready = Boolean(user);
  const hostel = useLoad(() => (ready ? staffApi.hostel() : Promise.resolve(null)), [ready]);
  const h = hostel.data;
  const hostelName = h?.hostel.name ?? user?.hostel?.name ?? null;

  const stats = h
    ? [
        { label: "Students", value: h.students, note: h.capacity ? `of ${h.capacity} places` : "Capacity not set" },
        { label: "Open complaints", value: h.openComplaints, note: "Waiting or being worked on" },
        { label: "Resolved", value: h.resolvedComplaints, note: "Resolved or closed" },
        { label: "All complaints", value: h.totalComplaints, note: "Since records began" },
      ]
    : [];

  return (
    <WardenShell user={user} signOut={signOut} hostelName={hostelName}>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        {hostel.error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{hostel.error}</p>
        ) : !h ? (
          <p className="text-sm text-slate-400">Loading hostel…</p>
        ) : (
          <>
            <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a5174d]">Your hostel</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{h.hostel.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Code {h.hostel.code}
                  {h.onMap ? " · Drawn on the campus map" : " · Not on the campus map yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/staff/warden/students"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#a5174d] hover:text-[#8e123f]"
                >
                  View students
                </Link>
                <Link
                  href="/board"
                  className="rounded-lg bg-[#a5174d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8e123f]"
                >
                  Open Ticket Board
                </Link>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{s.value}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{s.note}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900">Hostel office</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Building</dt>
                      <dd className="text-right font-medium text-slate-800">{h.buildingName ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Phone</dt>
                      <dd className="text-right font-medium text-slate-800">{h.contactPhone ?? "Not set"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="truncate text-right font-medium text-slate-800">{h.contactEmail ?? "Not set"}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-[11px] leading-4 text-slate-400">
                    Hostel details are maintained by the administration.
                  </p>
                </div>
                <People title="Wardens" people={h.wardens} empty="No warden assigned." />
                <People title="Caretakers" people={h.caretakers} empty="No caretaker assigned." />
              </div>
              <Bars title="Complaints by category" rows={h.byCategory} />
              <Bars
                title="Complaints by status"
                rows={h.byStatus}
                label={(name) => studentStatusLabel[name as ComplaintStatus] ?? name}
              />
            </section>
          </>
        )}
      </div>
    </WardenShell>
  );
}

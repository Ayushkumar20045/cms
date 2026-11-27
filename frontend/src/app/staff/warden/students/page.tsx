"use client";

import { useEffect, useState } from "react";

import { WardenShell } from "@/components/staff/warden-shell";
import { staff as staffApi } from "@/lib/api/endpoints";
import { initials } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

/** Students living in the warden's hostel, with their rooms, contact details and complaints. */
export default function WardenStudentsPage() {
  const { user, signOut } = useSession("warden");
  const ready = Boolean(user);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  // Search after the warden stops typing
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const students = useLoad(() => (ready ? staffApi.students(search || undefined) : Promise.resolve(null)), [ready, search]);
  const rows = students.data ?? [];
  const hostelName = user?.hostel?.name ?? null;
  const withOpen = rows.filter((s) => s.openComplaints > 0).length;

  return (
    <WardenShell user={user} signOut={signOut} hostelName={hostelName}>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a5174d]">Hostel residents</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Students</h2>
            <p className="mt-1 text-sm text-slate-500">
              Students living in {hostelName ?? "your hostel"}, with their rooms and complaints.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] text-slate-500">Students</p>
              <p className="text-lg font-semibold text-slate-900">{students.loading ? "…" : rows.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] text-slate-500">With open complaints</p>
              <p className="text-lg font-semibold text-[#a5174d]">{students.loading ? "…" : withOpen}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <label htmlFor="student-search" className="sr-only">
              Search students
            </label>
            <input
              id="student-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, login ID or room"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10 sm:max-w-sm"
            />
          </div>

          {students.error ? (
            <p className="p-6 text-sm text-red-600">{students.error}</p>
          ) : students.loading ? (
            <p className="p-6 text-sm text-slate-400">Loading students…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">
              {search ? "No students match your search." : "No students are allocated to this hostel yet."}
            </p>
          ) : (
            <>
              {/* Table on larger screens */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Complaints</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f8e9ef] text-[11px] font-bold text-[#8e123f]">
                            {initials(s.fullName)}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{s.fullName}</p>
                            <p className="text-xs text-slate-400">{s.loginId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {s.roomNumber ? `Room ${s.roomNumber}` : "—"}
                        {s.block && <span className="block text-xs text-slate-400">{s.block}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {s.email ?? "—"}
                        {s.phone && <span className="block text-slate-400">{s.phone}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-semibold ${s.openComplaints ? "text-[#a5174d]" : "text-slate-700"}`}>
                          {s.openComplaints} open
                        </span>
                        <span className="text-xs text-slate-400"> · {s.totalComplaints} total</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            s.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards on phones */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {rows.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f8e9ef] text-xs font-bold text-[#8e123f]">
                      {initials(s.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{s.fullName}</p>
                      <p className="text-xs text-slate-400">
                        {s.loginId}
                        {s.roomNumber ? ` · Room ${s.roomNumber}` : ""}
                        {s.block ? ` · ${s.block}` : ""}
                      </p>
                      {(s.email || s.phone) && (
                        <p className="mt-1 truncate text-xs text-slate-500">{[s.email, s.phone].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="mt-1.5 text-xs">
                        <span className={`font-semibold ${s.openComplaints ? "text-[#a5174d]" : "text-slate-700"}`}>
                          {s.openComplaints} open
                        </span>
                        <span className="text-slate-400"> · {s.totalComplaints} total complaints</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </WardenShell>
  );
}

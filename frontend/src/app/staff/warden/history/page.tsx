"use client";

import { ComplaintList } from "@/components/staff/complaint-list";
import { WardenShell } from "@/components/staff/warden-shell";
import { useSession } from "@/lib/session";

/** Finished complaints of the warden's hostel: resolved, closed, rejected and duplicates. */
export default function WardenHistoryPage() {
  const { user, signOut } = useSession("warden");
  const hostelName = user?.hostel?.name ?? null;

  return (
    <WardenShell user={user} signOut={signOut} hostelName={hostelName}>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a5174d]">Records</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Complaint History</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complaints of {hostelName ?? "your hostel"} that have been resolved, closed or turned down. Each keeps its
            full history on its ticket page.
          </p>
        </section>
        {user && <ComplaintList initialTab="completed" tabs={["completed", "rejected", "all"]} />}
      </div>
    </WardenShell>
  );
}

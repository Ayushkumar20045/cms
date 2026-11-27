"use client";

import { RequirementsWorkspace } from "@/components/staff/requirements-workspace";
import { WardenShell } from "@/components/staff/warden-shell";
import { useSession } from "@/lib/session";

/** Material requirements for the warden's hostel. */
export default function WardenRequirementsPage() {
  const { user, signOut } = useSession("warden");
  const hostelName = user?.hostel?.name ?? null;

  return (
    <WardenShell user={user} signOut={signOut} hostelName={hostelName}>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a5174d]">Hostel resources</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Requirements</h2>
          <p className="mt-1 text-sm text-slate-500">
            Materials and equipment requested for {hostelName ?? "your hostel"}, and their approval.
          </p>
        </section>
        {user && <RequirementsWorkspace />}
      </div>
    </WardenShell>
  );
}

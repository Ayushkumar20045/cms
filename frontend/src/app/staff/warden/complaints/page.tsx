"use client";

import Link from "next/link";

import { ComplaintList } from "@/components/staff/complaint-list";
import { WardenShell } from "@/components/staff/warden-shell";
import { useSession } from "@/lib/session";

/** Every complaint in the warden's hostel, open ones first. */
export default function WardenComplaintsPage() {
  const { user, signOut } = useSession("warden");
  const hostelName = user?.hostel?.name ?? null;

  return (
    <WardenShell user={user} signOut={signOut} hostelName={hostelName}>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a5174d]">Hostel complaints</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Complaints</h2>
            <p className="mt-1 text-sm text-slate-500">
              Every complaint raised in {hostelName ?? "your hostel"}. Open one to accept, assign, comment or move it.
            </p>
          </div>
          <Link href="/board" className="w-fit rounded-lg bg-[#a5174d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8e123f]">
            Open Ticket Board
          </Link>
        </section>
        {user && <ComplaintList initialTab="open" />}
      </div>
    </WardenShell>
  );
}

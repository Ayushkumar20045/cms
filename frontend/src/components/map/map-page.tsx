"use client";

import Link from "next/link";

import { CampusMap } from "@/components/map/campus-map";
import { UserMenu } from "@/components/student/user-menu";
import { requesterPortal, requesterRole, useSession } from "@/lib/session";

/** Page shell for the campus map, shared by the requester and admin portals. */
export function MapPage({
  area,
  portalLabel,
  roleLabel,
  backHref,
  reportHref,
}: {
  area: "student" | "admin";
  portalLabel: string;
  roleLabel: string;
  backHref: string;
  reportHref?: string;
}) {
  const { user, signOut } = useSession(area);

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="flex h-10 w-10 items-center justify-center"
            aria-label="Back to dashboard"
          >
            <img src="/images/gbu-logo.png" alt="" className="h-full w-full object-contain" />
          </Link>
          <div>
            <p className="text-xs font-medium text-slate-400">{area === "student" ? requesterPortal(user) : portalLabel}</p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">Campus Map</h1>
          </div>
        </div>
        <UserMenu user={user} roleLabel={area === "student" ? requesterRole(user) : roleLabel} onSignOut={signOut} />
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">
        <Link href={backHref} className="text-sm font-semibold text-[#a5174d] hover:text-[#8e123f]">
          ← Back to dashboard
        </Link>
        <div className="mt-4">{user && <CampusMap reportHref={reportHref} />}</div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";

import { RequirementsWorkspace } from "@/components/staff/requirements-workspace";
import { UserMenu } from "@/components/student/user-menu";
import { useSession } from "@/lib/session";

function SidebarIcon({
  type,
}: {
  type: "dashboard" | "assignments" | "requirements" | "history";
}) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-4.5 w-4.5",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  if (type === "dashboard") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (type === "assignments") {
    return (
      <svg {...common}>
        <path
          d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 8h8M8 12h5M8 16h3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "requirements") {
    return (
      <svg {...common}>
        <path
          d="M4.5 7.5h15v12h-15z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8v1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 13h4M12 11v4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M5 5h14v14H5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}

function SidebarHeader() {
  return (
    <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
      <div className="flex h-10 w-10 items-center justify-center">
        <img
          src="/images/gbu-logo.png"
          alt="GBU"
          className="h-full w-full object-contain"
        />
      </div>

      <div>
        <p className="text-sm font-bold text-slate-900">GBU Portal</p>
        <p className="text-xs text-slate-500">Hostel Services</p>
      </div>
    </div>
  );
}

function SignedInCard({ hostel }: { hostel: string | null }) {
  return (
    <div className="rounded-xl bg-[#fdf3f7] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5174d]">
        Signed in as
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">Caretaker</p>

      <p className="mt-0.5 text-xs text-slate-500">
        {hostel ?? "No hostel assigned"}
      </p>
    </div>
  );
}

function Navigation() {
  return (
    <nav className="flex-1 px-3 py-5">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Main
      </p>

      <div className="space-y-1">
        <Link
          href="/staff/caretaker/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <SidebarIcon type="dashboard" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/staff/caretaker/assignments"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <SidebarIcon type="assignments" />
          <span>My Assignments</span>
        </Link>

        <Link
          href="/board"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <SidebarIcon type="assignments" />
          <span>Ticket Board</span>
        </Link>

        <Link
          href="/staff/caretaker/requirements"
          className="flex items-center gap-3 rounded-lg bg-[#f8e9ef] px-3 py-2.5 text-sm font-medium text-[#a5174d]"
        >
          <SidebarIcon type="requirements" />
          <span>Requirements</span>
        </Link>

        <Link
          href="/staff/caretaker/history"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <SidebarIcon type="history" />
          <span>Work History</span>
        </Link>
      </div>
    </nav>
  );
}

export default function StaffRequirementsPage() {
  const { user, signOut } = useSession("caretaker");
  const hostelName = user?.hostel?.name ?? null;

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <SidebarHeader />

          <div className="border-b border-slate-100 px-4 py-4">
            <SignedInCard hostel={hostelName} />
          </div>

          <Navigation />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/staff/caretaker/dashboard"
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#a5174d] hover:bg-[#f8e9ef] lg:hidden"
              >
                ← Back
              </Link>
              <div>
                <p className="text-xs font-medium text-slate-500">Hostel Services</p>
                <h1 className="text-sm font-bold text-slate-900">Requirements</h1>
              </div>
            </div>

            <UserMenu user={user} roleLabel="Caretaker" onSignOut={signOut} />
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
            <section className="mb-6">
              <p className="text-xs font-medium text-[#a5174d]">Hostel resources</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Requirements</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Material and equipment requirements for {hostelName ?? "your hostel"}. Raise one when a repair needs
                parts; it is approved by the Department Head or Store Manager and then issued.
              </p>
            </section>

            {user && <RequirementsWorkspace />}
          </div>
        </main>
      </div>
    </div>
  );
}

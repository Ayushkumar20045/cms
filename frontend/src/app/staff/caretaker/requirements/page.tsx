import Link from "next/link";

type RequirementStatus =
  | "REQUESTED"
  | "UNDER REVIEW"
  | "APPROVED"
  | "FULFILLED";

interface Requirement {
  id: string;
  item: string;
  quantity: number;
  hostel: string;
  requestedBy: string;
  reason: string;
  status: RequirementStatus;
  updatedAt: string;
}

const requirements: Requirement[] = [
  {
    id: "REQ-2026-0042",
    item: "LED Tube Lights",
    quantity: 12,
    hostel: "Gautam Buddha Boys Hostel",
    requestedBy: "Amit Kumar",
    reason: "Replacement of damaged corridor lights",
    status: "APPROVED",
    updatedAt: "Today",
  },
  {
    id: "REQ-2026-0041",
    item: "Bathroom Taps",
    quantity: 6,
    hostel: "Gautam Buddha Boys Hostel",
    requestedBy: "Amit Kumar",
    reason: "Replacement of leaking taps",
    status: "UNDER REVIEW",
    updatedAt: "Today",
  },
  {
    id: "REQ-2026-0038",
    item: "Door Locks",
    quantity: 5,
    hostel: "Gautam Buddha Boys Hostel",
    requestedBy: "Rajesh Kumar",
    reason: "Replacement of damaged room locks",
    status: "REQUESTED",
    updatedAt: "Yesterday",
  },
  {
    id: "REQ-2026-0034",
    item: "PVC Water Pipe",
    quantity: 20,
    hostel: "Gautam Buddha Boys Hostel",
    requestedBy: "Amit Kumar",
    reason: "Plumbing maintenance work",
    status: "FULFILLED",
    updatedAt: "2 days ago",
  },
];

const statusStyles: Record<RequirementStatus, string> = {
  REQUESTED: "border-violet-200 bg-violet-50 text-violet-700",
  "UNDER REVIEW": "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-sky-200 bg-sky-50 text-sky-700",
  FULFILLED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

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

function HostelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M4 20V6.5L12 3l8 3.5V20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 20v-5h8v5M8 9h2M14 9h2M8 12h2M14 12h2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarHeader() {
  return (
    <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#f8e9ef]">
        <img
          src="/images/gbu-logo.png"
          alt="GBU"
          className="h-8 w-8 object-contain"
        />
      </div>

      <div>
        <p className="text-sm font-bold text-slate-900">GBU Portal</p>
        <p className="text-xs text-slate-500">Hostel Services</p>
      </div>
    </div>
  );
}

function SignedInCard() {
  return (
    <div className="rounded-xl bg-[#fdf3f7] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5174d]">
        Signed in as
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">Caretaker</p>

      <p className="mt-0.5 text-xs text-slate-500">
        Gautam Buddha Boys Hostel
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
          href="/staff/requirements"
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
  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <SidebarHeader />

          <div className="border-b border-slate-100 px-4 py-4">
            <SignedInCard />
          </div>

          <Navigation />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Hostel Services
              </p>

              <h1 className="text-sm font-bold text-slate-900">
                Requirements
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-slate-800">Amit Kumar</p>
                <p className="text-[10px] text-slate-500">Caretaker</p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e9ef] text-xs font-bold text-[#a5174d]">
                AK
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
            <section className="mb-7">
              <p className="text-xs font-medium text-[#a5174d]">
                Hostel resources
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Requirements
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                View material and equipment requirements raised for hostel
                maintenance work.
              </p>
            </section>

            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Total Requests
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">18</p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Hostel requirements
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Under Review
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">3</p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Awaiting admin review
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Fulfilled
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">11</p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Completed requests
                </p>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Requirement Requests
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Recent equipment and material requests.
                    </p>
                  </div>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[780px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left">
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Requirement
                        </th>

                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Quantity
                        </th>

                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Requested By
                        </th>

                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Status
                        </th>

                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Updated
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {requirements.map((requirement) => (
                        <tr key={requirement.id}>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {requirement.item}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {requirement.id}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {requirement.reason}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {requirement.quantity}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {requirement.requestedBy}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {requirement.hostel}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={requirement.status} />
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            {requirement.updatedAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {requirements.map((requirement) => (
                    <div key={requirement.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {requirement.item}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {requirement.id}
                          </p>
                        </div>

                        <StatusBadge status={requirement.status} />
                      </div>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {requirement.reason}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">Quantity</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {requirement.quantity}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Requested By</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {requirement.requestedBy}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Hostel</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {requirement.hostel}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Updated</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {requirement.updatedAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Hostel
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Current assignment.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8e9ef] text-[#a5174d]">
                      <HostelIcon />
                    </div>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-800">
                    Gautam Buddha Boys Hostel
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Requirements shown here are related to the assigned
                    hostel.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#ead0db] bg-[#fdf7fa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a5174d]">
                    Requirement process
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Requests are reviewed before fulfillment.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Hostel staff can raise requirements for maintenance
                    materials and equipment. Admin approval and fulfillment
                    will be connected in the backend phase.
                  </p>
                </div>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
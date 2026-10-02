import Link from "next/link";

type AssignmentStatus =
  | "ASSIGNED"
  | "IN PROGRESS"
  | "WAITING FOR MATERIALS"
  | "COMPLETED";

interface Assignment {
  id: string;
  title: string;
  student: string;
  room: string;
  category: string;
  status: AssignmentStatus;
  updatedAt: string;
}

const assignments: Assignment[] = [
  {
    id: "CMP-2026-0146",
    title: "Water leakage in bathroom",
    student: "Arjun Singh",
    room: "Room A-118",
    category: "Plumbing",
    status: "IN PROGRESS",
    updatedAt: "38 min ago",
  },
  {
    id: "CMP-2026-0139",
    title: "Broken study table",
    student: "Aditya Verma",
    room: "Room B-211",
    category: "Furniture",
    status: "WAITING FOR MATERIALS",
    updatedAt: "2 hrs ago",
  },
  {
    id: "CMP-2026-0137",
    title: "Door lock replacement",
    student: "Vikas Kumar",
    room: "Room A-307",
    category: "Maintenance",
    status: "ASSIGNED",
    updatedAt: "3 hrs ago",
  },
  {
    id: "CMP-2026-0134",
    title: "Tube light replacement",
    student: "Kunal Yadav",
    room: "Room A-102",
    category: "Electrical",
    status: "COMPLETED",
    updatedAt: "Yesterday",
  },
  {
    id: "CMP-2026-0129",
    title: "Window handle repair",
    student: "Rohit Singh",
    room: "Room B-104",
    category: "Maintenance",
    status: "COMPLETED",
    updatedAt: "Yesterday",
  },
  {
    id: "CMP-2026-0125",
    title: "Washroom tap replacement",
    student: "Mohit Kumar",
    room: "Room B-306",
    category: "Plumbing",
    status: "IN PROGRESS",
    updatedAt: "2 days ago",
  },
];

const statusStyles: Record<AssignmentStatus, string> = {
  ASSIGNED: "border-violet-200 bg-violet-50 text-violet-700",
  "IN PROGRESS": "border-sky-200 bg-sky-50 text-sky-700",
  "WAITING FOR MATERIALS":
    "border-orange-200 bg-orange-50 text-orange-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function StatusBadge({ status }: { status: AssignmentStatus }) {
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
          className="flex items-center gap-3 rounded-lg bg-[#f8e9ef] px-3 py-2.5 text-sm font-medium text-[#a5174d]"
        >
          <SidebarIcon type="assignments" />
          <span>My Assignments</span>
        </Link>

        <Link
          href="/staff/caretaker/requirements"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
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

export default function CaretakerAssignmentsPage() {
  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter(
    (assignment) =>
      assignment.status === "ASSIGNED" ||
      assignment.status === "IN PROGRESS",
  ).length;
  const waitingAssignments = assignments.filter(
    (assignment) => assignment.status === "WAITING FOR MATERIALS",
  ).length;
  const completedAssignments = assignments.filter(
    (assignment) => assignment.status === "COMPLETED",
  ).length;

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
                My Assignments
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
                Assigned hostel work
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                My Assignments
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                View and track maintenance complaints and hostel tasks assigned
                to you.
              </p>
            </section>

            <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Total Assignments
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {totalAssignments}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Assigned to you
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Active Work
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {activeAssignments}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Currently assigned
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Waiting
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {waitingAssignments}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Materials required
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Completed
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {completedAssignments}
                </p>

                <p className="mt-2 text-[11px] text-slate-400">
                  Finished work
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assigned Work
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Maintenance complaints currently assigned to you.
                  </p>
                </div>

                <span className="text-xs font-medium text-slate-400">
                  {totalAssignments} assignments
                </span>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Assignment
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Student
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Category
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
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {assignment.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {assignment.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {assignment.student}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {assignment.room}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {assignment.category}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={assignment.status} />
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {assignment.updatedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {assignment.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {assignment.id}
                        </p>
                      </div>

                      <StatusBadge status={assignment.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400">Student</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {assignment.student}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Room</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {assignment.room}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Category</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {assignment.category}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Updated</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {assignment.updatedAt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
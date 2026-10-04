import type { ComplaintStatus } from "@/lib/api/types";
import { studentStatusLabel } from "@/lib/format";

const styles: Record<ComplaintStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 ring-blue-600/10",
  UNDER_REVIEW: "bg-blue-50 text-blue-700 ring-blue-600/10",
  ASSIGNED: "bg-violet-50 text-violet-700 ring-violet-600/10",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-600/10",
  WAITING_FOR_INFORMATION: "bg-slate-100 text-slate-600 ring-slate-500/10",
  ESCALATED: "bg-rose-50 text-rose-700 ring-rose-600/10",
  REOPENED: "bg-amber-50 text-amber-700 ring-amber-600/10",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  CLOSED: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  REJECTED: "bg-slate-100 text-slate-600 ring-slate-500/10",
  DUPLICATE: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {studentStatusLabel[status]}
    </span>
  );
}

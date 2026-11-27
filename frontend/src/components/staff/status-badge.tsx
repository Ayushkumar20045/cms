import type { ComplaintStatus } from "@/lib/api/types";

const styles: Record<ComplaintStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  ASSIGNED: "bg-violet-50 text-violet-700 border-violet-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
  WAITING_FOR_INFORMATION: "bg-orange-50 text-orange-700 border-orange-200",
  WAITING_FOR_MATERIALS: "bg-orange-50 text-orange-700 border-orange-200",
  ESCALATED: "bg-rose-50 text-rose-700 border-rose-200",
  REOPENED: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-slate-100 text-slate-600 border-slate-200",
  DUPLICATE: "bg-slate-100 text-slate-600 border-slate-200",
};

/**
 * Upper-case status chip used on the hostel staff pages. Caretakers see finished work as "COMPLETED".
 */
export function StaffStatusBadge({
  status,
  completedLabel,
}: {
  status: ComplaintStatus;
  completedLabel?: string;
}) {
  const label =
    completedLabel && (status === "RESOLVED" || status === "CLOSED")
      ? completedLabel
      : status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {label}
    </span>
  );
}

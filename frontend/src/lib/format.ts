import type { ComplaintStatus } from "./api/types";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** "02 Oct 2026", in the viewer's local time zone. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "2 hours ago", "Yesterday", or a date for anything older than a week. */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return formatDate(iso);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Student-facing wording, e.g. "Under Review", "Waiting". */
export const studentStatusLabel: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_INFORMATION: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
  ESCALATED: "Escalated",
  REOPENED: "Reopened",
};

/** Admin wording, e.g. "UNDER REVIEW". */
export function adminStatusLabel(status: ComplaintStatus): string {
  return status === "WAITING_FOR_INFORMATION" ? "WAITING" : status.replace(/_/g, " ");
}

export const allStatuses = Object.keys(studentStatusLabel) as ComplaintStatus[];

import type { ComplaintStatus, ComplaintSummary } from "./api/types";
import { timeAgo } from "./format";

/** A request as shown in the warden and caretaker tables. */
export interface StaffRow {
  id: string;
  complaintNumber: string;
  title: string;
  student: string;
  /** Where the problem is, e.g. "Room B-204" or "Block B, Room B-204" */
  place: string;
  category: string;
  status: ComplaintStatus;
  updatedAt: string;
  /** The full request, for the accept / reject and work-step actions */
  raw: ComplaintSummary;
}

export function staffRow(c: ComplaintSummary): StaffRow {
  const { room, details, label } = c.location;
  return {
    id: c.id,
    complaintNumber: c.complaintNumber,
    title: c.title,
    student: c.requester.fullName,
    place: room ? `Room ${room}` : (details ?? label),
    category: c.category,
    status: c.status,
    updatedAt: timeAgo(c.updatedAt),
    raw: c,
  };
}

export const isCompleted = (status: ComplaintStatus) => status === "RESOLVED" || status === "CLOSED";

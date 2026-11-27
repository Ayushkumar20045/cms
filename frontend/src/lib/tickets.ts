import type { LabelColor, Priority } from "./api/types";

/** "IN_PROGRESS" → "In progress" */
export const statusLabel = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const PRIORITY_STYLE: Record<Priority, { dot: string; text: string }> = {
  URGENT: { dot: "bg-rose-600", text: "text-rose-700" },
  HIGH: { dot: "bg-orange-500", text: "text-orange-700" },
  MEDIUM: { dot: "bg-amber-400", text: "text-amber-700" },
  LOW: { dot: "bg-slate-400", text: "text-slate-500" },
};

/** Chip colours for each label colour key (full class names, so Tailwind keeps them) */
export const LABEL_STYLE: Record<LabelColor, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  maroon: "bg-[#f8e9ef] text-[#8e123f] ring-[#efc9d7]",
  red: "bg-red-50 text-red-700 ring-red-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
};

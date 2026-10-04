import type { CurrentUser } from "@/lib/api/types";
import { initials } from "@/lib/format";

/** Name, avatar initials and a sign-out action for the portal top bar. */
export function UserMenu({
  user,
  roleLabel,
  onSignOut,
}: {
  user: CurrentUser | null;
  roleLabel: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a5174d]/10 text-xs font-bold text-[#a5174d]">
        {user ? initials(user.fullName) : ""}
      </div>

      <div className="hidden sm:block">
        <p className="text-xs font-semibold text-slate-800">
          {user?.fullName ?? " "}
        </p>
        <p className="text-[10px] text-slate-400">{roleLabel}</p>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="ml-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
      >
        Sign out
      </button>
    </div>
  );
}

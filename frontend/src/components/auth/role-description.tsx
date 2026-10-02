import type { UserRole } from "./role-selector";

interface RoleDescriptionProps {
  role: UserRole;
}

const descriptions: Record<UserRole, string> = {
  student:
    "Raise complaints, track progress and stay updated throughout the resolution process.",
  staff:
    "Manage hostel complaints, communicate with students and raise facility requests.",
  admin:
    "Monitor university complaints, manage assignments, hostels, staff and escalations.",
};

export function RoleDescription({ role }: RoleDescriptionProps) {
  return (
    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-center text-xs leading-5 text-slate-500">
        {descriptions[role]}
      </p>
    </div>
  );
}
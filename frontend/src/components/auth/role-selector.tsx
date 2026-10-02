"use client";

import type { Dispatch, SetStateAction } from "react";

export type UserRole = "student" | "staff" | "admin";

interface RoleSelectorProps {
  value: UserRole;
  onChange: Dispatch<SetStateAction<UserRole>>;
}

const roles: Array<{
  value: UserRole;
  label: string;
  icon: string;
}> = [
  {
    value: "admin",
    label: "Admin",
    icon: "shield",
  },
  {
    value: "staff",
    label: "Hostel Staff",
    icon: "users",
  },
  {
    value: "student",
    label: "Student",
    icon: "graduation",
  },
];

function RoleIcon({ type }: { type: string }) {
  if (type === "shield") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M12 3.5 19 6v5.2c0 4.4-2.8 7.9-7 9.3-4.2-1.4-7-4.9-7-9.3V6l7-2.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m9.5 12 1.7 1.7 3.5-3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M16 20a4 4 0 0 0-8 0"
          strokeLinecap="round"
        />
        <circle cx="12" cy="9" r="3" />
        <path
          d="M19 20a3.5 3.5 0 0 0-2.5-3.4M17 6.3a2.8 2.8 0 0 1 0 5.4"
          strokeLinecap="round"
        />
        <path
          d="M5 20a3.5 3.5 0 0 1 2.5-3.4M7 6.3a2.8 2.8 0 0 0 0 5.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M5 4h14v11H5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 20h8M12 15v5" strokeLinecap="round" />
      <path
        d="M8.5 8.5h7M8.5 11.5h4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RoleSelector({
  value,
  onChange,
}: RoleSelectorProps) {
  return (
    <div
      aria-label="Choose account type"
      className="grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
      role="tablist"
    >
      {roles.map((role) => {
        const isActive = value === role.value;

        return (
          <button
            key={role.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(role.value)}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
              isActive
                ? "bg-[#a5174d] text-white shadow-md shadow-[#a5174d]/15"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            <RoleIcon type={role.icon} />
            <span>{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
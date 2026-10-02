"use client";

import { FormEvent, useState } from "react";

import { IdentifierField } from "./identifier-field";
import { PasswordField } from "./password-field";
import type { UserRole } from "./role-selector";

type StaffRole = "warden" | "caretaker";

interface LoginFormProps {
  role: UserRole;
}

interface RoleLoginConfig {
  identifierLabel: string;
  identifierPlaceholder: string;
  submitLabel: string;
}

const roleLoginConfig: Record<UserRole, RoleLoginConfig> = {
  student: {
    identifierLabel: "University Login ID",
    identifierPlaceholder: "Enter your university login ID",
    submitLabel: "Sign In as Student",
  },
  staff: {
    identifierLabel: "Staff ID",
    identifierPlaceholder: "Enter your staff ID",
    submitLabel: "Sign In as Hostel Staff",
  },
  admin: {
    identifierLabel: "Admin ID",
    identifierPlaceholder: "Enter your admin ID",
    submitLabel: "Sign In as Admin",
  },
};

const staffRoles: Array<{
  value: StaffRole;
  label: string;
  description: string;
}> = [
  {
    value: "warden",
    label: "Warden",
    description: "Manage and oversee hostel complaints",
  },
  {
    value: "caretaker",
    label: "Caretaker",
    description: "Handle hostel maintenance and assigned tasks",
  },
];

export function LoginForm({ role }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("warden");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const config = roleLoginConfig[role];

  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    setErrorMessage(null);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setErrorMessage(null);
  }

  function handleStaffRoleChange(value: StaffRole) {
    setStaffRole(value);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setErrorMessage(
        `Please enter your ${config.identifierLabel.toLowerCase()}.`,
      );
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    /*
     * The real authentication request will be connected
     * after the NestJS authentication module is implemented.
     *
     * The selected staff role will eventually be sent
     * with the authentication request and verified by
     * the backend against the authenticated account.
     */
    await new Promise((resolve) => setTimeout(resolve, 300));

    setIsSubmitting(false);

    setErrorMessage(
      "Authentication is not connected yet. The backend login service will be added next.",
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
      {role === "staff" && (
        <div className="space-y-2">
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Staff Role
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Select the role you are signing in as.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Select staff role"
          >
            {staffRoles.map((staff) => {
              const isSelected = staffRole === staff.value;

              return (
                <button
                  key={staff.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleStaffRoleChange(staff.value)}
                  disabled={isSubmitting}
                  className={`rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#a5174d] bg-[#fdf3f7] shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-[#a5174d]"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-[#a5174d]" />
                      )}
                    </span>

                    <span
                      className={`text-sm font-semibold ${
                        isSelected
                          ? "text-[#8e123f]"
                          : "text-slate-700"
                      }`}
                    >
                      {staff.label}
                    </span>
                  </div>

                  <p className="mt-1.5 pl-6 text-[11px] leading-4 text-slate-500">
                    {staff.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <IdentifierField
        label={config.identifierLabel}
        placeholder={config.identifierPlaceholder}
        value={identifier}
        onChange={handleIdentifierChange}
        disabled={isSubmitting}
      />

      <PasswordField
        value={password}
        onChange={handlePasswordChange}
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-slate-300 accent-[#a5174d]"
          />

          <span>Remember me</span>
        </label>

        <button
          type="button"
          disabled={isSubmitting}
          className="text-sm font-medium text-[#a5174d] transition-colors hover:text-[#8e123f] disabled:pointer-events-none disabled:opacity-50"
        >
          Forgot Password?
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5"
        >
          <p className="text-xs leading-5 text-rose-700">
            {errorMessage}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#a5174d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#8e123f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />

            Signing in...
          </>
        ) : (
          <>
            {role === "staff"
              ? `Sign In as ${
                  staffRole === "warden" ? "Warden" : "Caretaker"
                }`
              : config.submitLabel}

            <span
              aria-hidden="true"
              className="text-base leading-none"
            >
              →
            </span>
          </>
        )}
      </button>
    </form>
  );
}
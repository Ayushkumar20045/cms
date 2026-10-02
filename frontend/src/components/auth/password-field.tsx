"use client";

import { useId, useState } from "react";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

export function PasswordField({
  value,
  onChange,
  disabled = false,
  required = true,
  name = "password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        Password
      </label>

      <div className="relative">
        {/* Lock icon */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect
              x="4"
              y="10"
              width="16"
              height="11"
              rx="2"
            />

            <path
              d="M8 10V7a4 4 0 0 1 8 0v3"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="current-password"
          disabled={disabled}
          required={required}
          placeholder="Enter your password"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M3 3l18 18"
                strokeLinecap="round"
              />

              <path
                d="M10.6 10.7a2 2 0 0 0 2.7 2.7"
                strokeLinecap="round"
              />

              <path
                d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4 9.5 7-.5 1-1.5 2.2-3 3.4M6.2 6.2C4.2 7.5 3.2 9 2.5 12c1 2 4.5 7 9.5 7 1.2 0 2.3-.2 3.3-.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
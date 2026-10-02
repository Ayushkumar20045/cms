import { useId } from "react";

interface IdentifierFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  autoComplete?: string;
}

export function IdentifierField({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = true,
  name = "identifier",
  autoComplete = "username",
}: IdentifierFieldProps) {
  const inputId = useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>

      <div className="relative">
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
            <circle cx="12" cy="8" r="3" />

            <path
              d="M5 20a7 7 0 0 1 14 0"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <input
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#a5174d] focus:ring-4 focus:ring-[#a5174d]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>
    </div>
  );
}
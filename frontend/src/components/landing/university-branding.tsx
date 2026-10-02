import Image from "next/image";

interface UniversityBrandingProps {
  compact?: boolean;
}

export function UniversityBranding({
  compact = false,
}: UniversityBrandingProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative shrink-0 ${
          compact ? "h-10 w-10" : "h-11 w-11"
        }`}
      >
        <Image
          src="/images/gbu-logo.png"
          alt="Gautam Buddha University"
          fill
          priority
          sizes={compact ? "40px" : "44px"}
          className="object-contain"
        />
      </div>

      <div className="min-w-0">
        <p
          className={`font-semibold tracking-tight text-white ${
            compact ? "text-sm" : "text-[15px]"
          }`}
        >
          Gautam Buddha University
        </p>

        <p
          className={`mt-0.5 text-white/55 ${
            compact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          Complaint &amp; Grievance Management System
        </p>
      </div>
    </div>
  );
}
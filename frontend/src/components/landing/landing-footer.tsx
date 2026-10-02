export function LandingFooter() {
  return (
    <footer className="mt-8 border-t border-white/10 pt-5">
      <div className="flex flex-col gap-2 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Gautam Buddha University
        </p>

        <div className="flex items-center gap-4">
          <span>Complaint &amp; Grievance Management</span>

          <span
            aria-hidden="true"
            className="h-1 w-1 rounded-full bg-white/30"
          />

          <span>University Services</span>
        </div>
      </div>
    </footer>
  );
}
interface CampusBackgroundProps {
  imageSrc?: string;
}

export function CampusBackground({
  imageSrc = "/images/gbu-campus.png",
}: CampusBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-slate-950"
    >
      {/* ─────────────────────────────────────────────
          CAMPUS PHOTOGRAPH
      ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("${imageSrc}")`,
        }}
      />

      {/* ─────────────────────────────────────────────
          CINEMATIC DARKENING
          Keeps the photograph visible while creating
          enough contrast for the university content.
      ───────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-slate-950/25" />

      {/* Stronger contrast around the content area */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/35 to-transparent" />

      {/* Slight top cinematic fade */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/35 to-transparent" />

      {/* ─────────────────────────────────────────────
          SOFT TRANSITION TOWARD THE LOGIN SIDE
      ───────────────────────────────────────────── */}
      <div className="absolute inset-y-0 right-0 w-[32%] bg-gradient-to-r from-transparent via-white/10 to-white/55" />

      {/* Bottom depth */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/65 to-transparent" />

      {/* Very subtle atmospheric highlight */}
      <div className="absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-white/[0.035] blur-3xl" />
    </div>
  );
}
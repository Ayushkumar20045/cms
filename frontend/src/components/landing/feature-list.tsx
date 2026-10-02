interface Feature {
  title: string;
  description: string;
  icon: "complaint" | "authority" | "notification" | "facility";
}

const features: Feature[] = [
  {
    title: "Raise & Track Complaints",
    description: "Submit issues and follow their progress.",
    icon: "complaint",
  },
  {
    title: "Reach the Right Authority",
    description: "Complaints are routed to the concerned team.",
    icon: "authority",
  },
  {
    title: "Stay Updated",
    description: "Receive updates throughout the resolution process.",
    icon: "notification",
  },
  {
    title: "Hostel Facility Requests",
    description: "Manage maintenance and equipment requirements.",
    icon: "facility",
  },
];

function FeatureIcon({
  type,
}: {
  type: Feature["icon"];
}) {
  switch (type) {
    case "complaint":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-[17px] w-[17px]"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path
            d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 9.5h9M7.5 12.5h6"
            strokeLinecap="round"
          />
        </svg>
      );

    case "authority":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-[17px] w-[17px]"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <circle cx="9" cy="8" r="3" />

          <path
            d="M3.5 19a5.5 5.5 0 0 1 11 0"
            strokeLinecap="round"
          />

          <path
            d="M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "notification":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-[17px] w-[17px]"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path
            d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "facility":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-[17px] w-[17px]"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path
            d="m14.7 6.3 3-3 3 3-3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="m17.7 9.3-6.9 6.9a2.5 2.5 0 1 1-3.5-3.5l6.9-6.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="m6.5 17.5-2 2M18.5 14.5l2 2"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return null;
  }
}

export function FeatureList() {
  return (
    <div className="max-w-xl divide-y divide-white/10 border-y border-white/10">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="flex items-center gap-3.5 py-3.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/80">
            <FeatureIcon type={feature.icon} />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white">
              {feature.title}
            </h3>

            <p className="mt-0.5 text-xs leading-5 text-white/50">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
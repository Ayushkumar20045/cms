import type { NextConfig } from "next";

// The browser calls /api/v1/* on this origin and Next.js forwards it to the backend, so the
// HttpOnly session cookies stay first-party and no CORS setup is needed.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Proxy /api/* to the Django backend so the browser stays same-origin (no CORS setup needed).
// Django routes end in "/", so keep trailing slashes instead of letting Next strip them.
const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:8000"}/:path*/`,
      },
    ];
  },
};

export default nextConfig;

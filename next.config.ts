import type { NextConfig } from "next";

// Check if building for mobile (static export) or web (server)
const isMobileBuild = process.env.BUILD_TARGET === 'mobile';

const nextConfig: NextConfig = {
  // Mobile: static export (no API routes, no server)
  // Web: standalone (includes API routes)
  output: isMobileBuild ? 'export' : 'standalone',

  // Disable image optimization for static export
  images: {
    unoptimized: isMobileBuild,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_USE_REMOTE_ENGINE: process.env.NEXT_PUBLIC_USE_REMOTE_ENGINE || (isMobileBuild ? 'true' : 'false'),
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },

  // Security headers (deployment-independent; the example nginx HTTP block sets
  // none). Skipped for the static mobile export, which has no server.
  ...(isMobileBuild
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=()",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;

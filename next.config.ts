import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const configuredDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * A dev server is deliberately exposed on the local network so candidates can
 * open an invite from another device. Next checks the browser origin before it
 * accepts the development HMR socket; a hard-coded Wi-Fi address breaks as
 * soon as the host moves to another floor/network. Include the host's active
 * IPv4 addresses at startup, while retaining any explicitly configured hosts.
 */
const localDevOrigins = Object.values(networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === "IPv4" && !address.internal)
  .map((address) => address.address);

const allowedDevOrigins = [...new Set([...configuredDevOrigins, ...localDevOrigins])];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
  // Faster local/dev navigation; production builds still fully optimized.
  experimental: {
    cpus: 4,
    optimizePackageImports: ["@/components/icons"],
  },
};

export default nextConfig;

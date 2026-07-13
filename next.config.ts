import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: true,
  // Faster local/dev navigation; production builds still fully optimized.
  experimental: {
    optimizePackageImports: ["@/components/icons"],
  },
};

export default nextConfig;

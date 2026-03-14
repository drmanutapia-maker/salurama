import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint ya no se configura aquí en Next.js 16
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Restrict to an empty list — cover images are served from /public/uploads
    // (plain <img> tags) and do not need Next.js remote optimization.
    // Add explicit hostname entries here if you host images on a known CDN.
    remotePatterns: [],
  },
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

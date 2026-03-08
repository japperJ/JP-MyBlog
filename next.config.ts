import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remote optimization stays opt-in until a dedicated image host/CDN is added.
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

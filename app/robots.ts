import type { MetadataRoute } from "next";
import { getConfiguredAppOrigin } from "@/lib/runtime-config";

export default function robots(): MetadataRoute.Robots {
  const origin = getConfiguredAppOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/auth/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/pesapal";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/staff/", "/student/", "/applicant/", "/dashboard", "/parent"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

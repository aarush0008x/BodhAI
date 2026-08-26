import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/chat/", "/admin/"],
    },
    sitemap: "https://bodhai.com/sitemap.xml",
  };
}

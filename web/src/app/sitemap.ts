import type { MetadataRoute } from "next";

const SITE = "https://returnroute.site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/use-cases", "/pricing", "/request-demo", "/privacy", "/terms"].map((p) => ({ url: `${SITE}${p}` }));
}

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://medi-vault-seven-lyart.vercel.app";

  return {
    rules: [
      {
        // Generative AI & LLM Search Engine Crawlers
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "Amazonbot",
        ],
        allow: [
          "/",
          "/llms.txt",
          "/llms-full.txt",
          "/verify",
          "/verify/",
          "/privacy",
          "/terms",
          "/auth/login",
          "/auth/signup",
        ],
        disallow: [
          "/patient/",
          "/doctor/",
          "/admin/",
          "/api/",
        ],
      },
      {
        // General Web Search Crawlers (Google, Bing, etc.)
        userAgent: "*",
        allow: [
          "/",
          "/llms.txt",
          "/llms-full.txt",
          "/verify",
          "/verify/",
          "/privacy",
          "/terms",
          "/auth/login",
          "/auth/signup",
          "/auth/reset-password",
          "/e/",
        ],
        disallow: [
          "/patient/",
          "/doctor/",
          "/admin/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://medi-vault-seven-lyart.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/auth/login",
          "/auth/signup",
          "/auth/reset-password",
          "/e/",
          "/verify/",
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

import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
      {
        source: '/consent/:path*',
        destination: `${API_BASE}/consent/:path*`,
      },
    ];
  },
};

export default nextConfig;

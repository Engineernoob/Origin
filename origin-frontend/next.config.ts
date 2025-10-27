import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { 
    domains: [
      "images.unsplash.com",
      "picsum.photos", 
      "i.ytimg.com",
      "commondatastorage.googleapis.com"
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    return [
      { 
        source: "/api/:path*", 
        destination: `${backendUrl}/api/:path*`
      },
    ];
  },
  env: {
    CUSTOM_API_URL: process.env.CUSTOM_API_URL,
    BACKEND_URL: process.env.BACKEND_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
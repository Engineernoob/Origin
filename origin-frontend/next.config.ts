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
    const backendUrl = process.env.BACKEND_URL || "https://originvideo.duckdns.org";
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
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
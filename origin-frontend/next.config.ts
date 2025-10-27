import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for static export
  images: { 
    unoptimized: true,
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
  // Enable static export for serving with simple HTTP server
  output: 'export',
  // Disable rewrites since we're using static export
  trailingSlash: true,
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
  // Base path for static assets
  basePath: '',
  // Asset prefix for CDN
  assetPrefix: '',
};

export default nextConfig;
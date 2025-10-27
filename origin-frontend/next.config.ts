import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { domains: ["images.unsplash.com","picsum.photos","i.ytimg.com"] },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3000/:path*" },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
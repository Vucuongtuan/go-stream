import type { NextConfig } from "next";

const apiProxyTarget = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["172.20.10.8"],
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

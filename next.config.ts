import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/bhandara-setu-frontend" : "",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

export default nextConfig;


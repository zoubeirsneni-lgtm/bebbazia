import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["preview-chat-f708db05-b2a2-4a81-939b-b7ad0d4ecab7.space-z.ai"],
};

export default nextConfig;

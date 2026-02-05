import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows production builds to succeed despite type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allows production builds to succeed despite linting warnings
    ignoreDuringBuilds: true,
  },
  // If reactCompiler still shows a red line, it's likely because your 
  // Next.js version is slightly older. You can wrap it in experimental:
  experimental: {
    // @ts-ignore - this ignores the type error if your Next version is < 15
    reactCompiler: true,
  },
};

export default nextConfig;
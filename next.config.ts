import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows production builds to succeed despite type errors
    ignoreBuildErrors: true,
  },
  // Removed the 'eslint' key entirely, as it is no longer supported here.
  // Use 'next lint' commands instead.
  
  // React Compiler is now a top-level configuration
  reactCompiler: true,
  
  reactStrictMode: false, 
};

export default nextConfig;
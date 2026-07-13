import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'build_temp',
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

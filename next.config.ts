import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/doc-reader',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

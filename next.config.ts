import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/doc-reader',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

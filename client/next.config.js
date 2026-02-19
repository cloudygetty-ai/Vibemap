/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Docker: copies only the minimal runtime into .next/standalone
  output: 'standalone',
  // Allow mapbox-gl to work properly with Next.js
  transpilePackages: ['mapbox-gl'],
  webpack: (config) => {
    // Fixes mapbox-gl worker bundling
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl',
    };
    return config;
  },
};

module.exports = nextConfig;

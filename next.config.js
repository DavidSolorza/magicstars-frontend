/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removing the static export configuration
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Optimizar compilación
  swcMinify: true,
  // Compresión
  compress: true,
  // Optimizar prefetching
  poweredByHeader: false,
};

module.exports = nextConfig;

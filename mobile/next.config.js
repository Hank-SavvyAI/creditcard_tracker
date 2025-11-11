/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable server-side features for static export
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Skip validation of dynamic routes during build
  // This allows client-side routing to handle dynamic segments
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig

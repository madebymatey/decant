/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // framer-api ships ESM with top-level await; bundling it into server
    // actions trips Terser. Keep it (and the Neon driver) external so they're
    // required at runtime instead. Workspace @decant/* ship pre-built dist.
    serverComponentsExternalPackages: ["framer-api", "@neondatabase/serverless"],
  },
}

export default nextConfig

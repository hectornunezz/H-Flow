import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname = 'localhost'

if (supabaseUrl) {
  try {
    const parsedSupabaseUrl = new URL(supabaseUrl)
    supabaseHostname = parsedSupabaseUrl.hostname
  } catch {
    supabaseHostname = 'localhost'
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.100.2.156', 'localhost'],
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  compress: true,
  turbopack: {
    root: process.cwd(),
  },
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
    minimumCacheTTL: 3600,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
}

export default nextConfig
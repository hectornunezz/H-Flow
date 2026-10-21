import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_URL para las imágenes remotas.')
}

let supabaseHostname: string
try {
  const parsedSupabaseUrl = new URL(supabaseUrl)
  if (parsedSupabaseUrl.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL debe usar HTTPS.')
  }
  supabaseHostname = parsedSupabaseUrl.hostname
} catch (error) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL no es una URL válida: ${error instanceof Error ? error.message : 'valor no válido.'}`,
  )
}

const nextConfig: NextConfig = {
  compress: true,
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
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig

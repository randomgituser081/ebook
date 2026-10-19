import path from 'path'
import type { NextConfig } from 'next'

const staticAsset = [
  { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      // Files in /public are otherwise sent with max-age=0, so browsers re-check them on every visit.
      { source: '/branding/:path*', headers: staticAsset },
      { source: '/icon.png', headers: staticAsset },
      { source: '/apple-icon.png', headers: staticAsset },
    ]
  },
}

export default nextConfig

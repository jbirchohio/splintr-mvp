import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Silence multi-lockfile root inference by pinning the tracing root
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig

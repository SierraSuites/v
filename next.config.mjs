/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================================
  // BUILD CONFIGURATION
  // ============================================================================
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow images from Supabase storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ============================================================================
  // SECURITY HEADERS (Production-Grade)
  // ============================================================================
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // ----------------------------------------------------------------
          // Prevent clickjacking attacks
          // ----------------------------------------------------------------
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Don't allow any framing
          },

          // ----------------------------------------------------------------
          // Prevent MIME type sniffing
          // ----------------------------------------------------------------
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },

          // ----------------------------------------------------------------
          // Control referrer information
          // ----------------------------------------------------------------
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          // ----------------------------------------------------------------
          // Enable browser XSS protection
          // ----------------------------------------------------------------
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },

          // ----------------------------------------------------------------
          // Prevent DNS prefetching (privacy)
          // ----------------------------------------------------------------
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },

          // ----------------------------------------------------------------
          // Force HTTPS
          // ----------------------------------------------------------------
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },

          // ----------------------------------------------------------------
          // Permissions Policy (restrict browser features)
          // ----------------------------------------------------------------
          {
            key: 'Permissions-Policy',
            value: [
              'camera=(self)', // Allow camera for photo capture
              'geolocation=(self)', // Allow location for GPS tagging
              'microphone=()', // Disable microphone
              'payment=()', // Disable payment API
              'usb=()', // Disable USB
              'interest-cohort=()', // Disable FLoC tracking
            ].join(', '),
          },

          // ----------------------------------------------------------------
          // Content Security Policy (CSP)
          // Prevents XSS, code injection, and other code execution attacks
          // ----------------------------------------------------------------
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: Only allow resources from same origin
              "default-src 'self'",

              // Scripts: Allow self, inline scripts (for Next.js), and eval (for development)
              // PRODUCTION: Remove 'unsafe-inline' and 'unsafe-eval'
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.vercel-scripts.com https://vercel.live",

              // Styles: Allow self and inline styles (for Tailwind)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

              // Images: Allow self, data URIs, Supabase storage, and common CDNs
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://maps.googleapis.com",

              // Fonts: Allow self and Google Fonts
              "font-src 'self' https://fonts.gstatic.com",

              // Connections: Allow API calls to Supabase, Stripe, and analytics
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.stripe.com https://api.openai.com https://maps.googleapis.com",

              // Media: Allow self and Supabase
              "media-src 'self' https://*.supabase.co blob:",

              // Objects: Disallow plugins
              "object-src 'none'",

              // Base URI: Restrict base tag to same origin
              "base-uri 'self'",

              // Forms: Only allow form submissions to same origin
              "form-action 'self'",

              // Frame ancestors: Prevent embedding (redundant with X-Frame-Options)
              "frame-ancestors 'none'",

              // Upgrade insecure requests
              'upgrade-insecure-requests',
            ]
              .join('; ')
              .replace(/\s+/g, ' '),
          },
        ],
      },
    ]
  },

  // ============================================================================
  // COMPILER CONFIGURATION
  // ============================================================================
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // ============================================================================
  // PERFORMANCE & OPTIMIZATION
  // ============================================================================
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header (security through obscurity)

  // ============================================================================
  // TURBOPACK CONFIGURATION (Next.js 16+)
  // ============================================================================
  turbopack: {
    // Empty config to silence Turbopack warning
    // Most apps work fine with default Turbopack settings
  },

  // ============================================================================
  // TYPESCRIPT CONFIGURATION
  // ============================================================================
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  // ============================================================================
  // EXPERIMENTAL FEATURES
  // ============================================================================
  experimental: {
    // Enable server actions for better security
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig

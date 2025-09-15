import { NextRequest, NextResponse } from 'next/server'
import { generateCSPHeader } from './sanitization'
import { logger } from './logger'

// Security headers configuration
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': generateCSPHeader({
    SCRIPT_SRC: "'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
    STYLE_SRC: "'self' 'unsafe-inline' https://fonts.googleapis.com",
    FONT_SRC: "'self' https://fonts.gstatic.com",
    CONNECT_SRC: "'self' https://*.supabase.co https://api.cloudinary.com https://api.openai.com",
    IMG_SRC: "'self' data: https: blob:",
    MEDIA_SRC: "'self' https: blob:",
    FRAME_SRC: "'self' https://accounts.google.com"
  }),
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  
  // HSTS (only in production)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  })
}

// CORS configuration
export const CORS_CONFIG = {
  allowedOrigins: [
    'http://localhost:3000',
    'https://splintr.app',
    'https://www.splintr.app',
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
}

/**
 * Apply security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Handle CORS preflight and add CORS headers
 */
export function handleCORS(request: NextRequest, response?: Response): Response {
  const origin = request.headers.get('origin')
  const method = request.method

  // Handle preflight requests
  if (method === 'OPTIONS') {
    const headers = new Headers()
    
    // Check if origin is allowed
    if (origin && CORS_CONFIG.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
    }
    
    headers.set('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '))
    headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '))
    headers.set('Access-Control-Max-Age', CORS_CONFIG.maxAge.toString())
    
    if (CORS_CONFIG.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true')
    }

    return new Response(null, { status: 200, headers })
  }

  // Add CORS headers to actual response
  if (response) {
    const headers = new Headers(response.headers)
    
    if (origin && CORS_CONFIG.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
    }
    
    headers.set('Access-Control-Expose-Headers', CORS_CONFIG.exposedHeaders.join(', '))
    
    if (CORS_CONFIG.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true')
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  }

  return new Response('Method not allowed', { status: 405 })
}

/**
 * Validate request size and content type
 */
export function validateRequest(request: NextRequest): { isValid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length')
  const contentType = request.headers.get('content-type')

  // Check content length (100MB max for file uploads, 1MB for JSON)
  if (contentLength) {
    const size = parseInt(contentLength)
    const maxSize = contentType?.includes('multipart/form-data') 
      ? 100 * 1024 * 1024 // 100MB for file uploads
      : 1024 * 1024 // 1MB for JSON

    if (size > maxSize) {
      return {
        isValid: false,
        error: `Request too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
      }
    }
  }

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!contentType) {
      return {
        isValid: false,
        error: 'Content-Type header is required'
      }
    }

    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ]

    const isAllowed = allowedTypes.some(type => contentType.includes(type))
    if (!isAllowed) {
      return {
        isValid: false,
        error: `Unsupported content type: ${contentType}`
      }
    }
  }

  return { isValid: true }
}

/**
 * Check for suspicious request patterns
 */
export function detectSuspiciousActivity(request: NextRequest): { isSuspicious: boolean; reasons: string[] } {
  const reasons: string[] = []
  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') || ''

  // Check for path traversal attempts
  if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
    reasons.push('Path traversal attempt')
  }

  // Check for SQL injection in query parameters
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi
  ]

  const queryString = url.search
  for (const pattern of sqlPatterns) {
    if (pattern.test(queryString)) {
      reasons.push('SQL injection attempt in query parameters')
      break
    }
  }

  // Check for suspicious user agents
  const suspiciousAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i
  ]

  // Allow legitimate bots but flag others
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i
  ]

  const isSuspiciousAgent = suspiciousAgents.some(pattern => pattern.test(userAgent)) &&
    !legitimateBots.some(pattern => pattern.test(userAgent))

  if (isSuspiciousAgent) {
    reasons.push('Suspicious user agent')
  }

  // Check for excessive header count (potential header injection)
  const headerCount = Array.from(request.headers.keys()).length
  if (headerCount > 50) {
    reasons.push('Excessive headers')
  }

  // Check for suspicious header values
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip']
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && (value.includes('<') || value.includes('>') || value.includes('"'))) {
      reasons.push('Suspicious header values')
      break
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons
  }
}

/**
 * Comprehensive security middleware
 */
export function withSecurity<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return addSecurityHeaders(handleCORS(request))
      }

      // Validate request
      const validation = validateRequest(request)
      if (!validation.isValid) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: validation.error },
            { status: 400 }
          )
        )
      }

      // Detect suspicious activity
      const suspiciousCheck = detectSuspiciousActivity(request)
      if (suspiciousCheck.isSuspicious) {
        logger.warn({
          url: request.url,
          method: request.method,
          userAgent: request.headers.get('user-agent'),
          reasons: suspiciousCheck.reasons
        }, 'Suspicious activity detected')

        // For now, just log. In production, you might want to block or rate limit
        // return addSecurityHeaders(
        //   NextResponse.json(
        //     { error: 'Suspicious activity detected' },
        //     { status: 403 }
        //   )
        // )
      }

      // Execute handler
      const response = await handler(request, ...args)

      // Add security headers and CORS
      return addSecurityHeaders(handleCORS(request, response))
    } catch (error) {
      logger.error({ err: error }, 'Security middleware error')
      
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      )
    }
  }
}

/**
 * Create a secure API route handler
 */
export function createSecureHandler<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return withSecurity(handler)
}

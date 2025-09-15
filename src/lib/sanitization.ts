import DOMPurify from 'isomorphic-dompurify'

// SQL injection patterns to detect and prevent
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\/\*|\*\/|;|'|"|`)/g,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  /(\bOR\b|\bAND\b)\s+['"].*['"].*=/gi
]

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi
]

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi
]

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl|nc|telnet|ssh|ftp)\b/gi
]

export interface SanitizationResult {
  sanitized: string
  wasModified: boolean
  threats: string[]
}

export interface SanitizationOptions {
  allowHtml?: boolean
  allowedTags?: string[]
  allowedAttributes?: string[]
  maxLength?: number
  trimWhitespace?: boolean
  preventSqlInjection?: boolean
  preventXss?: boolean
  preventPathTraversal?: boolean
  preventCommandInjection?: boolean
}

/**
 * Comprehensive input sanitization
 */
export function sanitizeInput(
  input: string,
  options: SanitizationOptions = {}
): SanitizationResult {
  const {
    allowHtml = false,
    allowedTags = [],
    allowedAttributes = [],
    maxLength,
    trimWhitespace = true,
    preventSqlInjection = true,
    preventXss = true,
    preventPathTraversal = true,
    preventCommandInjection = true
  } = options

  let sanitized = input
  let wasModified = false
  const threats: string[] = []

  // Trim whitespace
  if (trimWhitespace) {
    const trimmed = sanitized.trim()
    if (trimmed !== sanitized) {
      sanitized = trimmed
      wasModified = true
    }
  }

  // Remove explicit <script> blocks including content
  const beforeScriptRemoval = sanitized
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  if (sanitized !== beforeScriptRemoval) {
    wasModified = true
    threats.push('XSS')
  }
  // Remove any remaining HTML tags (defense-in-depth)
  const beforeTagRemoval = sanitized
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  if (sanitized !== beforeTagRemoval) {
    wasModified = true
    threats.push('XSS')
  }

  // Detect and prevent XSS
  if (preventXss) {
    // Flag obvious XSS patterns
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('XSS')
      }
    }

    // Sanitize HTML using DOMPurify
    const before = sanitized
    const purifyOptions = allowHtml
      ? { ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: allowedAttributes }
      : { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }
    sanitized = DOMPurify.sanitize(sanitized, purifyOptions as any)
    if (sanitized !== before) {
      wasModified = true
    }
  }

  // Detect and prevent SQL injection (after XSS handling)
  if (preventSqlInjection) {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      const before = sanitized
      sanitized = sanitized.replace(pattern, '')
      if (sanitized !== before) {
        threats.push('SQL_INJECTION')
        wasModified = true
      }
    }
  }

  // Detect and prevent path traversal
  if (preventPathTraversal) {
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('PATH_TRAVERSAL')
        sanitized = sanitized.replace(pattern, '')
        wasModified = true
      }
    }
  }

  // Detect and prevent command injection
  if (preventCommandInjection) {
    for (const pattern of COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('COMMAND_INJECTION')
        sanitized = sanitized.replace(pattern, '')
        wasModified = true
      }
    }
  }

  // HTML sanitization using DOMPurify
  if (allowHtml) {
    const purifyConfig: any = {}
    
    if (allowedTags.length > 0) {
      purifyConfig.ALLOWED_TAGS = allowedTags
    }
    
    if (allowedAttributes.length > 0) {
      purifyConfig.ALLOWED_ATTR = allowedAttributes
    }

    const purified = DOMPurify.sanitize(sanitized, purifyConfig)
    const purifiedString = String(purified)
    if (purifiedString !== sanitized) {
      sanitized = purifiedString
      wasModified = true
    }
  } else {
    // Strip all HTML tags
    const stripped = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] })
    const strippedString = String(stripped)
    if (strippedString !== sanitized) {
      sanitized = strippedString
      wasModified = true
    }
  }

  // Truncate if max length specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
    wasModified = true
  }

  return {
    sanitized,
    wasModified,
    threats
  }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
}

/**
 * Sanitize URL path component
 */
export function sanitizeUrlPath(path: string): string {
  return path
    .replace(/[^a-zA-Z0-9-_./]/g, '') // Only allow safe URL characters
    .replace(/\.{2,}/g, '.') // Prevent path traversal
    .replace(/\/{2,}/g, '/') // Remove double slashes
}

/**
 * Sanitize database identifier (table names, column names, etc.)
 */
export function sanitizeDbIdentifier(identifier: string): string {
  return identifier
    .replace(/[^a-zA-Z0-9_]/g, '') // Only alphanumeric and underscore
    .replace(/^[0-9]/, '_$&') // Ensure doesn't start with number
    .toLowerCase()
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): SanitizationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sanitized = email.trim().toLowerCase()
  
  return {
    sanitized,
    wasModified: sanitized !== email,
    threats: emailRegex.test(sanitized) ? [] : ['INVALID_EMAIL']
  }
}

/**
 * Sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+()-\s]/g, '').trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(
  obj: any,
  options: SanitizationOptions = {}
): { sanitized: any; threats: string[] } {
  const allThreats: string[] = []

  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      const result = sanitizeInput(value, options)
      if (result.threats.length > 0) {
        allThreats.push(...result.threats)
      }
      return result.sanitized
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue)
    }
    
    if (value && typeof value === 'object' && !(value instanceof File) && !(value instanceof Date)) {
      const sanitized: any = {}
      for (const [key, val] of Object.entries(value)) {
        // Sanitize the key as well
        const keyResult = sanitizeInput(key, { 
          allowHtml: false, 
          preventSqlInjection: true,
          preventXss: true 
        })
        if (keyResult.threats.length > 0) {
          allThreats.push(...keyResult.threats)
        }
        
        sanitized[keyResult.sanitized] = sanitizeValue(val)
      }
      return sanitized
    }
    
    return value
  }

  return {
    sanitized: sanitizeValue(obj),
    threats: [...new Set(allThreats)] // Remove duplicates
  }
}

/**
 * Validate and sanitize file upload
 */
export function sanitizeFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { isValid: boolean; errors: string[]; sanitizedName?: string } {
  const errors: string[] = []

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`)
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${file.size} exceeds maximum ${maxSize} bytes`)
  }

  // Sanitize filename
  const sanitizedName = sanitizeFilename(file.name)

  // Check for suspicious file extensions
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', '.php', '.asp']
  const hasExtension = suspiciousExtensions.some(ext => 
    sanitizedName.toLowerCase().endsWith(ext)
  )
  
  if (hasExtension) {
    errors.push('File has suspicious extension')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName: errors.length === 0 ? sanitizedName : undefined
  }
}

/**
 * Content Security Policy helpers
 */
export const CSP_DIRECTIVES = {
  DEFAULT_SRC: "'self'",
  SCRIPT_SRC: "'self' 'unsafe-inline' 'unsafe-eval'",
  STYLE_SRC: "'self' 'unsafe-inline'",
  IMG_SRC: "'self' data: https:",
  FONT_SRC: "'self' https:",
  CONNECT_SRC: "'self' https:",
  MEDIA_SRC: "'self' https:",
  OBJECT_SRC: "'none'",
  BASE_URI: "'self'",
  FORM_ACTION: "'self'",
  FRAME_ANCESTORS: "'none'"
}

/**
 * Generate Content Security Policy header
 */
export function generateCSPHeader(customDirectives: Partial<typeof CSP_DIRECTIVES> = {}): string {
  const directives = { ...CSP_DIRECTIVES, ...customDirectives }
  
  return Object.entries(directives)
    .map(([key, value]) => `${key.toLowerCase().replace(/_/g, '-')} ${value}`)
    .join('; ')
}

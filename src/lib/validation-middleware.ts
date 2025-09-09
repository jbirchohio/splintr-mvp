import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { rateLimit } from './rate-limit'

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional()
  }),
  
  // Text content with sanitization
  safeText: z.string().transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  safeHtml: z.string().transform((val) => DOMPurify.sanitize(val)),
  
  // File validation
  fileSize: z.number().int().min(0).max(100 * 1024 * 1024), // 100MB max
  mimeType: z.enum([
    'video/mp4',
    'video/webm', 
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]),
  
  // URL validation
  url: z.string().url().max(2048),
  
  // Email validation
  email: z.string().email().max(254),
  
  // Name validation (with sanitization)
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform((val) => DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] })),
    
  // Content validation
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform((val) => DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] })),
    
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .transform((val) => DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] }))
    .optional(),
    
  // Choice text validation
  choiceText: z.string()
    .min(1, 'Choice text is required')
    .max(100, 'Choice text must be less than 100 characters')
    .transform((val) => DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] })),
}

// Request validation result
export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any[]
  }
}

// Sanitization options
export interface SanitizationOptions {
  allowHtml?: boolean
  maxLength?: number
  trimWhitespace?: boolean
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(
  input: string, 
  options: SanitizationOptions = {}
): string {
  const {
    allowHtml = false,
    maxLength,
    trimWhitespace = true
  } = options

  let sanitized = input

  // Trim whitespace if requested
  if (trimWhitespace) {
    sanitized = sanitized.trim()
  }

  // Sanitize HTML/XSS
  if (allowHtml) {
    sanitized = DOMPurify.sanitize(sanitized)
  } else {
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] })
  }

  // Truncate if max length specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj, options)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options))
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, options)
    }
    return sanitized
  }
  
  return obj
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    
    // Sanitize the body first
    const sanitizedBody = sanitizeObject(body)
    
    // Validate against schema
    const result = schema.safeParse(sanitizedBody)
    
    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: result.error.issues
        }
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body'
        }
      }
    }
    
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate request body'
      }
    }
  }
}

/**
 * Validate query parameters against schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}
    
    // Convert URLSearchParams to object
    for (const [key, value] of searchParams.entries()) {
      params[key] = value
    }
    
    // Sanitize parameters
    const sanitizedParams = sanitizeObject(params)
    
    // Validate against schema
    const result = schema.safeParse(sanitizedParams)
    
    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: result.error.issues
        }
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate query parameters'
      }
    }
  }
}

/**
 * Validate path parameters against schema
 */
export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    // Sanitize parameters
    const sanitizedParams = sanitizeObject(params)
    
    // Validate against schema
    const result = schema.safeParse(sanitizedParams)
    
    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Path parameter validation failed',
          details: result.error.issues
        }
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate path parameters'
      }
    }
  }
}

/**
 * Validate multipart form data
 */
export async function validateFormData(
  request: NextRequest,
  schema: ZodSchema<any>
): Promise<ValidationResult<any>> {
  try {
    const formData = await request.formData()
    const data: Record<string, any> = {}
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = value
      } else {
        data[key] = sanitizeString(value)
      }
    }
    
    // Validate against schema
    const result = schema.safeParse(data)
    
    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Form data validation failed',
          details: result.error.issues
        }
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate form data'
      }
    }
  }
}

/**
 * Comprehensive validation middleware wrapper
 */
export function withValidation<T extends unknown[]>(
  options: {
    bodySchema?: ZodSchema<any>
    querySchema?: ZodSchema<any>
    paramsSchema?: ZodSchema<any>
    formSchema?: ZodSchema<any>
    requireAuth?: boolean
    rateLimit?: {
      windowMs: number
      maxRequests: number
    }
  } = {}
) {
  return function (
    handler: (
      request: NextRequest,
      context: {
        body?: any
        query?: any
        params?: any
        form?: any
        user?: any
      },
      ...args: T
    ) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      try {
        // Apply rate limiting if configured
        if (options.rateLimit) {
          const rateLimitResult = await rateLimit(
            request,
            options.rateLimit.windowMs,
            options.rateLimit.maxRequests
          )
          
          if (!rateLimitResult.success) {
            return NextResponse.json(
              { 
                error: 'Rate limit exceeded',
                retryAfter: rateLimitResult.retryAfter
              },
              { status: 429 }
            )
          }
        }

        const context: any = {}

        // Validate body if schema provided
        if (options.bodySchema) {
          const bodyValidation = await validateRequestBody(request, options.bodySchema)
          if (!bodyValidation.success) {
            return NextResponse.json(bodyValidation.error, { status: 400 })
          }
          context.body = bodyValidation.data
        }

        // Validate query parameters if schema provided
        if (options.querySchema) {
          const queryValidation = validateQueryParams(request, options.querySchema)
          if (!queryValidation.success) {
            return NextResponse.json(queryValidation.error, { status: 400 })
          }
          context.query = queryValidation.data
        }

        // Validate path parameters if schema provided
        if (options.paramsSchema && args.length > 0) {
          const params = args[0] as any
          const paramsValidation = validatePathParams(params?.params || {}, options.paramsSchema)
          if (!paramsValidation.success) {
            return NextResponse.json(paramsValidation.error, { status: 400 })
          }
          context.params = paramsValidation.data
        }

        // Validate form data if schema provided
        if (options.formSchema) {
          const formValidation = await validateFormData(request, options.formSchema)
          if (!formValidation.success) {
            return NextResponse.json(formValidation.error, { status: 400 })
          }
          context.form = formValidation.data
        }

        // Handle authentication if required
        if (options.requireAuth) {
          const { authenticateRequest } = await import('./auth-helpers')
          const user = await authenticateRequest(request)
          
          if (!user) {
            return NextResponse.json(
              { error: 'Unauthorized' },
              { status: 401 }
            )
          }
          
          context.user = user
        }

        return handler(request, context, ...args)
      } catch (error) {
        console.error('Validation middleware error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Create error response for validation failures
 */
export function createValidationErrorResponse(
  error: ZodError,
  message = 'Validation failed'
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      }
    },
    { status: 400 }
  )
}
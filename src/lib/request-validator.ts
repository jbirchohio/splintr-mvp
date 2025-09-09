import { NextRequest } from 'next/server'
import { z, ZodSchema } from 'zod'
import { sanitizeObject, sanitizeInput } from './sanitization'

export interface RequestValidationOptions {
  // Body validation
  bodySchema?: ZodSchema<any>
  maxBodySize?: number
  
  // Query parameter validation
  querySchema?: ZodSchema<any>
  
  // Path parameter validation
  paramsSchema?: ZodSchema<any>
  
  // Header validation
  requiredHeaders?: string[]
  
  // File upload validation
  fileSchema?: ZodSchema<any>
  maxFileSize?: number
  allowedMimeTypes?: string[]
  
  // Content type validation
  allowedContentTypes?: string[]
  
  // Custom validation functions
  customValidators?: Array<(request: NextRequest) => Promise<ValidationError | null>>
}

export interface ValidationError {
  code: string
  message: string
  field?: string
  details?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  data?: {
    body?: any
    query?: any
    params?: any
    files?: any
    headers?: any
  }
}

/**
 * Validate request headers
 */
function validateHeaders(
  request: NextRequest,
  requiredHeaders: string[] = []
): ValidationError[] {
  const errors: ValidationError[] = []
  
  for (const header of requiredHeaders) {
    const value = request.headers.get(header.toLowerCase())
    if (!value) {
      errors.push({
        code: 'MISSING_HEADER',
        message: `Required header '${header}' is missing`,
        field: header
      })
    }
  }
  
  return errors
}

/**
 * Validate content type
 */
function validateContentType(
  request: NextRequest,
  allowedTypes: string[] = []
): ValidationError[] {
  if (allowedTypes.length === 0) return []
  
  const contentType = request.headers.get('content-type')
  
  if (!contentType) {
    return [{
      code: 'MISSING_CONTENT_TYPE',
      message: 'Content-Type header is required'
    }]
  }
  
  const isAllowed = allowedTypes.some(type => contentType.includes(type))
  if (!isAllowed) {
    return [{
      code: 'INVALID_CONTENT_TYPE',
      message: `Content-Type '${contentType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      details: { contentType, allowedTypes }
    }]
  }
  
  return []
}

/**
 * Validate request body size
 */
function validateBodySize(
  request: NextRequest,
  maxSize: number = 1024 * 1024 // 1MB default
): ValidationError[] {
  const contentLength = request.headers.get('content-length')
  
  if (contentLength) {
    const size = parseInt(contentLength)
    if (size > maxSize) {
      return [{
        code: 'BODY_TOO_LARGE',
        message: `Request body too large. Maximum size is ${maxSize} bytes`,
        details: { size, maxSize }
      }]
    }
  }
  
  return []
}

/**
 * Validate and sanitize JSON body
 */
async function validateJsonBody(
  request: NextRequest,
  schema?: ZodSchema<any>
): Promise<{ errors: ValidationError[]; data?: any }> {
  const errors: ValidationError[] = []
  
  try {
    const body = await request.json()
    
    // Sanitize the body
    const { sanitized, threats } = sanitizeObject(body)
    
    // Log security threats
    if (threats.length > 0) {
      console.warn('Security threats detected in request body:', threats)
    }
    
    // Validate against schema if provided
    if (schema) {
      const result = schema.safeParse(sanitized)
      if (!result.success) {
        errors.push(...result.error.issues.map(issue => ({
          code: 'VALIDATION_ERROR',
          message: issue.message,
          field: issue.path.join('.'),
          details: issue
        })))
        return { errors }
      }
      
      return { errors: [], data: result.data }
    }
    
    return { errors: [], data: sanitized }
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body'
      })
    } else {
      errors.push({
        code: 'BODY_PARSE_ERROR',
        message: 'Failed to parse request body'
      })
    }
    
    return { errors }
  }
}

/**
 * Validate and sanitize form data
 */
async function validateFormData(
  request: NextRequest,
  schema?: ZodSchema<any>,
  fileOptions?: {
    maxSize?: number
    allowedMimeTypes?: string[]
  }
): Promise<{ errors: ValidationError[]; data?: any }> {
  const errors: ValidationError[] = []
  
  try {
    const formData = await request.formData()
    const data: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Validate file
        if (fileOptions?.maxSize && value.size > fileOptions.maxSize) {
          errors.push({
            code: 'FILE_TOO_LARGE',
            message: `File '${key}' is too large. Maximum size is ${fileOptions.maxSize} bytes`,
            field: key,
            details: { size: value.size, maxSize: fileOptions.maxSize }
          })
          continue
        }
        
        if (fileOptions?.allowedMimeTypes && !fileOptions.allowedMimeTypes.includes(value.type)) {
          errors.push({
            code: 'INVALID_FILE_TYPE',
            message: `File '${key}' has invalid type '${value.type}'. Allowed types: ${fileOptions.allowedMimeTypes.join(', ')}`,
            field: key,
            details: { type: value.type, allowedTypes: fileOptions.allowedMimeTypes }
          })
          continue
        }
        
        data[key] = value
      } else {
        // Sanitize text values
        const sanitized = sanitizeInput(value)
        if (sanitized.threats.length > 0) {
          console.warn(`Security threats detected in form field '${key}':`, sanitized.threats)
        }
        data[key] = sanitized.sanitized
      }
    }
    
    // Validate against schema if provided
    if (schema) {
      const result = schema.safeParse(data)
      if (!result.success) {
        errors.push(...result.error.issues.map(issue => ({
          code: 'VALIDATION_ERROR',
          message: issue.message,
          field: issue.path.join('.'),
          details: issue
        })))
        return { errors }
      }
      
      return { errors: [], data: result.data }
    }
    
    return { errors: [], data }
  } catch (error) {
    errors.push({
      code: 'FORM_PARSE_ERROR',
      message: 'Failed to parse form data'
    })
    
    return { errors }
  }
}

/**
 * Validate and sanitize query parameters
 */
function validateQueryParams(
  request: NextRequest,
  schema?: ZodSchema<any>
): { errors: ValidationError[]; data?: any } {
  const errors: ValidationError[] = []
  
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}
    
    // Convert URLSearchParams to object and sanitize
    for (const [key, value] of searchParams.entries()) {
      const sanitized = sanitizeInput(value)
      if (sanitized.threats.length > 0) {
        console.warn(`Security threats detected in query param '${key}':`, sanitized.threats)
      }
      params[key] = sanitized.sanitized
    }
    
    // Validate against schema if provided
    if (schema) {
      const result = schema.safeParse(params)
      if (!result.success) {
        errors.push(...result.error.issues.map(issue => ({
          code: 'VALIDATION_ERROR',
          message: issue.message,
          field: issue.path.join('.'),
          details: issue
        })))
        return { errors }
      }
      
      return { errors: [], data: result.data }
    }
    
    return { errors: [], data: params }
  } catch (error) {
    errors.push({
      code: 'QUERY_PARSE_ERROR',
      message: 'Failed to parse query parameters'
    })
    
    return { errors }
  }
}

/**
 * Validate path parameters
 */
function validatePathParams(
  params: Record<string, string | string[]>,
  schema?: ZodSchema<any>
): { errors: ValidationError[]; data?: any } {
  const errors: ValidationError[] = []
  
  try {
    // Sanitize path parameters
    const sanitizedParams: Record<string, any> = {}
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        sanitizedParams[key] = value.map(v => sanitizeInput(v).sanitized)
      } else {
        const sanitized = sanitizeInput(value)
        if (sanitized.threats.length > 0) {
          console.warn(`Security threats detected in path param '${key}':`, sanitized.threats)
        }
        sanitizedParams[key] = sanitized.sanitized
      }
    }
    
    // Validate against schema if provided
    if (schema) {
      const result = schema.safeParse(sanitizedParams)
      if (!result.success) {
        errors.push(...result.error.issues.map(issue => ({
          code: 'VALIDATION_ERROR',
          message: issue.message,
          field: issue.path.join('.'),
          details: issue
        })))
        return { errors }
      }
      
      return { errors: [], data: result.data }
    }
    
    return { errors: [], data: sanitizedParams }
  } catch (error) {
    errors.push({
      code: 'PARAMS_PARSE_ERROR',
      message: 'Failed to parse path parameters'
    })
    
    return { errors }
  }
}

/**
 * Comprehensive request validation
 */
export async function validateRequest(
  request: NextRequest,
  options: RequestValidationOptions = {},
  pathParams?: Record<string, string | string[]>
): Promise<ValidationResult> {
  const allErrors: ValidationError[] = []
  const data: any = {}
  
  try {
    // Validate headers
    if (options.requiredHeaders) {
      allErrors.push(...validateHeaders(request, options.requiredHeaders))
    }
    
    // Validate content type
    if (options.allowedContentTypes) {
      allErrors.push(...validateContentType(request, options.allowedContentTypes))
    }
    
    // Validate body size
    if (options.maxBodySize) {
      allErrors.push(...validateBodySize(request, options.maxBodySize))
    }
    
    // If there are critical errors, return early
    if (allErrors.length > 0) {
      return { isValid: false, errors: allErrors }
    }
    
    // Validate query parameters
    if (options.querySchema || request.url.includes('?')) {
      const queryResult = validateQueryParams(request, options.querySchema)
      allErrors.push(...queryResult.errors)
      if (queryResult.data) {
        data.query = queryResult.data
      }
    }
    
    // Validate path parameters
    if (pathParams && (options.paramsSchema || Object.keys(pathParams).length > 0)) {
      const paramsResult = validatePathParams(pathParams, options.paramsSchema)
      allErrors.push(...paramsResult.errors)
      if (paramsResult.data) {
        data.params = paramsResult.data
      }
    }
    
    // Validate request body
    const contentType = request.headers.get('content-type')
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && contentType) {
      if (contentType.includes('application/json')) {
        const bodyResult = await validateJsonBody(request, options.bodySchema)
        allErrors.push(...bodyResult.errors)
        if (bodyResult.data) {
          data.body = bodyResult.data
        }
      } else if (contentType.includes('multipart/form-data')) {
        const formResult = await validateFormData(request, options.fileSchema, {
          maxSize: options.maxFileSize,
          allowedMimeTypes: options.allowedMimeTypes
        })
        allErrors.push(...formResult.errors)
        if (formResult.data) {
          data.form = formResult.data
        }
      }
    }
    
    // Run custom validators
    if (options.customValidators) {
      for (const validator of options.customValidators) {
        const error = await validator(request)
        if (error) {
          allErrors.push(error)
        }
      }
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      data: Object.keys(data).length > 0 ? data : undefined
    }
  } catch (error) {
    console.error('Request validation error:', error)
    return {
      isValid: false,
      errors: [{
        code: 'VALIDATION_SYSTEM_ERROR',
        message: 'Internal validation error'
      }]
    }
  }
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(options: RequestValidationOptions) {
  return async (
    request: NextRequest,
    pathParams?: Record<string, string | string[]>
  ): Promise<ValidationResult> => {
    return validateRequest(request, options, pathParams)
  }
}
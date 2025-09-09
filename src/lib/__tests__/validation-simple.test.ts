/**
 * @jest-environment node
 */

import { sanitizeInput, sanitizeObject } from '../sanitization'
import { validateRequestBody, validateQueryParams } from '../validation-middleware'
import { z } from 'zod'

// Mock NextRequest for testing
class MockNextRequest {
  public url: string
  public method: string
  public headers: Map<string, string>
  private _body: any

  constructor(url: string, method: string = 'GET', body?: any) {
    this.url = url
    this.method = method
    this.headers = new Map()
    this._body = body
  }

  async json() {
    return this._body
  }

  get(name: string) {
    return this.headers.get(name.toLowerCase())
  }
}

describe('Validation System', () => {
  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello'
      const result = sanitizeInput(maliciousInput)
      
      expect(result.sanitized).toBe('Hello')
      expect(result.wasModified).toBe(true)
      expect(result.threats).toContain('XSS')
    })

    it('should sanitize SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const result = sanitizeInput(maliciousInput)
      
      expect(result.sanitized).not.toContain('DROP TABLE')
      expect(result.wasModified).toBe(true)
      expect(result.threats).toContain('SQL_INJECTION')
    })

    it('should sanitize path traversal attempts', () => {
      const maliciousInput = '../../../etc/passwd'
      const result = sanitizeInput(maliciousInput)
      
      expect(result.sanitized).not.toContain('../')
      expect(result.wasModified).toBe(true)
      expect(result.threats).toContain('PATH_TRAVERSAL')
    })

    it('should sanitize command injection attempts', () => {
      const maliciousInput = 'test; cat /etc/passwd'
      const result = sanitizeInput(maliciousInput)
      
      expect(result.sanitized).not.toContain(';')
      expect(result.wasModified).toBe(true)
      expect(result.threats).toContain('COMMAND_INJECTION')
    })

    it('should handle safe input without modification', () => {
      const safeInput = 'Hello World 123'
      const result = sanitizeInput(safeInput)
      
      expect(result.sanitized).toBe(safeInput)
      expect(result.wasModified).toBe(false)
      expect(result.threats).toHaveLength(0)
    })

    it('should trim whitespace by default', () => {
      const input = '  Hello World  '
      const result = sanitizeInput(input)
      
      expect(result.sanitized).toBe('Hello World')
      expect(result.wasModified).toBe(true)
    })

    it('should truncate long strings when maxLength is specified', () => {
      const longInput = 'a'.repeat(100)
      const result = sanitizeInput(longInput, { maxLength: 50 })
      
      expect(result.sanitized).toHaveLength(50)
      expect(result.wasModified).toBe(true)
    })
  })

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const maliciousObject = {
        name: '<script>alert("xss")</script>John',
        email: 'test@example.com',
        profile: {
          bio: "'; DROP TABLE users; --",
          website: '../../../etc/passwd'
        }
      }

      const result = sanitizeObject(maliciousObject)
      
      expect(result.sanitized.name).toBe('John')
      expect(result.sanitized.profile.bio).not.toContain('DROP TABLE')
      expect(result.sanitized.profile.website).not.toContain('../')
      expect(result.threats).toContain('XSS')
      expect(result.threats).toContain('SQL_INJECTION')
      expect(result.threats).toContain('PATH_TRAVERSAL')
    })

    it('should sanitize arrays', () => {
      const maliciousArray = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        'safe string'
      ]

      const result = sanitizeObject(maliciousArray)
      
      expect(result.sanitized[0]).toBe('')
      expect(result.sanitized[1]).not.toContain('DROP TABLE')
      expect(result.sanitized[2]).toBe('safe string')
      expect(result.threats).toContain('XSS')
      expect(result.threats).toContain('SQL_INJECTION')
    })

    it('should handle File objects without modification', () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const objectWithFile = {
        name: 'test',
        file: mockFile
      }

      const result = sanitizeObject(objectWithFile)
      
      expect(result.sanitized.file).toBe(mockFile)
      expect(result.sanitized.name).toBe('test')
    })
  })

  describe('Request Body Validation', () => {
    it('should validate valid JSON body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })

      const validBody = { name: 'John Doe', email: 'john@example.com' }
      const request = new MockNextRequest('http://localhost/test', 'POST', validBody)

      const result = await validateRequestBody(request as any, schema)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validBody)
    })

    it('should reject invalid JSON body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })

      const invalidBody = { name: '', email: 'invalid-email' }
      const request = new MockNextRequest('http://localhost/test', 'POST', invalidBody)

      const result = await validateRequestBody(request as any, schema)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.details).toBeDefined()
    })

    it('should sanitize malicious input in body', async () => {
      const schema = z.object({
        name: z.string(),
        description: z.string()
      })

      const maliciousBody = {
        name: '<script>alert("xss")</script>John',
        description: "'; DROP TABLE users; --"
      }
      const request = new MockNextRequest('http://localhost/test', 'POST', maliciousBody)

      const result = await validateRequestBody(request as any, schema)
      
      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('John')
      expect(result.data?.description).not.toContain('DROP TABLE')
    })
  })

  describe('Query Parameter Validation', () => {
    it('should validate valid query parameters', () => {
      const schema = z.object({
        page: z.coerce.number().int().min(1),
        limit: z.coerce.number().int().min(1).max(100)
      })

      const request = new MockNextRequest('http://localhost/test?page=1&limit=20')

      const result = validateQueryParams(request as any, schema)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ page: 1, limit: 20 })
    })

    it('should reject invalid query parameters', () => {
      const schema = z.object({
        page: z.coerce.number().int().min(1),
        limit: z.coerce.number().int().min(1).max(100)
      })

      const request = new MockNextRequest('http://localhost/test?page=0&limit=200')

      const result = validateQueryParams(request as any, schema)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should sanitize malicious query parameters', () => {
      const schema = z.object({
        search: z.string(),
        category: z.string()
      })

      const request = new MockNextRequest('http://localhost/test?search=<script>alert("xss")</script>&category=../../../etc/passwd')

      const result = validateQueryParams(request as any, schema)
      
      expect(result.success).toBe(true)
      expect(result.data?.search).toBe('')
      expect(result.data?.category).not.toContain('../')
    })
  })

  describe('Common Validation Schemas', () => {
    it('should validate UUID format', () => {
      const { commonSchemas } = require('../validation-middleware')
      
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUuid = 'not-a-uuid'

      expect(commonSchemas.uuid.safeParse(validUuid).success).toBe(true)
      expect(commonSchemas.uuid.safeParse(invalidUuid).success).toBe(false)
    })

    it('should validate and sanitize text content', () => {
      const { commonSchemas } = require('../validation-middleware')
      
      const maliciousText = '<script>alert("xss")</script>Hello'
      const result = commonSchemas.safeText.parse(maliciousText)
      
      expect(result).toBe('Hello')
    })

    it('should validate email format', () => {
      const { commonSchemas } = require('../validation-middleware')
      
      const validEmail = 'test@example.com'
      const invalidEmail = 'not-an-email'

      expect(commonSchemas.email.safeParse(validEmail).success).toBe(true)
      expect(commonSchemas.email.safeParse(invalidEmail).success).toBe(false)
    })

    it('should validate file size limits', () => {
      const { commonSchemas } = require('../validation-middleware')
      
      const validSize = 50 * 1024 * 1024 // 50MB
      const invalidSize = 200 * 1024 * 1024 // 200MB

      expect(commonSchemas.fileSize.safeParse(validSize).success).toBe(true)
      expect(commonSchemas.fileSize.safeParse(invalidSize).success).toBe(false)
    })
  })
})
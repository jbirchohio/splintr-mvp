/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/users/export/route'
import { createClient } from '@/lib/supabase'
import { validateDataExportRequest, createComplianceAuditLog } from '@/utils/privacy-compliance'

// Mock Next.js environment
global.Request = global.Request || require('node-fetch').Request
global.Response = global.Response || require('node-fetch').Response
global.Headers = global.Headers || require('node-fetch').Headers

// Mock Supabase
jest.mock('@/lib/supabase')
jest.mock('next/headers', () => ({
  cookies: () => ({})
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('/api/users/export', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/export', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost:3000/api/users/export')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should export user data for authenticated user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
        user_metadata: { name: 'Test User' }
      }

      const mockProfile = {
        id: 'user123',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      const mockStories = [{
        id: 'story1',
        title: 'Test Story',
        description: 'A test story',
        is_published: true,
        view_count: 10,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        published_at: '2023-01-01T00:00:00Z',
        story_data: { nodes: [] }
      }]

      const mockVideos = [{
        id: 'video1',
        original_filename: 'test.mp4',
        duration: 25,
        file_size: 1024000,
        processing_status: 'completed',
        moderation_status: 'approved',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }]

      const mockPlaythroughs = [{
        id: 'playthrough1',
        story_id: 'story1',
        path_taken: ['node1', 'node2'],
        completed_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z'
      }]

      const mockFlags = [{
        id: 'flag1',
        content_type: 'story',
        content_id: 'story2',
        reason: 'inappropriate',
        status: 'pending',
        created_at: '2023-01-01T00:00:00Z'
      }]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock database queries
      const mockSelect = jest.fn()
      const mockEq = jest.fn()
      const mockSingle = jest.fn()

      mockSupabase.from.mockImplementation((table: string) => {
        const query = {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle
            })
          })
        }

        // Configure responses based on table
        switch (table) {
          case 'users':
            mockSingle.mockResolvedValue({ data: mockProfile, error: null })
            break
          case 'stories':
            mockEq.mockResolvedValue({ data: mockStories, error: null })
            break
          case 'videos':
            mockEq.mockResolvedValue({ data: mockVideos, error: null })
            break
          case 'story_playthroughs':
            mockEq.mockResolvedValue({ data: mockPlaythroughs, error: null })
            break
          case 'content_flags':
            mockEq.mockResolvedValue({ data: mockFlags, error: null })
            break
        }

        return query
      })

      const request = new NextRequest('http://localhost:3000/api/users/export')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe('user123')
      expect(data.user.email).toBe('test@example.com')
      expect(data.profile.name).toBe('Test User')
      expect(data.stories).toHaveLength(1)
      expect(data.videos).toHaveLength(1)
      expect(data.playthroughs).toHaveLength(1)
      expect(data.contentFlags).toHaveLength(1)
      expect(data.exportDate).toBeDefined()

      // Check response headers
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should handle database errors gracefully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
        user_metadata: { name: 'Test User' }
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock database error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest('http://localhost:3000/api/users/export')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to export user data')
    })

    it('should include all required data fields', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
        user_metadata: { name: 'Test User' }
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock empty responses for all tables
      const mockSelect = jest.fn()
      const mockEq = jest.fn()
      const mockSingle = jest.fn()

      mockSupabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle.mockResolvedValue({ data: null, error: null })
          })
        })
      })

      mockEq.mockResolvedValue({ data: [], error: null })

      const request = new NextRequest('http://localhost:3000/api/users/export')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify all required fields are present
      expect(data).toHaveProperty('exportDate')
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('profile')
      expect(data).toHaveProperty('stories')
      expect(data).toHaveProperty('videos')
      expect(data).toHaveProperty('playthroughs')
      expect(data).toHaveProperty('contentFlags')

      // Verify arrays are initialized even when empty
      expect(Array.isArray(data.stories)).toBe(true)
      expect(Array.isArray(data.videos)).toBe(true)
      expect(Array.isArray(data.playthroughs)).toBe(true)
      expect(Array.isArray(data.contentFlags)).toBe(true)
    })

    it('should validate export request format', () => {
      const validRequest = {
        userId: 'user123',
        requestDate: new Date(),
        format: 'json' as const
      }

      const result = validateDataExportRequest(validRequest)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should create audit log for export request', () => {
      const auditLog = createComplianceAuditLog(
        'user123',
        'export',
        { format: 'json', dataCategories: ['all'] }
      )

      expect(auditLog.userId).toBe('user123')
      expect(auditLog.action).toBe('export')
      expect(auditLog.details.format).toBe('json')
      expect(auditLog.timestamp).toBeInstanceOf(Date)
      expect(auditLog.id).toBeDefined()
    })

    it('should handle partial data scenarios', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: null, // No last sign in
        user_metadata: {}
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock profile not found
      const mockSelect = jest.fn()
      const mockEq = jest.fn()
      const mockSingle = jest.fn()

      mockSupabase.from.mockImplementation((table: string) => {
        const query = {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle
            })
          })
        }

        if (table === 'users') {
          mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') })
        } else {
          mockEq.mockResolvedValue({ data: [], error: null })
        }

        return query
      })

      const request = new NextRequest('http://localhost:3000/api/users/export')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.lastSignIn).toBeNull()
      expect(data.profile).toBeNull()
      expect(data.stories).toHaveLength(0)
    })
  })
})
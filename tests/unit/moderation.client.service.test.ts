import { clientModerationService } from '@/services/moderation.client.service'

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
})

describe('ClientModerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
    mockLocalStorage.getItem.mockClear()
  })

  describe('flagContent', () => {
    it('should successfully flag content', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'flag-id',
          contentType: 'video',
          contentId: 'content-id',
          reason: 'Inappropriate',
          status: 'pending'
        }
      }

      mockLocalStorage.getItem.mockReturnValue('mock-token')
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await clientModerationService.flagContent(
        'content-id',
        'video',
        'Inappropriate content'
      )

      expect(fetch).toHaveBeenCalledWith('/api/moderation/flag-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          contentId: 'content-id',
          contentType: 'video',
          reason: 'Inappropriate content'
        })
      })

      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error when no auth token is found', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = ''

      await expect(
        clientModerationService.flagContent('content-id', 'video', 'Test reason')
      ).rejects.toThrow('No authentication token found')
    })

    it('should handle API errors', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-token')
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request' })
      })

      await expect(
        clientModerationService.flagContent('content-id', 'video', 'Test reason')
      ).rejects.toThrow('Invalid request')
    })
  })

  describe('getModerationQueue', () => {
    it('should fetch moderation queue', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'queue-item-1',
            contentId: 'content-1',
            contentType: 'video',
            priority: 'medium'
          }
        ]
      }

      mockLocalStorage.getItem.mockReturnValue('admin-token')
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await clientModerationService.getModerationQueue(25)

      expect(fetch).toHaveBeenCalledWith('/api/moderation/queue?limit=25', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      })

      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('reviewFlaggedContent', () => {
    it('should successfully review flagged content', async () => {
      const mockResponse = {
        success: true,
        message: 'Content approved successfully'
      }

      mockLocalStorage.getItem.mockReturnValue('admin-token')
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await clientModerationService.reviewFlaggedContent(
        'flag-id',
        'approve',
        'Content looks fine'
      )

      expect(fetch).toHaveBeenCalledWith('/api/moderation/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({
          flagId: 'flag-id',
          decision: 'approve',
          adminNotes: 'Content looks fine'
        })
      })
    })
  })

  describe('scanText', () => {
    it('should scan text content', async () => {
      const mockResponse = {
        success: true,
        data: {
          contentId: 'text-id',
          contentType: 'text',
          status: 'approved',
          confidence: 0.2,
          provider: 'openai'
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await clientModerationService.scanText({
        text: 'Test message',
        contentId: 'text-id'
      })

      expect(fetch).toHaveBeenCalledWith('/api/moderation/scan-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test message',
          contentId: 'text-id'
        })
      })

      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('scanVideo', () => {
    it('should scan video content', async () => {
      const mockResponse = {
        success: true,
        data: {
          contentId: 'video-id',
          contentType: 'video',
          status: 'approved',
          confidence: 0.1,
          provider: 'aws-rekognition'
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await clientModerationService.scanVideo({
        videoUrl: 'https://example.com/video.mp4',
        contentId: 'video-id'
      })

      expect(fetch).toHaveBeenCalledWith('/api/moderation/scan-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl: 'https://example.com/video.mp4',
          contentId: 'video-id'
        })
      })

      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getAuthToken', () => {
    it('should get token from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('localStorage-token')

      // We need to test this indirectly through a method that uses it
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })

      await clientModerationService.getModerationQueue()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer localStorage-token'
          })
        })
      )
    })

    it('should get token from cookies when localStorage is empty', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      document.cookie = 'sb-access-token=cookie-token; other=value'

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })

      await clientModerationService.getModerationQueue()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer cookie-token'
          })
        })
      )
    })
  })
})
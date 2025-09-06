import { 
  ModerationResult, 
  TextModerationRequest, 
  VideoModerationRequest,
  ContentFlag,
  ModerationQueueItem
} from '@/types/moderation.types'

class ClientModerationService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (options.headers) {
      Object.assign(headers, options.headers)
    }

    const response = await fetch(`/api/moderation${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  }

  async scanText(request: TextModerationRequest): Promise<ModerationResult> {
    const response = await this.makeRequest('/scan-text', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.data
  }

  async scanVideo(request: VideoModerationRequest): Promise<ModerationResult> {
    const response = await this.makeRequest('/scan-video', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.data
  }

  async flagContent(
    contentId: string, 
    contentType: 'story' | 'video' | 'comment', 
    reason: string
  ): Promise<ContentFlag> {
    // Get auth token from localStorage or cookies
    const token = this.getAuthToken()
    
    const response = await this.makeRequest('/flag-content', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        contentId,
        contentType,
        reason,
      }),
    })
    return response.data
  }

  async getModerationQueue(limit = 50): Promise<ModerationQueueItem[]> {
    const token = this.getAuthToken()
    
    const response = await this.makeRequest(`/queue?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return response.data
  }

  async reviewFlaggedContent(
    flagId: string, 
    decision: 'approve' | 'reject', 
    adminNotes?: string
  ): Promise<void> {
    const token = this.getAuthToken()
    
    await this.makeRequest('/review', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        flagId,
        decision,
        adminNotes,
      }),
    })
  }

  async getModerationStatus(
    contentId: string,
    contentType: 'story' | 'video' | 'comment'
  ): Promise<ModerationResult | null> {
    const response = await this.makeRequest(`/status/${contentId}?type=${contentType}`, {
      method: 'GET',
    })
    return response.data
  }

  private getAuthToken(): string {
    // Try to get token from Supabase client
    if (typeof window !== 'undefined') {
      // Check localStorage for Supabase session
      const supabaseSession = localStorage.getItem('sb-access-token')
      if (supabaseSession) {
        return supabaseSession
      }

      // Fallback to cookies
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'sb-access-token') {
          return value
        }
      }
    }
    
    throw new Error('No authentication token found')
  }
}

export const clientModerationService = new ClientModerationService()
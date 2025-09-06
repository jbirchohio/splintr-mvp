export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
  success: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
  requestId: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestConfig {
  method: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}
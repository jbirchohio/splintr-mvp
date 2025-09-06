import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors
        const errorWithStatus = error as { status?: number }
        if (errorWithStatus?.status && errorWithStatus.status >= 400 && errorWithStatus.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: false,
    },
  },
})
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthResult {
  user: User | null
  error?: string
}

export interface AuthService {
  signInWithGoogle(): Promise<AuthResult>
  signInWithApple(): Promise<AuthResult>
  signOut(): Promise<void>
  getCurrentUser(): Promise<User | null>
  refreshToken(): Promise<string>
}

export type AuthProvider = 'google' | 'apple'

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: Date
}
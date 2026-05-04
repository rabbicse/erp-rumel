'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, AuthResponse } from '@/types'
import { authApi } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Restore user from localStorage on mount
    const storedUser = localStorage.getItem('erp_user')
    const token = localStorage.getItem('erp_token')
    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data: AuthResponse = await authApi.login(email, password)
    localStorage.setItem('erp_token', data.token)
    localStorage.setItem('erp_refresh_token', data.refresh_token)
    localStorage.setItem('erp_user', JSON.stringify(data.user))
    setUser(data.user)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_refresh_token')
    localStorage.removeItem('erp_user')
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

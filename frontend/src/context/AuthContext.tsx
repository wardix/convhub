import {
  type ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api } from '../api/client'
import type { User } from '../types'
import { mapUser } from '../utils/mappers'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User) => void
  register: (user: User) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.get<{ user: User }>('/auth/me')
        setUser(mapUser(data.user))
      } catch (_error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback((userData: User) => {
    setUser(userData)
  }, [])

  const register = useCallback((userData: User) => {
    setUser(userData)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (_e) {
      // Ignore
    } finally {
      setUser(null)
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      updateUser,
      logout,
    }),
    [user, isLoading, login, register, updateUser, logout],
  )

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

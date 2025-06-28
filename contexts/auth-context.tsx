"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { apiClient, tokenManager } from "@/lib/api"
import type { User } from "@/types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await apiClient.getCurrentUser()
      if (response.data) {
        setUser(response.data)
      } else {
        tokenManager.removeToken()
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login({ username: email, password })

      if (response.data) {
        tokenManager.setToken(response.data.access_token)

        // Get user data after successful login
        const userResponse = await apiClient.getCurrentUser()
        if (userResponse.data) {
          setUser(userResponse.data)
          return { success: true }
        }
      }

      return { success: false, error: response.error || "Login failed" }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  const register = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await apiClient.register({
        email,
        password,
        full_name: fullName,
      })

      if (response.data) {
        // Auto-login after successful registration
        return await login(email, password)
      }

      return { success: false, error: response.error || "Registration failed" }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      tokenManager.removeToken()
      setUser(null)
    }
  }

  const updateUser = async (userData: Partial<User>) => {
    try {
      // Convert numeric fields to strings if they exist
      const payload: any = { ...userData }
      if (userData.monthly_income !== undefined) {
        payload.monthly_income = userData.monthly_income.toString()
      }
      if (userData.savings_goal_amount !== undefined) {
        payload.savings_goal_amount = userData.savings_goal_amount.toString()
      }

      const response = await apiClient.updateCurrentUser(payload)

      if (response.data) {
        setUser(response.data)
        return { success: true }
      }

      return { success: false, error: response.error || "Update failed" }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

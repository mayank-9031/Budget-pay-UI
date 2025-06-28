// API Configuration and Service Layer
const API_BASE_URL = "http://localhost:8000"

// Types for API responses
export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface ApiError {
  detail: string | { msg: string; type: string }[]
}

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  },

  setToken: (token: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem("access_token", token)
  },

  removeToken: (): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem("access_token")
  },
}

// Base API client
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const token = tokenManager.getToken()

    // Default headers
    const defaultHeaders: Record<string, string> = {}

    // Only add JSON content type if not already specified
    if (!options.headers || !("Content-Type" in options.headers)) {
      defaultHeaders["Content-Type"] = "application/json"
    }

    // Add auth token if available
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`
    }

    const config: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (response.status === 204) {
        return { status: response.status }
      }

      const data = await response.json()

      if (!response.ok) {
        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((err: any) => err.msg).join(", ")
              : "An error occurred"

        return {
          error: errorMessage,
          status: response.status,
        }
      }

      return {
        data,
        status: response.status,
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      }
    }
  }

  // Auth endpoints
  async register(userData: {
    email: string
    password: string
    full_name?: string
  }): Promise<ApiResponse<any>> {
    return this.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async login(credentials: {
    username: string
    password: string
  }): Promise<ApiResponse<LoginResponse>> {
    // Create form data for x-www-form-urlencoded
    const formData = new URLSearchParams()
    formData.append("username", credentials.username)
    formData.append("password", credentials.password)

    return this.request("/api/v1/auth/jwt/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request("/api/v1/auth/jwt/logout", {
      method: "POST",
    })
  }

  // User endpoints
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request("/api/v1/users/me")
  }

  async updateCurrentUser(
    userData: Partial<{
      full_name: string
      monthly_income: number
      savings_goal_amount: number
      savings_goal_deadline: string
    }>,
  ): Promise<ApiResponse<any>> {
    return this.request("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(userData),
    })
  }

  async deleteCurrentUser(): Promise<ApiResponse<void>> {
    return this.request("/api/v1/users/me", {
      method: "DELETE",
    })
  }

  async deactivateAccount(): Promise<ApiResponse<void>> {
    return this.request("/api/v1/users/deactivate", {
      method: "POST",
    })
  }

  // Categories endpoints
  async getCategories(): Promise<ApiResponse<any[]>> {
    return this.request("/api/v1/categories")
  }

  async createCategory(categoryData: {
    name: string
    description?: string
    default_percentage: number
    custom_percentage?: number
    is_default?: boolean
    color?: string
  }): Promise<ApiResponse<any>> {
    return this.request("/api/v1/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    })
  }

  async getCategory(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/categories/${id}`)
  }

  async updateCategory(
    id: string,
    categoryData: Partial<{
      name: string
      description: string
      default_percentage: number
      custom_percentage: number
      is_default: boolean
      color: string
    }>,
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(categoryData),
    })
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/v1/categories/${id}`, {
      method: "DELETE",
    })
  }

  // Expenses endpoints
  async getExpenses(): Promise<ApiResponse<any[]>> {
    return this.request("/api/v1/expenses")
  }

  async createExpense(expenseData: {
    name: string
    amount: number
    category_id?: string
    frequency_type: string
    interval_days?: number
    next_due_date?: string
    is_active?: boolean
  }): Promise<ApiResponse<any>> {
    return this.request("/api/v1/expenses", {
      method: "POST",
      body: JSON.stringify(expenseData),
    })
  }

  async getExpense(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/expenses/${id}`)
  }

  async updateExpense(
    id: string,
    expenseData: Partial<{
      name: string
      amount: number
      category_id: string
      frequency_type: string
      interval_days: number
      next_due_date: string
      is_active: boolean
    }>,
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(expenseData),
    })
  }

  async deleteExpense(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/v1/expenses/${id}`, {
      method: "DELETE",
    })
  }

  // Transactions endpoints
  async getTransactions(): Promise<ApiResponse<any[]>> {
    return this.request("/api/v1/transactions")
  }

  async createTransaction(transactionData: {
    description: string
    amount: number
    category_id?: string
    transaction_date: string
  }): Promise<ApiResponse<any>> {
    return this.request("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify(transactionData),
    })
  }

  async getTransaction(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/transactions/${id}`)
  }

  async updateTransaction(
    id: string,
    transactionData: Partial<{
      description: string
      amount: number
      category_id: string
      transaction_date: string
    }>,
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(transactionData),
    })
  }

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/v1/transactions/${id}`, {
      method: "DELETE",
    })
  }

  // Goals endpoints
  async getGoals(): Promise<ApiResponse<any[]>> {
    return this.request("/api/v1/goals")
  }

  async createGoal(goalData: {
    target_amount: number
    deadline: string
  }): Promise<ApiResponse<any>> {
    return this.request("/api/v1/goals", {
      method: "POST",
      body: JSON.stringify(goalData),
    })
  }

  async getGoal(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/goals/${id}`)
  }

  async updateGoal(
    id: string,
    goalData: Partial<{
      target_amount: number
      deadline: string
      saved_amount: number
      is_active: boolean
    }>,
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(goalData),
    })
  }

  async deleteGoal(id: string): Promise<ApiResponse<void>> {
    return this.request(`/api/v1/goals/${id}`, {
      method: "DELETE",
    })
  }

  // Dashboard endpoint
  async getDashboardSummary(period: "day" | "week" | "month" | "year" = "month"): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/dashboard/summary?period=${period}`)
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

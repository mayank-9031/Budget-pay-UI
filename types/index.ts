export interface User {
  id: string
  email: string
  full_name: string
  monthly_income: number
  savings_goal_amount: number
  savings_goal_deadline: string
  is_active: boolean
  is_superuser: boolean
}

export interface Category {
  id: string
  name: string
  description: string
  default_percentage: number
  custom_percentage: number
  is_default: boolean
  color: string
}

export interface Expense {
  id: string
  name: string
  amount: number
  category_id: string | null
  frequency_type: "one_time" | "monthly" | "weekly" | "custom"
  interval_days: number | null
  next_due_date: string
  is_active: boolean
}

export interface Transaction {
  id: string
  description: string
  amount: number
  category_id: string
  transaction_date: string
}

export interface Goal {
  id: string
  user_id: string
  target_amount: number
  deadline: string
  saved_amount: number
  is_active: boolean
}

export interface CategoryHealth {
  allocated: number
  spent: number
  remaining: number
  status: "green" | "yellow" | "red"
}

export interface DashboardSummary {
  monthly_income: number
  recurring_total: number
  total_spent: number
  allocation_per_category: Record<string, number>
  daily_budget: number
  category_health: Record<string, CategoryHealth>
}

"use client"

import { useEffect, useState } from "react"
import { DollarSign, TrendingUp, TrendingDown, Target } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatCard } from "@/components/ui/stat-card"
import { AllocationChart } from "@/components/charts/allocation-chart"
import { SpendingChart } from "@/components/charts/spending-chart"
import { PeriodFilter } from "@/components/ui/period-filter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { apiClient } from "@/lib/api"
import { getCategoryColor } from "@/lib/colors"
import { useAuth } from "@/contexts/auth-context"
import { usePeriodFilter } from "@/contexts/period-filter-context"
import type { DashboardSummary, Category, Transaction } from "@/types"
import { SpendingTrendsChart } from "@/components/charts/spending-trends-chart"

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const { period, getPeriodLabel, getPeriodMultiplier, getCurrentPeriodRange } = usePeriodFilter()
  const multiplier = getPeriodMultiplier(period)
  const periodRange = getCurrentPeriodRange(period)
  const periodTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transaction_date)
    return transactionDate >= periodRange.start && transactionDate <= periodRange.end
  })

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Fetch categories and transactions
      const [categoriesResponse, transactionsResponse] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTransactions(),
      ])

      if (categoriesResponse.error) {
        throw new Error(categoriesResponse.error)
      }
      if (transactionsResponse.error) {
        throw new Error(transactionsResponse.error)
      }

      setCategories(categoriesResponse.data || [])
      setTransactions(transactionsResponse.data || [])

      // Calculate dashboard data based on period
      const calculatedData = calculateDashboardData(categoriesResponse.data || [], transactionsResponse.data || [])
      setDashboardData(calculatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDashboardData = (categories: Category[], transactions: Transaction[]): DashboardSummary => {
    if (!user?.monthly_income) {
      return {
        monthly_income: 0,
        recurring_total: 0,
        total_spent: 0,
        daily_budget: 0,
        allocation_per_category: {},
        category_health: {},
      }
    }

    const monthlyIncome = user.monthly_income
    const savingsGoalAmount = user.savings_goal_amount || 0

    // Calculate period-based income and budget
    const periodIncome = monthlyIncome * multiplier
    const periodSavingsGoal = savingsGoalAmount * multiplier
    const availableBudget = periodIncome - periodSavingsGoal

    // Calculate daily budget based on period
    let dailyBudget = 0
    switch (period) {
      case "daily":
        dailyBudget = availableBudget
        break
      case "weekly":
        dailyBudget = availableBudget / 7
        break
      case "monthly":
        dailyBudget = availableBudget / 30
        break
      case "yearly":
        dailyBudget = availableBudget / 365
        break
    }

    // Filter transactions for the current period
    const periodTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      return transactionDate >= periodRange.start && transactionDate <= periodRange.end
    })

    // Calculate total spent in the period
    const totalSpent = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

    // Calculate allocation per category
    const allocationPerCategory: Record<string, number> = {}
    categories.forEach((category) => {
      const allocatedPercentage = category.custom_percentage || category.default_percentage
      allocationPerCategory[category.id] = (availableBudget * allocatedPercentage) / 100
    })

    // Calculate category health
    const categoryHealth: Record<string, any> = {}
    const categorySpending: Record<string, number> = {}

    // Group spending by category
    periodTransactions.forEach((transaction) => {
      const categoryId = transaction.category_id || "uncategorized"
      categorySpending[categoryId] = (categorySpending[categoryId] || 0) + transaction.amount
    })

    // Calculate health for each category
    categories.forEach((category) => {
      const allocated = allocationPerCategory[category.id] || 0
      const spent = categorySpending[category.id] || 0
      const remaining = allocated - spent

      categoryHealth[category.name] = {
        allocated,
        spent,
        remaining,
        status: remaining >= 0 ? "green" : "red",
      }
    })

    return {
      monthly_income: periodIncome,
      recurring_total: 0, // Not used in current implementation
      total_spent: totalSpent,
      daily_budget: dailyBudget,
      allocation_per_category: allocationPerCategory,
      category_health: categoryHealth,
    }
  }

  // Calculate savings progress using period-based logic
  const calculateSavingsProgress = () => {
    if (!user?.monthly_income || !user?.savings_goal_amount) {
      return { savedAmount: 0, targetAmount: 0, progressPercentage: 0 }
    }

    const monthlyIncome = user.monthly_income
    const monthlySavingsGoal = user.savings_goal_amount

    if (period === "yearly") {
      // Use the same yearly calculation logic as Goals page
      const getSavingsJourneyStartDate = () => {
        if (transactions.length === 0) {
          return new Date()
        }

        const earliestTransaction = transactions.reduce((earliest, transaction) => {
          const transactionDate = new Date(transaction.transaction_date)
          return transactionDate < earliest ? transactionDate : earliest
        }, new Date(transactions[0].transaction_date))

        return new Date(earliestTransaction.getFullYear(), earliestTransaction.getMonth(), 1)
      }

      const journeyStartDate = getSavingsJourneyStartDate()
      const now = new Date()

      // Calculate months completed
      const monthsCompleted = Math.max(
        0,
        (now.getFullYear() - journeyStartDate.getFullYear()) * 12 +
          (now.getMonth() - journeyStartDate.getMonth()) +
          (now.getDate() >= journeyStartDate.getDate() ? 1 : 0),
      )

      // Calculate actual savings for completed months
      let totalActualSavings = 0

      for (let i = 0; i < monthsCompleted; i++) {
        const monthStart = new Date(journeyStartDate.getFullYear(), journeyStartDate.getMonth() + i, 1)
        const monthEnd = new Date(journeyStartDate.getFullYear(), journeyStartDate.getMonth() + i + 1, 0)

        const monthTransactions = transactions.filter((t) => {
          const transactionDate = new Date(t.transaction_date)
          return transactionDate >= monthStart && transactionDate <= monthEnd
        })

        const monthlySpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
        const actualSavings = Math.max(0, monthlyIncome - monthlySpent)
        totalActualSavings += actualSavings
      }

      // Add current month savings
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const currentMonthTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.transaction_date)
        return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd
      })
      const currentMonthSpent = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
      const currentMonthSavings = Math.max(0, monthlyIncome - currentMonthSpent)

      const savedAmount = totalActualSavings + currentMonthSavings
      const targetAmount = monthlySavingsGoal * 12
      const progressPercentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0

      return { savedAmount, targetAmount, progressPercentage }
    } else {
      // Original logic for other periods
      const periodIncome = monthlyIncome * multiplier
      const targetAmount = monthlySavingsGoal * multiplier

      let budgetForPeriod = 0
      const now = new Date()

      switch (period) {
        case "daily":
          budgetForPeriod = periodIncome
          break
        case "weekly":
          const daysInWeek = Math.min(now.getDay() + 1, 7)
          budgetForPeriod = (periodIncome / 7) * daysInWeek
          break
        case "monthly":
          const daysInMonth = now.getDate()
          budgetForPeriod = (periodIncome / 30) * daysInMonth
          break
      }

      const totalSpentInPeriod = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
      const savedAmount = Math.max(0, budgetForPeriod - totalSpentInPeriod)
      const progressPercentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0

      return { savedAmount, targetAmount, progressPercentage }
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <ErrorMessage message={error} />
      </MainLayout>
    )
  }

  if (!dashboardData) {
    return (
      <MainLayout>
        <ErrorMessage message="No dashboard data available" />
      </MainLayout>
    )
  }

  const { monthly_income, total_spent, daily_budget, allocation_per_category, category_health } = dashboardData
  const { savedAmount, targetAmount, progressPercentage } = calculateSavingsProgress()
  const periodLabel = getPeriodLabel(period)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome back! Here's your financial overview.</p>
          </div>
          <PeriodFilter />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard
            title={`${periodLabel} Income`}
            value={`₹${monthly_income?.toLocaleString() || "0"}`}
            icon={DollarSign}
          />
          <StatCard
            title={`${periodLabel} Remaining`}
            value={`₹${Math.max(0, (monthly_income || 0) - (total_spent || 0)).toFixed(2)}`}
            icon={TrendingUp}
            trend={{
              value: total_spent > 0 ? `₹${total_spent.toFixed(2)} spent` : "No spending yet",
              isPositive: (monthly_income || 0) > (total_spent || 0),
            }}
          />
          <StatCard
            title={`${periodLabel} Spent`}
            value={`₹${total_spent?.toFixed(2) || "0.00"}`}
            icon={TrendingDown}
            trend={{
              value: `${period === "daily" ? "Today" : period === "weekly" ? "This Week" : period === "monthly" ? "This Month" : "This Year"}`,
              isPositive: false,
            }}
          />
          <StatCard
            title="Savings Progress"
            value={`${progressPercentage.toFixed(1)}%`}
            icon={Target}
            trend={{
              value:
                targetAmount && Number(targetAmount) > 0
                  ? `₹${Number(savedAmount || 0).toFixed(2)} / ₹${Number(targetAmount).toFixed(2)}`
                  : "No target set",
              isPositive: true,
            }}
          />
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="xl:col-span-2">
            <SpendingTrendsChart transactions={transactions} />
          </div>
          <div>
            <AllocationChart data={allocation_per_category || {}} categories={categories} />
          </div>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <SpendingChart />

          <Card>
            <CardHeader>
              <CardTitle>Top Spending Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(category_health)
                  .sort(([, a], [, b]) => b.spent - a.spent)
                  .slice(0, 5)
                  .map(([categoryName, health]) => {
                    const categoryColor = getCategoryColor(categoryName, categoryName)
                    const maxSpent = Math.max(...Object.values(category_health).map((h) => h.spent))
                    const percentage = maxSpent > 0 ? (health.spent / maxSpent) * 100 : 0

                    return (
                      <div key={categoryName} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColor }} />
                            <span className="font-medium text-sm">{categoryName}</span>
                          </div>
                          <span className="text-sm font-semibold">₹{health.spent?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: categoryColor,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.slice(0, 5).map((category) => {
                  const categorySpending = periodTransactions
                    .filter((t) => t.category_id === category.id)
                    .reduce((sum, t) => sum + t.amount, 0)
                  const allocated =
                    ((monthly_income * multiplier - (user?.savings_goal_amount || 0) * multiplier) *
                      (category.custom_percentage || category.default_percentage)) /
                    100
                  const percentage = allocated > 0 ? (categorySpending / allocated) * 100 : 0

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-gray-600">₹{categorySpending.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: getCategoryColor(category.id, category.name),
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-600">Transactions</p>
                    <p className="text-xl font-bold text-blue-900">{periodTransactions.length}</p>
                  </div>
                  <div className="text-blue-500">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-green-600">Avg per Transaction</p>
                    <p className="text-xl font-bold text-green-900">
                      ₹{periodTransactions.length > 0 ? (total_spent / periodTransactions.length).toFixed(2) : "0.00"}
                    </p>
                  </div>
                  <div className="text-green-500">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm text-purple-600">Categories Used</p>
                    <p className="text-xl font-bold text-purple-900">
                      {new Set(periodTransactions.map((t) => t.category_id).filter(Boolean)).size}
                    </p>
                  </div>
                  <div className="text-purple-500">
                    <Target className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(category_health)
                  .slice(0, 4)
                  .map(([categoryName, health]) => {
                    const categoryColor = getCategoryColor(categoryName, categoryName)
                    const isOverBudget = health.remaining < 0

                    return (
                      <div key={categoryName} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColor }} />
                          <span className="text-sm font-medium truncate">{categoryName}</span>
                        </div>
                        <Badge
                          variant={isOverBudget ? "destructive" : "default"}
                          className={isOverBudget ? "" : "bg-green-100 text-green-800"}
                        >
                          {isOverBudget ? "Over" : "Good"}
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Savings Goal Progress */}
        {targetAmount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{periodLabel} Savings Goal Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Progress</span>
                  <span className="text-sm text-gray-600">
                    ₹{Number(savedAmount || 0).toFixed(2)} / ₹{Number(targetAmount || 0).toFixed(2)}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{Number(progressPercentage || 0).toFixed(1)}% complete</span>
                  <span>
                    {Number(progressPercentage || 0) >= 100
                      ? "Goal achieved!"
                      : `₹${(Number(targetAmount || 0) - Number(savedAmount || 0)).toFixed(2)} remaining`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Health Table */}
        {category_health && Object.keys(category_health).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{periodLabel} Category Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Allocated</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Spent</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Remaining</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(category_health).map(([categoryName, health]) => {
                      const categoryColor = getCategoryColor(categoryName, categoryName)

                      return (
                        <tr key={categoryName} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: categoryColor }} />
                              <span className="font-medium">{categoryName}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">₹{health.allocated?.toFixed(2) || "0.00"}</td>
                          <td className="text-right py-3 px-4">₹{health.spent?.toFixed(2) || "0.00"}</td>
                          <td className="text-right py-3 px-4">₹{health.remaining?.toFixed(2) || "0.00"}</td>
                          <td className="text-center py-3 px-4">
                            <Badge
                              variant={health.status === "green" ? "default" : "destructive"}
                              className={health.status === "green" ? "bg-green-100 text-green-800" : ""}
                            >
                              {health.status === "green" ? "Good" : "Over Budget"}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

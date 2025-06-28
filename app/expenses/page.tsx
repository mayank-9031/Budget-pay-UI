"use client"
import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Target } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PeriodFilter } from "@/components/ui/period-filter"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { apiClient } from "@/lib/api"
import { getCategoryColor, getCategoryColorWithOpacity } from "@/lib/colors"
import { useAuth } from "@/contexts/auth-context"
import { usePeriodFilter } from "@/contexts/period-filter-context"
import type { Category, Transaction } from "@/types"

interface CategoryBudget {
  id: string
  name: string
  description: string
  allocatedAmount: number
  spentAmount: number
  remainingAmount: number
  percentage: number
  status: "good" | "warning" | "danger"
  transactionCount: number
}

export default function ExpensesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const { period, getPeriodLabel, getPeriodMultiplier, getCurrentPeriodRange } = usePeriodFilter()

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setIsLoading(true)
    setError("")

    try {
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

      // Calculate category budgets
      calculateCategoryBudgets(categoriesResponse.data || [], transactionsResponse.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCategoryBudgets = (categories: Category[], transactions: Transaction[]) => {
    if (!user?.monthly_income) return

    const monthlyIncome = user.monthly_income
    const savingsGoalAmount = user.savings_goal_amount || 0
    const multiplier = getPeriodMultiplier(period)
    const periodRange = getCurrentPeriodRange(period)

    // Calculate period-based income and available budget
    const periodIncome = monthlyIncome * multiplier
    const periodSavingsGoal = savingsGoalAmount * multiplier
    const availableBudget = periodIncome - periodSavingsGoal

    const budgets: CategoryBudget[] = []

    // Filter transactions for the current period
    const periodTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      return transactionDate >= periodRange.start && transactionDate <= periodRange.end
    })

    // Calculate spending per category
    const categorySpending: Record<string, { amount: number; count: number }> = {}

    periodTransactions.forEach((transaction) => {
      const categoryId = transaction.category_id || "uncategorized"
      if (!categorySpending[categoryId]) {
        categorySpending[categoryId] = { amount: 0, count: 0 }
      }
      categorySpending[categoryId].amount += transaction.amount
      categorySpending[categoryId].count += 1
    })

    // Process each category
    categories.forEach((category) => {
      const allocatedPercentage = category.custom_percentage || category.default_percentage
      const allocatedAmount = (availableBudget * allocatedPercentage) / 100
      const spending = categorySpending[category.id] || { amount: 0, count: 0 }
      const spentAmount = spending.amount
      const remainingAmount = allocatedAmount - spentAmount
      const usagePercentage = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0

      let status: "good" | "warning" | "danger" = "good"
      if (usagePercentage >= 100) {
        status = "danger"
      } else if (usagePercentage >= 80) {
        status = "warning"
      }

      budgets.push({
        id: category.id,
        name: category.name,
        description: category.description || "",
        allocatedAmount,
        spentAmount,
        remainingAmount,
        percentage: Math.min(usagePercentage, 100),
        status,
        transactionCount: spending.count,
      })
    })

    // Add uncategorized if there are uncategorized transactions
    if (categorySpending.uncategorized) {
      const spending = categorySpending.uncategorized
      budgets.push({
        id: "uncategorized",
        name: "Uncategorized",
        description: "Transactions without a category",
        allocatedAmount: 0,
        spentAmount: spending.amount,
        remainingAmount: -spending.amount,
        percentage: 100,
        status: "warning",
        transactionCount: spending.count,
      })
    }

    // Sort by allocated amount (highest first)
    budgets.sort((a, b) => b.allocatedAmount - a.allocatedAmount)
    setCategoryBudgets(budgets)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "danger":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <CheckCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "danger":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  // Calculate totals based on the period
  const monthlyIncome = user?.monthly_income || 0
  const savingsGoalAmount = user?.savings_goal_amount || 0
  const multiplier = getPeriodMultiplier(period)
  const periodIncome = monthlyIncome * multiplier
  const periodSavingsGoal = savingsGoalAmount * multiplier
  const totalAllocated = periodIncome - periodSavingsGoal

  // Calculate total spent for current period
  const periodRange = getCurrentPeriodRange(period)
  const periodTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transaction_date)
    return transactionDate >= periodRange.start && transactionDate <= periodRange.end
  })

  const totalSpent = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalRemaining = totalAllocated - totalSpent
  const periodLabel = getPeriodLabel(period)

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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Budget Overview</h1>
            <p className="text-sm sm:text-base text-gray-600">Track your spending progress across all categories</p>
          </div>
          <PeriodFilter />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">{periodLabel} Allocated</p>
                  <p className="text-2xl font-bold">₹{totalAllocated.toFixed(2)}</p>
                </div>
                <Target className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">{periodLabel} Spent</p>
                  <p className="text-2xl font-bold">₹{totalSpent.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Remaining</p>
                  <p className="text-2xl font-bold">₹{totalRemaining.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Budget Cards */}
        {categoryBudgets.length > 0 ? (
          <div className="grid gap-6">
            {categoryBudgets.map((budget) => {
              const categoryColor = getCategoryColor(budget.id, budget.name)
              const backgroundColorLight = getCategoryColorWithOpacity(budget.id, 0.1)

              return (
                <Card key={budget.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Color Strip */}
                      <div className="w-2" style={{ backgroundColor: categoryColor }} />

                      {/* Main Content */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: backgroundColorLight }}
                            >
                              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: categoryColor }} />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                              <p className="text-sm text-gray-600">{budget.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(budget.status)}
                            <Badge
                              variant={budget.status === "good" ? "default" : "destructive"}
                              className={
                                budget.status === "good"
                                  ? "bg-green-100 text-green-800"
                                  : budget.status === "warning"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {budget.status === "good"
                                ? "On Track"
                                : budget.status === "warning"
                                  ? "Near Limit"
                                  : "Over Budget"}
                            </Badge>
                          </div>
                        </div>

                        {/* Budget Progress */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Budget Progress</span>
                            <span className={`font-medium ${getStatusColor(budget.status)}`}>
                              {budget.percentage.toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${budget.percentage}%`,
                                backgroundColor:
                                  budget.status === "good"
                                    ? "#10B981"
                                    : budget.status === "warning"
                                      ? "#F59E0B"
                                      : "#EF4444",
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">
                                ₹{budget.allocatedAmount.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-600">Allocated</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-900">
                                ₹{budget.spentAmount.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-600">Spent</div>
                            </div>
                            <div className="text-center">
                              <div
                                className={`text-lg font-semibold ${
                                  budget.remainingAmount >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                ₹{Math.abs(budget.remainingAmount).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-600">
                                {budget.remainingAmount >= 0 ? "Remaining" : "Over"}
                              </div>
                            </div>
                          </div>

                          {budget.transactionCount > 0 && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>
                                  {budget.transactionCount} transactions this{" "}
                                  {period.replace("ly", "").replace("y", "")}
                                </span>
                                <span>
                                  Avg: ₹{(budget.spentAmount / budget.transactionCount).toFixed(2)} per transaction
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No budget data available</h3>
              <p className="text-gray-600 mb-4">
                Create some categories and add transactions to see your budget progress.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Budget Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Management Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <h4 className="font-semibold text-blue-900 mb-2">Stay Within Limits</h4>
                <p className="text-sm text-blue-700">
                  Try to keep your spending below 80% of your allocated budget to maintain financial flexibility.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                <h4 className="font-semibold text-green-900 mb-2">Track Regularly</h4>
                <p className="text-sm text-green-700">
                  Check your budget progress regularly to stay aware of your spending patterns.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <h4 className="font-semibold text-purple-900 mb-2">Adjust When Needed</h4>
                <p className="text-sm text-purple-700">
                  If you consistently overspend in a category, consider adjusting your budget allocation.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <h4 className="font-semibold text-yellow-900 mb-2">Emergency Buffer</h4>
                <p className="text-sm text-yellow-700">
                  Keep some unallocated income as a buffer for unexpected expenses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

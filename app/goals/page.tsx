"use client"

import { useState, useEffect } from "react"
import { Target, Calendar, DollarSign, TrendingUp } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { PeriodFilter } from "@/components/ui/period-filter"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { usePeriodFilter } from "@/contexts/period-filter-context"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "@/types"

export default function GoalsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const { period, getPeriodLabel, getPeriodMultiplier, getCurrentPeriodRange } = usePeriodFilter()
  const { toast } = useToast()

  // Fetch transactions on component mount
  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await apiClient.getTransactions()
      if (response.error) {
        throw new Error(response.error)
      }
      setTransactions(response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get user's savings journey start date
  const getSavingsJourneyStartDate = () => {
    if (transactions.length === 0) {
      return new Date() // If no transactions, start from today
    }

    // Find the earliest transaction date as the start of savings journey
    const earliestTransaction = transactions.reduce((earliest, transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      return transactionDate < earliest ? transactionDate : earliest
    }, new Date(transactions[0].transaction_date))

    // Return the first day of that month
    return new Date(earliestTransaction.getFullYear(), earliestTransaction.getMonth(), 1)
  }

  // Helper function to calculate yearly savings goal with adjustment logic
  const calculateYearlySavingsData = () => {
    const journeyStartDate = getSavingsJourneyStartDate()
    const now = new Date()
    const monthlySavingsGoal = user?.savings_goal_amount || 0

    // Calculate yearly period (12 months from journey start)
    const yearlyStartDate = new Date(journeyStartDate)
    const yearlyEndDate = new Date(journeyStartDate.getFullYear() + 1, journeyStartDate.getMonth(), 0) // Last day of 12th month

    // Calculate months completed and remaining
    const monthsCompleted = Math.max(
      0,
      (now.getFullYear() - journeyStartDate.getFullYear()) * 12 +
        (now.getMonth() - journeyStartDate.getMonth()) +
        (now.getDate() >= journeyStartDate.getDate() ? 1 : 0),
    )
    const totalMonths = 12
    const monthsRemaining = Math.max(0, totalMonths - monthsCompleted)

    // Calculate actual savings for completed months
    let totalActualSavings = 0
    let totalDeficit = 0

    for (let i = 0; i < monthsCompleted; i++) {
      const monthStart = new Date(journeyStartDate.getFullYear(), journeyStartDate.getMonth() + i, 1)
      const monthEnd = new Date(journeyStartDate.getFullYear(), journeyStartDate.getMonth() + i + 1, 0)

      // Get transactions for this month
      const monthTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.transaction_date)
        return transactionDate >= monthStart && transactionDate <= monthEnd
      })

      const monthlySpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
      const monthlyIncome = user?.monthly_income || 0
      const actualSavings = Math.max(0, monthlyIncome - monthlySpent)

      totalActualSavings += actualSavings

      // Calculate deficit for this month
      const monthDeficit = Math.max(0, monthlySavingsGoal - actualSavings)
      totalDeficit += monthDeficit
    }

    // Calculate adjusted monthly goal for remaining months
    const adjustedMonthlyGoal =
      monthsRemaining > 0 ? monthlySavingsGoal + totalDeficit / monthsRemaining : monthlySavingsGoal

    // Calculate current month progress
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const currentMonthTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.transaction_date)
      return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd
    })
    const currentMonthSpent = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
    const currentMonthIncome = user?.monthly_income || 0
    const currentMonthSavings = Math.max(0, currentMonthIncome - currentMonthSpent)

    return {
      journeyStartDate,
      yearlyStartDate,
      yearlyEndDate,
      monthsCompleted,
      monthsRemaining,
      totalMonths,
      totalActualSavings,
      totalDeficit,
      adjustedMonthlyGoal,
      currentMonthSavings,
      yearlyTarget: monthlySavingsGoal * 12,
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

  // Calculate savings goal metrics based on period
  const monthlyIncome = user?.monthly_income || 0
  const monthlySavingsGoal = user?.savings_goal_amount || 0
  const multiplier = getPeriodMultiplier(period)
  const periodRange = getCurrentPeriodRange(period)
  const periodLabel = getPeriodLabel(period)

  const periodIncome = monthlyIncome * multiplier
  let targetAmount = monthlySavingsGoal * multiplier
  let savedAmount = 0
  let progressPercentage = 0

  // Filter transactions for current period
  const periodTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transaction_date)
    return transactionDate >= periodRange.start && transactionDate <= periodRange.end
  })

  if (period === "yearly") {
    // Use new yearly calculation logic
    const yearlyData = calculateYearlySavingsData()
    targetAmount = yearlyData.yearlyTarget
    savedAmount = yearlyData.totalActualSavings + yearlyData.currentMonthSavings
    progressPercentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0
  } else {
    // Calculate period budget based on elapsed time for other periods
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

    // Calculate total spent this period
    const totalSpentThisPeriod = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    savedAmount = Math.max(0, budgetForPeriod - totalSpentThisPeriod)
    progressPercentage = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0
  }

  const remainingAmount = Math.max(0, targetAmount - savedAmount)

  // Calculate days until end of period
  let daysUntilEndOfPeriod = 0
  const endOfPeriod = periodRange.end
  const now = new Date()

  switch (period) {
    case "daily":
      daysUntilEndOfPeriod = 0
      break
    case "weekly":
      daysUntilEndOfPeriod = Math.max(0, Math.ceil((endOfPeriod.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      break
    case "monthly":
      daysUntilEndOfPeriod = Math.max(0, Math.ceil((endOfPeriod.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      break
    case "yearly":
      const yearlyData = calculateYearlySavingsData()
      daysUntilEndOfPeriod = Math.max(
        0,
        Math.ceil((yearlyData.yearlyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      )
      break
  }

  // Determine status
  const getStatusColor = () => {
    if (progressPercentage >= 100) return "text-green-600"
    if (period === "monthly" && now.getDate() > 20 && progressPercentage < 60) return "text-red-600"
    if (progressPercentage >= 75) return "text-green-600"
    if (progressPercentage >= 50) return "text-yellow-600"
    return "text-gray-600"
  }

  const getStatusText = () => {
    if (progressPercentage >= 100) return "Goal Achieved!"
    if (period === "monthly" && now.getDate() > 20 && progressPercentage < 60) return "Behind Target"
    if (progressPercentage >= 75) return "On Track"
    return "In Progress"
  }

  const getPeriodEndLabel = () => {
    switch (period) {
      case "daily":
        return "End of Day"
      case "weekly":
        return "End of Week"
      case "monthly":
        return "Month End"
      case "yearly":
        return "Year End"
      default:
        return "Period End"
    }
  }

  // If no target amount is set
  if (monthlySavingsGoal <= 0) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Savings Goals</h1>
              <p className="text-sm sm:text-base text-gray-600">Track your progress towards financial goals</p>
            </div>
            <PeriodFilter />
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No savings goal set</h3>
              <p className="text-gray-600 mb-4">
                Please set your monthly savings goal in the Settings page to start tracking your progress.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  // Get yearly data for display
  const yearlyData = period === "yearly" ? calculateYearlySavingsData() : null

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Savings Goals</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Track your progress towards your {periodLabel.toLowerCase()} savings target
            </p>
          </div>
          <PeriodFilter />
        </div>

        {/* Yearly Adjustment Info */}
        {period === "yearly" && yearlyData && yearlyData.totalDeficit > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Goal Adjustment</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    Due to previous months' shortfall of ₹{yearlyData.totalDeficit.toFixed(2)}, your monthly savings
                    goal has been adjusted to ₹{yearlyData.adjustedMonthlyGoal.toFixed(2)} for the remaining{" "}
                    {yearlyData.monthsRemaining} months to stay on track for your yearly goal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Goal Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{periodLabel} Savings Goal</CardTitle>
                <p className="text-indigo-100">Your journey to financial success</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className={`${getStatusColor()} bg-white`}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Progress Circle */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-48 h-48 mb-4">
                  <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={
                        progressPercentage >= 100
                          ? 0
                          : `${2 * Math.PI * 40 * (1 - Math.min(progressPercentage, 100) / 100)}`
                      }
                      className="text-indigo-600 transition-all duration-500 ease-in-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {progressPercentage >= 100 ? "100%" : `${progressPercentage.toFixed(1)}%`}
                    </div>
                    <div className="text-sm text-gray-600">{progressPercentage >= 100 ? "Complete!" : "Complete"}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{savedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ₹
                    {targetAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-gray-600">
                    {remainingAmount > 0
                      ? `₹${remainingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} remaining`
                      : "Goal achieved!"}
                  </div>
                </div>
              </div>

              {/* Goal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">{getPeriodEndLabel()}</div>
                  <div className="font-semibold">{endOfPeriod.toLocaleDateString()}</div>
                  <div className="text-xs text-gray-500">
                    {daysUntilEndOfPeriod > 0 ? `${daysUntilEndOfPeriod} days left` : "Today"}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">
                    {period === "daily" ? "Remaining" : period === "yearly" ? "Monthly Target" : "Daily Target"}
                  </div>
                  <div className="font-semibold">
                    ₹
                    {period === "daily"
                      ? remainingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : period === "yearly" && yearlyData
                        ? yearlyData.adjustedMonthlyGoal.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : (remainingAmount / Math.max(1, daysUntilEndOfPeriod)).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {period === "daily" ? "To save today" : period === "yearly" ? "Adjusted goal" : "To reach goal"}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">
                    From {period === "yearly" ? "Monthly" : periodLabel} Income
                  </div>
                  <div className="font-semibold">
                    {period === "yearly"
                      ? ((monthlySavingsGoal / monthlyIncome) * 100).toFixed(1)
                      : periodIncome
                        ? ((targetAmount / periodIncome) * 100).toFixed(1)
                        : "0"}
                    %
                  </div>
                  <div className="text-xs text-gray-500">
                    Of {period === "yearly" ? "monthly" : periodLabel.toLowerCase()} income
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.min(progressPercentage, 100).toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(progressPercentage, 100)} className="h-3" />
              </div>

              {/* Yearly Journey Info */}
              {period === "yearly" && yearlyData && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Savings Journey</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Journey Started</p>
                      <p className="font-semibold text-blue-900">{yearlyData.journeyStartDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Months Completed</p>
                      <p className="font-semibold text-blue-900">
                        {yearlyData.monthsCompleted} / {yearlyData.totalMonths}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Total Saved</p>
                      <p className="font-semibold text-blue-900">₹{yearlyData.totalActualSavings.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Deficit</p>
                      <p className="font-semibold text-blue-900">₹{yearlyData.totalDeficit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>Savings Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Track {periodLabel} Spending</h4>
                <p className="text-sm text-blue-700">
                  Monitor your expenses regularly to stay within your budget and maximize savings.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Avoid Impulse Purchases</h4>
                <p className="text-sm text-green-700">
                  Wait before making unplanned purchases to avoid unnecessary spending.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Use Category Budgets</h4>
                <p className="text-sm text-purple-700">
                  Set specific limits for each spending category to better manage your overall budget.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Plan for Expenses</h4>
                <p className="text-sm text-yellow-700">
                  Anticipate upcoming expenses and adjust your {periodLabel.toLowerCase()} spending accordingly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

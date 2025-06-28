"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  DollarSign,
  Target,
  TrendingDown,
  Calendar,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/auth-context"
import { usePeriodFilter } from "@/contexts/period-filter-context"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type:
    | "budget_warning"
    | "goal_achievement"
    | "overspending"
    | "savings_reminder"
    | "transaction_milestone"
    | "category_alert"
    | "weekly_summary"
    | "monthly_report"
    | "streak_achievement"
    | "tip"
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  priority: "low" | "medium" | "high"
  actionable?: boolean
  category?: string
}

const STORAGE_KEY = "budget_pay_notifications_read"

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const { getCurrentPeriodRange } = usePeriodFilter()

  // Load read notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const readIds = JSON.parse(stored)
        setReadNotifications(new Set(readIds))
      } catch (error) {
        console.error("Error loading read notifications:", error)
      }
    }
  }, [])

  // Save read notifications to localStorage
  const saveReadNotifications = (readIds: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readIds)))
    } catch (error) {
      console.error("Error saving read notifications:", error)
    }
  }

  useEffect(() => {
    if (user) {
      generateNotifications()
    }
  }, [user, readNotifications])

  const generateNotifications = async () => {
    if (!user) return

    const notifications: Notification[] = []
    const now = new Date()

    try {
      // Fetch current data
      const [categoriesResponse, transactionsResponse] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTransactions(),
      ])

      const categories = categoriesResponse.data || []
      const transactions = transactionsResponse.data || []

      // Get current month data
      const currentMonthRange = getCurrentPeriodRange("monthly")
      const monthlyTransactions = transactions.filter((t) => {
        const date = new Date(t.transaction_date)
        return date >= currentMonthRange.start && date <= currentMonthRange.end
      })

      const monthlySpent = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0)
      const monthlyIncome = user.monthly_income || 0
      const savingsGoal = user.savings_goal_amount || 0

      // Get weekly data
      const currentWeekRange = getCurrentPeriodRange("weekly")
      const weeklyTransactions = transactions.filter((t) => {
        const date = new Date(t.transaction_date)
        return date >= currentWeekRange.start && date <= currentWeekRange.end
      })

      // Budget warnings for categories
      categories.forEach((category) => {
        const categorySpent = monthlyTransactions
          .filter((t) => t.category_id === category.id)
          .reduce((sum, t) => sum + t.amount, 0)

        const allocated =
          ((monthlyIncome - savingsGoal) * (category.custom_percentage || category.default_percentage)) / 100
        const usagePercentage = allocated > 0 ? (categorySpent / allocated) * 100 : 0

        if (usagePercentage >= 90) {
          notifications.push({
            id: `budget_warning_${category.id}`,
            type: "budget_warning",
            title: "Budget Alert",
            message: `You've used ${usagePercentage.toFixed(1)}% of your ${category.name} budget this month.`,
            timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
            isRead: readNotifications.has(`budget_warning_${category.id}`),
            priority: usagePercentage >= 100 ? "high" : "medium",
            actionable: true,
            category: category.name,
          })
        }
      })

      // Savings goal progress
      const savedAmount = Math.max(0, monthlyIncome - monthlySpent)
      const savingsProgress = savingsGoal > 0 ? (savedAmount / savingsGoal) * 100 : 0

      if (savingsGoal > 0) {
        if (savingsProgress >= 100) {
          notifications.push({
            id: "goal_achievement",
            type: "goal_achievement",
            title: "🎉 Goal Achieved!",
            message: `Congratulations! You've reached your monthly savings goal of ₹${savingsGoal}.`,
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            isRead: readNotifications.has("goal_achievement"),
            priority: "high",
          })
        } else if (now.getDate() > 20 && savingsProgress < 50) {
          notifications.push({
            id: "savings_reminder",
            type: "savings_reminder",
            title: "Savings Reminder",
            message: `You're ${(100 - savingsProgress).toFixed(1)}% away from your monthly savings goal. Consider reducing spending.`,
            timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
            isRead: readNotifications.has("savings_reminder"),
            priority: "medium",
            actionable: true,
          })
        }
      }

      // Transaction milestones
      if (monthlyTransactions.length === 50) {
        notifications.push({
          id: "transaction_milestone_50",
          type: "transaction_milestone",
          title: "Transaction Milestone",
          message: "You've made 50 transactions this month! Great job tracking your expenses.",
          timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
          isRead: readNotifications.has("transaction_milestone_50"),
          priority: "low",
        })
      }

      // Weekly summary
      if (now.getDay() === 0) {
        // Sunday
        const weeklySpent = weeklyTransactions.reduce((sum, t) => sum + t.amount, 0)
        notifications.push({
          id: `weekly_summary_${currentWeekRange.start.getTime()}`,
          type: "weekly_summary",
          title: "Weekly Summary",
          message: `This week you spent ₹${weeklySpent.toFixed(2)} across ${weeklyTransactions.length} transactions.`,
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          isRead: readNotifications.has(`weekly_summary_${currentWeekRange.start.getTime()}`),
          priority: "low",
        })
      }

      // Overspending alert
      if (monthlySpent > monthlyIncome * 0.9) {
        notifications.push({
          id: "overspending_alert",
          type: "overspending",
          title: "Overspending Alert",
          message: `You've spent ₹${monthlySpent.toFixed(2)} this month, which is ${((monthlySpent / monthlyIncome) * 100).toFixed(1)}% of your income.`,
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          isRead: readNotifications.has("overspending_alert"),
          priority: "high",
          actionable: true,
        })
      }

      // Streak achievements
      const consecutiveDays = getConsecutiveTrackingDays(transactions)
      if (consecutiveDays === 7 || consecutiveDays === 30 || consecutiveDays === 100) {
        notifications.push({
          id: `streak_${consecutiveDays}`,
          type: "streak_achievement",
          title: "Streak Achievement! 🔥",
          message: `Amazing! You've been tracking expenses for ${consecutiveDays} consecutive days.`,
          timestamp: new Date(now.getTime() - 30 * 60 * 60 * 1000),
          isRead: readNotifications.has(`streak_${consecutiveDays}`),
          priority: "medium",
        })
      }

      // Monthly report (first day of month)
      if (now.getDate() === 1) {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        const lastMonthTransactions = transactions.filter((t) => {
          const date = new Date(t.transaction_date)
          return date >= lastMonth && date <= lastMonthEnd
        })
        const lastMonthSpent = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0)

        notifications.push({
          id: `monthly_report_${lastMonth.getTime()}`,
          type: "monthly_report",
          title: "Monthly Report",
          message: `Last month you spent ₹${lastMonthSpent.toFixed(2)} across ${lastMonthTransactions.length} transactions.`,
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          isRead: readNotifications.has(`monthly_report_${lastMonth.getTime()}`),
          priority: "low",
        })
      }

      // Dynamic tips based on spending patterns
      const topCategory = getTopSpendingCategory(monthlyTransactions, categories)
      if (topCategory && monthlyTransactions.length > 10) {
        notifications.push({
          id: `tip_top_category_${topCategory.id}`,
          type: "tip",
          title: "Spending Insight",
          message: `Your highest spending category this month is ${topCategory.name}. Consider setting a stricter budget for better control.`,
          timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
          isRead: readNotifications.has(`tip_top_category_${topCategory.id}`),
          priority: "low",
        })
      }

      // Add some default notifications for new users
      if (notifications.length < 2) {
        notifications.push(
          {
            id: "welcome",
            type: "transaction_milestone",
            title: "Welcome to Budget Pay!",
            message: "Start tracking your expenses and achieve your financial goals.",
            timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            isRead: readNotifications.has("welcome"),
            priority: "medium",
          },
          {
            id: "tip_categories",
            type: "tip",
            title: "Pro Tip",
            message: "Create specific categories for better expense tracking and budget management.",
            timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
            isRead: readNotifications.has("tip_categories"),
            priority: "low",
          },
        )
      }

      // Sort by timestamp (newest first)
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      setNotifications(notifications)
      setUnreadCount(notifications.filter((n) => !n.isRead).length)
    } catch (error) {
      console.error("Error generating notifications:", error)
    }
  }

  const getConsecutiveTrackingDays = (transactions: any[]) => {
    if (transactions.length === 0) return 0

    const dates = [...new Set(transactions.map((t) => new Date(t.transaction_date).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )

    let consecutive = 0
    const today = new Date().toDateString()

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() - i)

      if (dates[i] === expectedDate.toDateString()) {
        consecutive++
      } else {
        break
      }
    }

    return consecutive
  }

  const getTopSpendingCategory = (transactions: any[], categories: any[]) => {
    const categorySpending: Record<string, number> = {}

    transactions.forEach((t) => {
      if (t.category_id) {
        categorySpending[t.category_id] = (categorySpending[t.category_id] || 0) + t.amount
      }
    })

    const topCategoryId = Object.entries(categorySpending).sort(([, a], [, b]) => b - a)[0]?.[0]

    return categories.find((c) => c.id === topCategoryId)
  }

  const markAsRead = (notificationId: string) => {
    const newReadNotifications = new Set(readNotifications)
    newReadNotifications.add(notificationId)
    setReadNotifications(newReadNotifications)
    saveReadNotifications(newReadNotifications)

    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    const allIds = new Set([...readNotifications, ...notifications.map((n) => n.id)])
    setReadNotifications(allIds)
    saveReadNotifications(allIds)

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const removeNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    const notification = notifications.find((n) => n.id === notificationId)
    if (notification && !notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "budget_warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "goal_achievement":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "overspending":
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case "savings_reminder":
        return <Target className="h-5 w-5 text-blue-600" />
      case "transaction_milestone":
        return <DollarSign className="h-5 w-5 text-purple-600" />
      case "category_alert":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case "weekly_summary":
        return <Calendar className="h-5 w-5 text-indigo-600" />
      case "monthly_report":
        return <Calendar className="h-5 w-5 text-indigo-600" />
      case "streak_achievement":
        return <Zap className="h-5 w-5 text-yellow-600" />
      case "tip":
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50"
      case "medium":
        return "border-l-yellow-500 bg-yellow-50"
      case "low":
        return "border-l-blue-500 bg-blue-50"
      default:
        return "border-l-gray-500 bg-gray-50"
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else {
      return "Just now"
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 border-l-4 hover:bg-gray-50 transition-colors cursor-pointer group",
                        getPriorityColor(notification.priority),
                        !notification.isRead && "bg-opacity-100",
                        notification.isRead && "opacity-75",
                      )}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">{formatTimestamp(notification.timestamp)}</p>
                              {notification.category && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No notifications yet</p>
                  <p className="text-sm text-gray-500 mt-1">We'll notify you about important updates</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

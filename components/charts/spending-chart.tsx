"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { apiClient } from "@/lib/api"

export function SpendingChart() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTransactions = async () => {
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

    fetchTransactions()
  }, [])

  // Process transactions into daily spending data
  const processTransactions = () => {
    if (!transactions.length) return []

    // Get transactions from the last 7 days
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)

    // Group transactions by date
    const dailySpending: Record<string, number> = {}

    // Initialize all days in the range with 0
    for (let i = 0; i < 8; i++) {
      const date = new Date()
      date.setDate(today.getDate() - i)
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      dailySpending[dateStr] = 0
    }

    // Add transaction amounts to their respective days
    transactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      if (transactionDate >= sevenDaysAgo) {
        const dateStr = transactionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        dailySpending[dateStr] = (dailySpending[dateStr] || 0) + transaction.amount
      }
    })

    // Convert to array format for chart
    return Object.entries(dailySpending)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => {
        // Sort by date (oldest first)
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })
  }

  const spendingData = processTransactions()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorMessage message={error} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Spent"]} />
              <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

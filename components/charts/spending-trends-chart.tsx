"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePeriodFilter } from "@/contexts/period-filter-context"

interface SpendingTrendsChartProps {
  transactions: Array<{
    id: string
    amount: number
    transaction_date: string
  }>
}

export function SpendingTrendsChart({ transactions }: SpendingTrendsChartProps) {
  const { period, getPeriodLabel, getCurrentPeriodRange } = usePeriodFilter()

  const processTransactions = () => {
    if (!transactions.length) return []

    const periodRange = getCurrentPeriodRange(period)
    const periodTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      return transactionDate >= periodRange.start && transactionDate <= periodRange.end
    })

    // Group transactions by date/period
    const groupedData: Record<string, number> = {}

    if (period === "daily") {
      // Show hourly data for daily view
      for (let hour = 0; hour < 24; hour++) {
        groupedData[`${hour}:00`] = 0
      }

      periodTransactions.forEach((transaction) => {
        const hour = new Date(transaction.transaction_date).getHours()
        const key = `${hour}:00`
        groupedData[key] = (groupedData[key] || 0) + transaction.amount
      })
    } else if (period === "weekly") {
      // Show daily data for weekly view
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      days.forEach((day) => {
        groupedData[day] = 0
      })

      periodTransactions.forEach((transaction) => {
        const dayIndex = new Date(transaction.transaction_date).getDay()
        const key = days[dayIndex]
        groupedData[key] = (groupedData[key] || 0) + transaction.amount
      })
    } else if (period === "monthly") {
      // Show weekly data for monthly view
      for (let week = 1; week <= 4; week++) {
        groupedData[`Week ${week}`] = 0
      }

      periodTransactions.forEach((transaction) => {
        const date = new Date(transaction.transaction_date)
        const weekOfMonth = Math.ceil(date.getDate() / 7)
        const key = `Week ${Math.min(weekOfMonth, 4)}`
        groupedData[key] = (groupedData[key] || 0) + transaction.amount
      })
    } else {
      // Show monthly data for yearly view
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      months.forEach((month) => {
        groupedData[month] = 0
      })

      periodTransactions.forEach((transaction) => {
        const monthIndex = new Date(transaction.transaction_date).getMonth()
        const key = months[monthIndex]
        groupedData[key] = (groupedData[key] || 0) + transaction.amount
      })
    }

    return Object.entries(groupedData).map(([period, amount]) => ({
      period,
      amount,
    }))
  }

  const trendData = processTransactions()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getPeriodLabel(period)} Spending Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Spent"]} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ fill: "#4F46E5", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#4F46E5", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

export type PeriodFilter = "daily" | "weekly" | "monthly" | "yearly"

interface PeriodFilterContextType {
  period: PeriodFilter
  setPeriod: (period: PeriodFilter) => void
  getPeriodLabel: (period: PeriodFilter) => string
  getPeriodMultiplier: (period: PeriodFilter) => number
  getCurrentPeriodRange: (period: PeriodFilter) => { start: Date; end: Date }
}

const PeriodFilterContext = createContext<PeriodFilterContextType | undefined>(undefined)

export function PeriodFilterProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<PeriodFilter>("monthly")

  const getPeriodLabel = (period: PeriodFilter) => {
    switch (period) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "monthly":
        return "Monthly"
      case "yearly":
        return "Yearly"
      default:
        return "Monthly"
    }
  }

  const getPeriodMultiplier = (period: PeriodFilter) => {
    switch (period) {
      case "daily":
        return 1 / 30 // 1 day out of 30 days in a month
      case "weekly":
        return 7 / 30 // 7 days out of 30 days in a month
      case "monthly":
        return 1 // base period
      case "yearly":
        return 12 // 12 months in a year
      default:
        return 1
    }
  }

  const getCurrentPeriodRange = (period: PeriodFilter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
      case "daily":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "weekly":
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return { start: startOfWeek, end: endOfWeek }
      case "monthly":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        return { start: startOfMonth, end: endOfMonth }
      case "yearly":
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const endOfYear = new Date(now.getFullYear(), 11, 31)
        endOfYear.setHours(23, 59, 59, 999)
        return { start: startOfYear, end: endOfYear }
      default:
        const startOfMonth2 = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth2 = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth2.setHours(23, 59, 59, 999)
        return { start: startOfMonth2, end: endOfMonth2 }
    }
  }

  const value = {
    period,
    setPeriod,
    getPeriodLabel,
    getPeriodMultiplier,
    getCurrentPeriodRange,
  }

  return <PeriodFilterContext.Provider value={value}>{children}</PeriodFilterContext.Provider>
}

export function usePeriodFilter() {
  const context = useContext(PeriodFilterContext)
  if (context === undefined) {
    throw new Error("usePeriodFilter must be used within a PeriodFilterProvider")
  }
  return context
}

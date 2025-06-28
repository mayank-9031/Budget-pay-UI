"use client"

import { Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePeriodFilter } from "@/contexts/period-filter-context"

export function PeriodFilter() {
  const { period, setPeriod, getPeriodLabel } = usePeriodFilter()

  return (
    <Select value={period} onValueChange={(value) => setPeriod(value)}>
      <SelectTrigger className="w-40">
        <Calendar className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="daily">Daily</SelectItem>
        <SelectItem value="weekly">Weekly</SelectItem>
        <SelectItem value="monthly">Monthly</SelectItem>
        <SelectItem value="yearly">Yearly</SelectItem>
      </SelectContent>
    </Select>
  )
}

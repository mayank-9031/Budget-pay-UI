"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoryColor } from "@/lib/colors"
import { usePeriodFilter } from "@/contexts/period-filter-context"

interface AllocationChartProps {
  data: Record<string, number>
  categories: Array<{ id: string; name: string }>
}

export function AllocationChart({ data, categories }: AllocationChartProps) {
  const { getPeriodLabel, period } = usePeriodFilter()

  const chartData = Object.entries(data).map(([categoryId, value]) => {
    // Find the category name from the categories array
    const category = categories.find((cat) => cat.id === categoryId)
    const categoryName = category?.name || categoryId

    return {
      name: categoryName,
      value,
      color: getCategoryColor(categoryId, categoryName),
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getPeriodLabel(period)} Category Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Allocated"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

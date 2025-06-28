"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, Edit, Trash2, Calendar, ArrowUpDown } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { getCategoryColor, getCategoryColorWithOpacity } from "@/lib/colors"
import type { Transaction, Category } from "@/types"

type DateFilter = "today" | "this_week" | "this_month" | "this_year" | "all"
type SortOrder = "newest" | "oldest" | "highest" | "lowest"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    category_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
  })
  const { toast } = useToast()

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError("")

    try {
      const [transactionsResponse, categoriesResponse] = await Promise.all([
        apiClient.getTransactions(),
        apiClient.getCategories(),
      ])

      if (transactionsResponse.error) {
        throw new Error(transactionsResponse.error)
      }
      if (categoriesResponse.error) {
        throw new Error(categoriesResponse.error)
      }

      setTransactions(transactionsResponse.data || [])
      setCategories(categoriesResponse.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const getDateFilterRange = (filter: DateFilter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (filter) {
      case "today":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "this_week":
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return { start: startOfWeek, end: endOfWeek }
      case "this_month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        return { start: startOfMonth, end: endOfMonth }
      case "this_year":
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const endOfYear = new Date(now.getFullYear(), 11, 31)
        endOfYear.setHours(23, 59, 59, 999)
        return { start: startOfYear, end: endOfYear }
      case "all":
      default:
        return null
    }
  }

  const filterTransactionsByDate = (transactions: Transaction[], filter: DateFilter) => {
    const range = getDateFilterRange(filter)
    if (!range) return transactions

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      return transactionDate >= range.start && transactionDate <= range.end
    })
  }

  const sortTransactions = (transactions: Transaction[], order: SortOrder) => {
    return [...transactions].sort((a, b) => {
      switch (order) {
        case "newest":
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        case "oldest":
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        case "highest":
          return b.amount - a.amount
        case "lowest":
          return a.amount - b.amount
        default:
          return 0
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const transactionData = {
        ...formData,
        category_id: formData.category_id === "uncategorized" ? null : formData.category_id,
        transaction_date: `${formData.transaction_date}T00:00:00`,
      }

      if (editingTransaction) {
        // Update existing transaction
        const response = await apiClient.updateTransaction(editingTransaction.id, transactionData)
        if (response.error) {
          throw new Error(response.error)
        }
        toast({
          title: "Transaction updated",
          description: "Transaction has been successfully updated.",
        })
        setEditingTransaction(null)
      } else {
        // Add new transaction
        const response = await apiClient.createTransaction(transactionData)
        if (response.error) {
          throw new Error(response.error)
        }
        toast({
          title: "Transaction created",
          description: "New transaction has been successfully created.",
        })
        setIsAddModalOpen(false)
      }

      await fetchData()
      resetForm()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save transaction",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      description: transaction.description,
      amount: transaction.amount,
      category_id: transaction.category_id || "uncategorized",
      transaction_date: transaction.transaction_date ? transaction.transaction_date.split("T")[0] : "",
    })
  }

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return
    }

    const response = await apiClient.deleteTransaction(transactionId)
    if (response.error) {
      toast({
        title: "Error",
        description: response.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully deleted.",
      })
      await fetchData()
    }
  }

  const resetForm = () => {
    setFormData({
      description: "",
      amount: 0,
      category_id: "",
      transaction_date: new Date().toISOString().split("T")[0],
    })
    setEditingTransaction(null)
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find((cat) => cat.id === categoryId)
    return category?.name || "Unknown"
  }

  // Apply all filters and sorting
  let filteredTransactions = transactions

  // Apply search filter
  if (searchTerm) {
    filteredTransactions = filteredTransactions.filter((transaction) =>
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }

  // Apply category filter
  if (selectedCategory !== "all") {
    filteredTransactions = filteredTransactions.filter((transaction) => transaction.category_id === selectedCategory)
  }

  // Apply date filter
  filteredTransactions = filterTransactionsByDate(filteredTransactions, dateFilter)

  // Apply sorting
  filteredTransactions = sortTransactions(filteredTransactions, sortOrder)

  // Calculate summary
  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const transactionCount = filteredTransactions.length

  const getDateFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case "today":
        return "Today"
      case "this_week":
        return "This Week"
      case "this_month":
        return "This Month"
      case "this_year":
        return "This Year"
      case "all":
        return "All Time"
      default:
        return "All Time"
    }
  }

  const getSortOrderLabel = (order: SortOrder) => {
    switch (order) {
      case "newest":
        return "Newest First"
      case "oldest":
        return "Oldest First"
      case "highest":
        return "Highest Amount"
      case "lowest":
        return "Lowest Amount"
      default:
        return "Newest First"
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm sm:text-base text-gray-600">Track and manage your spending history</p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Grocery shopping, Coffee"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getCategoryColor(category.id, category.name) }}
                            />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))}
                    max={new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false)
                      resetForm()
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Adding...
                      </>
                    ) : (
                      "Add Transaction"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(category.id, category.name) }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
                <SelectTrigger>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Amount</SelectItem>
                  <SelectItem value="lowest">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary - {getDateFilterLabel(dateFilter)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <div className="text-sm text-blue-600">Total Transactions</div>
                <div className="text-2xl font-bold text-blue-900">{transactionCount}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                <div className="text-sm text-green-600">Total Amount</div>
                <div className="text-2xl font-bold text-green-900">₹{totalAmount.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                <div className="text-sm text-purple-600">Average Amount</div>
                <div className="text-2xl font-bold text-purple-900">
                  ₹{transactionCount > 0 ? (totalAmount / transactionCount).toFixed(2) : "0.00"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({getSortOrderLabel(sortOrder)})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const categoryColor = getCategoryColor(
                    transaction.category_id || "uncategorized",
                    getCategoryName(transaction.category_id),
                  )
                  const backgroundColorLight = getCategoryColorWithOpacity(
                    transaction.category_id || "uncategorized",
                    0.1,
                  )

                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3 sm:gap-0"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: backgroundColorLight }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{transaction.description}</h3>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                            <Badge
                              variant="secondary"
                              style={{
                                backgroundColor: backgroundColorLight,
                                color: categoryColor,
                                border: `1px solid ${categoryColor}20`,
                              }}
                              className="text-xs"
                            >
                              {getCategoryName(transaction.category_id)}
                            </Badge>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-xs">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">₹{transaction.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Dialog
                            open={editingTransaction?.id === transaction.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setEditingTransaction(null)
                                resetForm()
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(transaction)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Transaction</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-description">Description</Label>
                                  <Input
                                    id="edit-description"
                                    value={formData.description}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    disabled={isSubmitting}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-amount">Amount (₹)</Label>
                                  <Input
                                    id="edit-amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) =>
                                      setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))
                                    }
                                    disabled={isSubmitting}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-category">Category</Label>
                                  <Select
                                    value={formData.category_id}
                                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                                    disabled={isSubmitting}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                      {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          <div className="flex items-center space-x-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: getCategoryColor(category.id, category.name) }}
                                            />
                                            <span>{category.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-date">Date</Label>
                                  <Input
                                    id="edit-date"
                                    type="date"
                                    value={formData.transaction_date}
                                    onChange={(e) =>
                                      setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))
                                    }
                                    max={
                                      new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]
                                    }
                                    disabled={isSubmitting}
                                    required
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTransaction(null)
                                      resetForm()
                                    }}
                                    disabled={isSubmitting}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isSubmitting}
                                  >
                                    {isSubmitting ? (
                                      <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Saving...
                                      </>
                                    ) : (
                                      "Save Changes"
                                    )}
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== "all" || dateFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Start by adding your first transaction."}
                </p>
                {!searchTerm && selectedCategory === "all" && dateFilter === "all" && (
                  <Button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Transaction
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

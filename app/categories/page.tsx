"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { ColorPicker } from "@/components/ui/color-picker"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import {
  getCategoryColor,
  getCategoryColorWithOpacity,
  getAvailableColors,
  getNextAvailableColor,
  storeCategoryColor,
  removeCategoryColor,
} from "@/lib/colors"
import type { Category } from "@/types"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showBudgetWarning, setShowBudgetWarning] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_percentage: 0,
    color: "",
  })
  const { toast } = useToast()

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Set default color when opening add modal
  useEffect(() => {
    if (isAddModalOpen && !editingCategory) {
      setFormData((prev) => ({
        ...prev,
        color: getNextAvailableColor(),
      }))
    }
  }, [isAddModalOpen, editingCategory])

  const fetchCategories = async () => {
    setIsLoading(true)
    setError("")

    const response = await apiClient.getCategories()
    if (response.error) {
      setError(response.error)
    } else {
      setCategories(response.data || [])
    }
    setIsLoading(false)
  }

  const calculateTotalBudgetPercentage = (excludeCategoryId?: string) => {
    return categories
      .filter((cat) => cat.id !== excludeCategoryId)
      .reduce((total, cat) => total + (cat.custom_percentage || cat.default_percentage), 0)
  }

  const adjustOtherCategoriesPercentage = async (newCategoryPercentage: number, excludeCategoryId?: string) => {
    const remainingBudget = 100 - newCategoryPercentage
    const otherCategories = categories.filter((cat) => cat.id !== excludeCategoryId)
    const currentTotal = otherCategories.reduce(
      (total, cat) => total + (cat.custom_percentage || cat.default_percentage),
      0,
    )

    if (currentTotal === 0) return

    // Calculate adjustment ratio
    const adjustmentRatio = remainingBudget / currentTotal

    // Update all other categories proportionally
    const updatePromises = otherCategories.map(async (category) => {
      const currentPercentage = category.custom_percentage || category.default_percentage
      const newPercentage = Math.round(currentPercentage * adjustmentRatio * 100) / 100 // Round to 2 decimal places

      return apiClient.updateCategory(category.id, {
        custom_percentage: newPercentage,
      })
    })

    await Promise.all(updatePromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const currentTotal = calculateTotalBudgetPercentage(editingCategory?.id)
    const newTotal = currentTotal + formData.default_percentage

    // Check if budget exceeds 100%
    if (newTotal > 100) {
      setPendingFormData(formData)
      setShowBudgetWarning(true)
      return
    }

    // Proceed with normal save
    await saveCategory(formData)
  }

  const saveCategory = async (data: typeof formData, adjustOthers = false) => {
    setIsSubmitting(true)

    try {
      if (editingCategory) {
        // Update existing category
        const response = await apiClient.updateCategory(editingCategory.id, {
          name: data.name,
          description: data.description,
          custom_percentage: data.default_percentage,
        })

        if (response.error) {
          throw new Error(response.error)
        }

        // Store the color in localStorage
        storeCategoryColor(editingCategory.id, data.color)

        // Adjust other categories if needed
        if (adjustOthers) {
          await adjustOtherCategoriesPercentage(data.default_percentage, editingCategory.id)
        }

        toast({
          title: "Category updated",
          description: adjustOthers
            ? "Category updated and other categories adjusted to fit budget."
            : "Category has been successfully updated.",
        })
        setEditingCategory(null)
      } else {
        // Add new category
        const response = await apiClient.createCategory({
          name: data.name,
          description: data.description,
          default_percentage: data.default_percentage,
          custom_percentage: data.default_percentage,
          is_default: false,
        })

        if (response.error) {
          throw new Error(response.error)
        }

        // Store the color in localStorage
        if (response.data?.id) {
          storeCategoryColor(response.data.id, data.color)
        }

        // Adjust other categories if needed
        if (adjustOthers) {
          await adjustOtherCategoriesPercentage(data.default_percentage)
        }

        toast({
          title: "Category created",
          description: adjustOthers
            ? "Category created and other categories adjusted to fit budget."
            : "New category has been successfully created.",
        })
        setIsAddModalOpen(false)
      }

      // Refresh categories list
      await fetchCategories()
      resetForm()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save category",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setShowBudgetWarning(false)
      setPendingFormData(null)
    }
  }

  const handleBudgetWarningResponse = async (adjustOthers: boolean) => {
    if (adjustOthers && pendingFormData) {
      await saveCategory(pendingFormData, true)
    } else {
      setShowBudgetWarning(false)
      setPendingFormData(null)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      default_percentage: category.custom_percentage || category.default_percentage,
      color: getCategoryColor(category.id, category.name),
    })
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) {
      return
    }

    const response = await apiClient.deleteCategory(categoryId)
    if (response.error) {
      toast({
        title: "Error",
        description: response.error,
        variant: "destructive",
      })
    } else {
      // Remove color from localStorage
      removeCategoryColor(categoryId)

      toast({
        title: "Category deleted",
        description: "Category has been successfully deleted.",
      })
      await fetchCategories()
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      default_percentage: 0,
      color: "",
    })
    setEditingCategory(null)
  }

  const totalBudgetPercentage = categories.reduce(
    (total, cat) => total + (cat.custom_percentage || cat.default_percentage),
    0,
  )

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your spending categories and allocations</p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Food, Transportation"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this category"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Budget Percentage (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.default_percentage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, default_percentage: Number(e.target.value) }))}
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Percentage of your monthly income to allocate to this category
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Category Color</Label>
                  <ColorPicker
                    colors={getAvailableColors()}
                    selectedColor={formData.color}
                    onColorSelect={(color) => setFormData((prev) => ({ ...prev, color }))}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500">Choose a color to represent this category</p>
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
                      "Add Category"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total Budget Allocation</span>
              <span
                className={`text-lg font-bold ${totalBudgetPercentage > 100 ? "text-red-600" : totalBudgetPercentage === 100 ? "text-green-600" : "text-yellow-600"}`}
              >
                {totalBudgetPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  totalBudgetPercentage > 100
                    ? "bg-red-500"
                    : totalBudgetPercentage === 100
                      ? "bg-green-500"
                      : "bg-yellow-500"
                }`}
                style={{ width: `${Math.min(totalBudgetPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {totalBudgetPercentage > 100
                ? `Over budget by ${(totalBudgetPercentage - 100).toFixed(2)}%`
                : totalBudgetPercentage === 100
                  ? "Perfect! All budget allocated"
                  : `${(100 - totalBudgetPercentage).toFixed(2)}% remaining`}
            </p>
          </CardContent>
        </Card>

        {/* Budget Warning Dialog */}
        <Dialog open={showBudgetWarning} onOpenChange={setShowBudgetWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>Budget Limit Exceeded</span>
              </DialogTitle>
              <DialogDescription>
                Adding this category will exceed your 100% budget limit. Would you like to automatically adjust other
                categories to fit within the budget?
              </DialogDescription>
            </DialogHeader>
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Current total:</strong>{" "}
                {(
                  calculateTotalBudgetPercentage(editingCategory?.id) + (pendingFormData?.default_percentage || 0)
                ).toFixed(2)}
                %
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                If you choose "Yes", other categories will be proportionally reduced to accommodate this change.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleBudgetWarningResponse(false)}>
                No, Don't Save
              </Button>
              <Button onClick={() => handleBudgetWarningResponse(true)} className="bg-indigo-600 hover:bg-indigo-700">
                Yes, Adjust Others
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {categories.map((category) => {
              const categoryColor = getCategoryColor(category.id, category.name)
              const backgroundColorLight = getCategoryColorWithOpacity(category.id, 0.1)

              return (
                <Card key={category.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: categoryColor }} />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: backgroundColorLight }}
                        >
                          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: categoryColor }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          {category.is_default && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{category.description}</p>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Budget Allocation:</span>
                      <span className="text-xl font-bold" style={{ color: categoryColor }}>
                        {(category.custom_percentage || category.default_percentage).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Dialog
                        open={editingCategory?.id === category.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingCategory(null)
                            resetForm()
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Name</Label>
                              <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                disabled={isSubmitting}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-percentage">Budget Percentage (%)</Label>
                              <Input
                                id="edit-percentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.default_percentage}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, default_percentage: Number(e.target.value) }))
                                }
                                disabled={isSubmitting}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Category Color</Label>
                              <ColorPicker
                                colors={getAvailableColors()}
                                selectedColor={formData.color}
                                onColorSelect={(color) => setFormData((prev) => ({ ...prev, color }))}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(null)
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
                      {!category.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
              <p className="text-gray-600 mb-4">Start by creating your first spending category.</p>
              <Button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

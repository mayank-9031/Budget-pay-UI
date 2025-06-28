"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { User, Mail, DollarSign, Target, Save, LogOut, AlertTriangle } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api"

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [error, setError] = useState("")
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    monthly_income: 0,
    savings_goal_amount: 0,
    savings_goal_deadline: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        monthly_income: user.monthly_income || 0,
        savings_goal_amount: user.savings_goal_amount || 0,
        savings_goal_deadline: user.savings_goal_deadline ? user.savings_goal_deadline.split("T")[0] : "",
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const userData = {
        ...formData,
        savings_goal_deadline: formData.savings_goal_deadline
          ? `${formData.savings_goal_deadline}T23:59:59`
          : undefined,
      }

      const result = await updateUser(userData)
      if (!result.success) {
        throw new Error(result.error || "Failed to update profile")
      }

      toast({
        title: "Settings updated",
        description: "Your profile has been successfully updated.",
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        monthly_income: user.monthly_income || 0,
        savings_goal_amount: user.savings_goal_amount || 0,
        savings_goal_deadline: user.savings_goal_deadline ? user.savings_goal_deadline.split("T")[0] : "",
      })
    }
    setIsEditing(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleDeactivateAccount = async () => {
    setIsDeactivating(true)
    try {
      const response = await apiClient.deactivateAccount()

      if (response.error) {
        throw new Error(response.error)
      }

      toast({
        title: "Account deactivated",
        description: "Your account has been successfully deactivated.",
      })

      await logout()
      router.push("/login")
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to deactivate account",
        variant: "destructive",
      })
    } finally {
      setIsDeactivating(false)
      setShowDeactivateDialog(false)
    }
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 w-full">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your account and preferences</p>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Profile Section */}
        <Card className="overflow-hidden border-t-4 border-indigo-500 w-full">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-white">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>Update your personal information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  <span>Email Address</span>
                </Label>
                <Input id="email" type="email" value={user.email} disabled className="bg-gray-50 border-gray-200" />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>Full Name</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  disabled={!isEditing || isLoading}
                  className={!isEditing ? "bg-gray-50 border-gray-200" : "border-indigo-200 focus:border-indigo-500"}
                />
              </div>

              {/* Monthly Income */}
              <div className="space-y-2">
                <Label htmlFor="income" className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-indigo-500" />
                  <span>Monthly Income (₹)</span>
                </Label>
                <Input
                  id="income"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_income}
                  onChange={(e) => setFormData((prev) => ({ ...prev, monthly_income: Number(e.target.value) }))}
                  disabled={!isEditing || isLoading}
                  className={!isEditing ? "bg-gray-50 border-gray-200" : "border-indigo-200 focus:border-indigo-500"}
                />
              </div>

              <Separator className="my-6" />

              {/* Savings Goal Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2 text-indigo-700">
                  <Target className="h-5 w-5" />
                  <span>Monthly Savings Goal</span>
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="savingsAmount">Target Amount (₹)</Label>
                  <Input
                    id="savingsAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.savings_goal_amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, savings_goal_amount: Number(e.target.value) }))}
                    disabled={!isEditing || isLoading}
                    className={!isEditing ? "bg-gray-50 border-gray-200" : "border-indigo-200 focus:border-indigo-500"}
                  />
                  <p className="text-xs text-gray-500">This is the amount you aim to save each month</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <div>
                  {isEditing ? (
                    <div className="space-x-2">
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="overflow-hidden border-t-4 border-blue-500 w-full">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Account Actions</span>
            </CardTitle>
            <CardDescription>Manage your account status and security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
              <div>
                <h4 className="font-medium text-blue-900">Account Status</h4>
                <p className="text-sm text-blue-700">Your account is active and in good standing</p>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Account Management</h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-blue-900">Sign Out</h5>
                      <p className="text-sm text-blue-700">Sign out of your Budget Pay account</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="border-blue-300 hover:bg-blue-100">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>

                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-red-900">Deactivate Account</h5>
                      <p className="text-sm text-red-700">Temporarily disable your account</p>
                    </div>
                    <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-100">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-red-600">Deactivate Account</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to deactivate your account? This action will temporarily disable your
                            account and you won't be able to access your data until you reactivate it.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-50 p-4 rounded-md border border-red-200 my-4">
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-red-900">Warning</h4>
                              <p className="text-sm text-red-700">Deactivating your account will:</p>
                              <ul className="text-sm text-red-700 list-disc ml-5 mt-2">
                                <li>Hide your profile and data</li>
                                <li>Suspend all notifications</li>
                                <li>Prevent you from accessing the app</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeactivateAccount} disabled={isDeactivating}>
                            {isDeactivating ? (
                              <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                Deactivating...
                              </>
                            ) : (
                              "Deactivate Account"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card className="overflow-hidden border-t-4 border-purple-500 w-full">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-white">
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span>About Budget Pay</span>
            </CardTitle>
            <CardDescription>Information about your application</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-purple-900">Version:</span>
                <span className="ml-2 text-purple-700">1.0.0 (MVP)</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-purple-900">Last Updated:</span>
                <span className="ml-2 text-purple-700">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <Separator />
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p>
                Budget Pay helps you manage your finances with smart budgeting tools, expense tracking, and savings
                goals. Built with modern web technologies for a seamless experience across all your devices.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

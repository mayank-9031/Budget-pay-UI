"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { DollarSign, Eye, EyeOff, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorMessage } from "@/components/ui/error-message"
import { useAuth } from "@/contexts/auth-context"
import { apiClient } from "@/lib/api"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await login(email, password)
      console.log("Login result:", result)

      if (result.success) {
        router.push("/dashboard")
      } else {
        // Check if the error is related to unverified email
        if (result.error?.toLowerCase().includes("verify") || result.error?.toLowerCase().includes("verification")) {
          setError(
            "Your email address is not verified. Please check your email and click the verification link, or request a new verification email below.",
          )
        } else {
          setError(result.error || "Login failed. Please check your credentials.")
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An unexpected error occurred. Please try again.")
    }

    setIsLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSendingReset(true)

    try {
      const result = await apiClient.forgotPassword(forgotPasswordEmail)
      console.log("Forgot password result:", result)

      if (result.status === 200) {
        setResetEmailSent(true)
      } else {
        setError(result.error || "Failed to send reset email")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      setError("Failed to send reset email")
    }

    setIsSendingReset(false)
  }

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await apiClient.requestVerifyToken(email)
      console.log("Resend verification result:", result)

      if (result.status === 200) {
        setSuccessMessage("Verification email sent! Please check your inbox.")
      } else {
        setError(result.error || "Failed to send verification email")
      }
    } catch (error) {
      console.error("Resend verification error:", error)
      setError("Failed to send verification email")
    }

    setIsLoading(false)
  }

  if (showForgotPassword) {
    if (resetEmailSent) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription>
                We've sent a password reset link to <strong>{forgotPasswordEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Reset link sent</p>
                    <p>Please check your email and click the link to reset your password.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmailSent(false)
                    setForgotPasswordEmail("")
                  }}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>

                <Button
                  onClick={() => handleForgotPassword(new Event("submit") as any)}
                  disabled={isSendingReset}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSendingReset ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Resending...
                    </>
                  ) : (
                    "Resend Reset Link"
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>Didn't receive the email? Check your spam folder.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
            <CardDescription>Enter your email address and we'll send you a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <ErrorMessage message={error} className="mb-4" />}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="Enter your email address"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  disabled={isSendingReset}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSendingReset}>
                {isSendingReset ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your Budget Pay account</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
              {error.toLowerCase().includes("verify") && (
                <div className="mt-3">
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="w-full bg-transparent"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="alice@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

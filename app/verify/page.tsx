"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { apiClient } from "@/lib/api"

export default function VerifyPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState("")
  const [userInfo, setUserInfo] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token")

      if (!token) {
        setStatus("error")
        setError("Verification token is missing from the URL. Please check the link in your email.")
        return
      }

      console.log("Verifying token:", token)

      try {
        const result = await apiClient.verifyEmail(token)
        console.log("Verification result:", result)

        if (result.status === 200 && result.data) {
          setStatus("success")
          setUserInfo(result.data)
        } else {
          setStatus("error")
          setError(result.error || "Email verification failed. The link may be expired or invalid.")
        }
      } catch (error) {
        console.error("Verification error:", error)
        setStatus("error")
        setError("An unexpected error occurred during verification. Please try again.")
      }
    }

    verifyEmail()
  }, [searchParams])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
            <CardDescription>Please wait while we verify your email address...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Email verified successfully!</CardTitle>
            <CardDescription>
              {userInfo?.email && (
                <>
                  Your email <strong>{userInfo.email}</strong> has been verified.
                </>
              )}
              {userInfo?.full_name && (
                <>
                  <br />
                  Welcome to Budget Pay, {userInfo.full_name}!
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Account activated</p>
                  <p>Your Budget Pay account is now active and you can sign in to start managing your budget.</p>
                </div>
              </div>
            </div>

            {userInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Account Details:</p>
                  <ul className="space-y-1">
                    <li>Email: {userInfo.email}</li>
                    {userInfo.full_name && <li>Name: {userInfo.full_name}</li>}
                    <li>Status: {userInfo.is_verified ? "Verified" : "Unverified"}</li>
                    <li>Active: {userInfo.is_active ? "Yes" : "No"}</li>
                  </ul>
                </div>
              </div>
            )}

            <Button onClick={() => router.push("/login")} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Continue to Sign In
            </Button>
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
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Verification failed</CardTitle>
          <CardDescription>We couldn't verify your email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Verification Error</p>
                <p>{error}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-2">Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The verification link has expired</li>
                <li>The link has already been used</li>
                <li>The link is malformed or incomplete</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => router.push("/register")} variant="outline" className="flex-1">
              Request New Verification
            </Button>
            <Button onClick={() => router.push("/login")} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              Try to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

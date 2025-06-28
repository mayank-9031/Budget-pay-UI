import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { PeriodFilterProvider } from "@/contexts/period-filter-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Budget Pay - Smart Budget Management",
  description: "Manage your finances with smart budgeting tools, expense tracking, and savings goals.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PeriodFilterProvider>
            {children}
            <Toaster />
          </PeriodFilterProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

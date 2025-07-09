import type React from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { AuthGuard } from "@/components/auth-guard"
import { ChatbotProvider } from "@/components/chatbot/chatbot-provider"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">{children}</main>
        </div>
        <ChatbotProvider />
      </div>
    </AuthGuard>
  )
}

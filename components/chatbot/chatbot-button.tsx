"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatbotButtonProps {
  onClick: () => void
  hasUnreadMessages?: boolean
}

export function ChatbotButton({ onClick, hasUnreadMessages = false }: ChatbotButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onClick}
        size="lg"
        className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {hasUnreadMessages && (
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </Button>
    </div>
  )
}

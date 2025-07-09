"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { ChatMessage } from "@/types/chatbot"

interface ChatbotProps {
  isOpen: boolean
  onClose: () => void
}

export function Chatbot({ isOpen, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content:
        "Hello! I'm your financial assistant. I can help you analyze your spending, track your budget, and answer questions about your financial data. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingResponse])

  const formatResponse = (response: string) => {
    // Replace dollar signs with rupee symbol
    response = response.replace(/\$/g, "₹")
    
    // Format headings (text between ** **)
    response = response.replace(/\*\*(.*?)\*\*/g, '<h4 class="font-bold text-purple-800 mb-1 mt-2">$1</h4>')
    
    // Split response into paragraphs and format
    const paragraphs = response.split("\n\n")
    
    return paragraphs.map((paragraph, index) => {
      // Handle bullet points
      if (paragraph.includes("- ")) {
        const lines = paragraph.split("\n")
        const title = lines[0]
        const items = lines.slice(1).filter((line) => line.trim().startsWith("- "))

        return (
          <div key={index} className="mb-3">
            {title && <div dangerouslySetInnerHTML={{ __html: title }} />}
            <ul className="list-disc list-inside space-y-1 ml-2">
              {items.map((item, itemIndex) => (
                <li key={itemIndex} className="text-sm">
                  {item.replace("- ", "").replace(/\$/g, "₹")}
                </li>
              ))}
            </ul>
          </div>
        )
      }

      // Handle regular paragraphs
      return (
        <div key={index} className="mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: paragraph }} />
      )
    })
  }

  // Simulate streaming effect with the response
  const simulateStreamingResponse = (fullResponse: string) => {
    setIsStreaming(true)
    setStreamingResponse("")
    
    const words = fullResponse.split(" ")
    let currentIndex = 0
    
    const streamInterval = setInterval(() => {
      if (currentIndex < words.length) {
        setStreamingResponse(prev => prev + (prev ? " " : "") + words[currentIndex])
        currentIndex++
      } else {
        clearInterval(streamInterval)
        setIsStreaming(false)
        
        // Add the complete message to the messages array
        const botMessage: ChatMessage = {
          id: Date.now().toString(),
          content: fullResponse,
          isUser: false,
          timestamp: new Date(),
        }
        
        setMessages(prev => [...prev, botMessage])
        setStreamingResponse("")
      }
    }, 50) // Adjust speed as needed
    
    return () => clearInterval(streamInterval)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await apiClient.askChatbot(userMessage.content)

      if (response.error) {
        throw new Error(response.error)
      }

      const responseText = response.data?.response || "I'm sorry, I couldn't process your request."
      setIsLoading(false)
      
      // Start streaming the response
      simulateStreamingResponse(responseText)
      
    } catch (error) {
      console.error("Chatbot error:", error)
      setIsLoading(false)

      const errorMessage = "I'm sorry, I'm having trouble connecting right now. Please try again later."
      simulateStreamingResponse(errorMessage)

      toast({
        title: "Connection Error",
        description: "Unable to connect to the chatbot service.",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <Card className="w-full max-w-md h-[600px] flex flex-col shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 slide-in-from-right-4 duration-300">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-white/20 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">Financial Assistant</h3>
              <p className="text-xs text-white/80">Always here to help</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea ref={scrollAreaRef} className="h-full max-h-[calc(600px-130px)] overflow-y-auto">
            <div className="p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${message.isUser ? "flex-row-reverse space-x-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback
                        className={message.isUser ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}
                      >
                        {message.isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${message.isUser ? "text-right" : ""}`}>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.isUser 
                            ? "bg-blue-600 text-white inline-block ml-auto" 
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {message.isUser ? (
                          <p>{message.content}</p>
                        ) : (
                          <div className="prose prose-sm max-w-none">{formatResponse(message.content)}</div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Streaming response */}
                {streamingResponse && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-900">
                        <div className="prose prose-sm max-w-none">
                          {formatResponse(streamingResponse)}
                          <span className="inline-block w-1 h-4 ml-1 bg-purple-600 animate-pulse"></span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your finances..."
              disabled={isLoading || isStreaming}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isStreaming}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

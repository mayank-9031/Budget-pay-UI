export interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export interface ChatbotState {
  isOpen: boolean
  messages: ChatMessage[]
  isLoading: boolean
}

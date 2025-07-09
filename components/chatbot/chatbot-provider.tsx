"use client"

import { useState } from "react"
import { Chatbot } from "./chatbot"
import { ChatbotButton } from "./chatbot-button"

export function ChatbotProvider() {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      <ChatbotButton onClick={handleToggle} />
      <Chatbot isOpen={isOpen} onClose={handleClose} />
    </>
  )
}

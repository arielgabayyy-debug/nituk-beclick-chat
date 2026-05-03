"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Smile, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { QUICK_EMOJIS } from '@/lib/chat-types'

interface ChatInputProps {
  onSend: (message: string) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ 
  onSend, 
  onTypingStart,
  onTypingStop,
  disabled, 
  placeholder = "כתבו הודעה..." 
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message)
      setMessage('')
      setShowEmojis(false)
      onTypingStop?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Trigger typing indicator
    onTypingStart?.()
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop?.()
    }, 2000)
  }, [onTypingStart, onTypingStop])

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      {/* Emoji picker */}
      {showEmojis && (
        <div className="absolute bottom-full mb-2 right-0 glass rounded-2xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-border/50 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">אימוג׳ים מהירים</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowEmojis(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap max-w-[240px]">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-all text-xl hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Emoji button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 shrink-0 transition-all rounded-xl",
            showEmojis && "bg-primary/20 text-primary"
          )}
          onClick={() => setShowEmojis(!showEmojis)}
        >
          <Smile className="w-5 h-5" />
        </Button>

        {/* Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => onTypingStop?.()}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl px-4 py-3 text-sm",
              "bg-muted/50 border-2 border-border/50",
              "focus:outline-none focus:ring-0 focus:border-primary/50",
              "placeholder:text-muted-foreground",
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl transition-all",
            "bg-gradient-to-br from-cyan-500 to-purple-600",
            "hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  )
}

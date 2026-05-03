"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Smile, X, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { QUICK_EMOJIS } from '@/lib/chat-types'
import type { ChatMessage } from '@/lib/chat-types'

interface ChatInputProps {
  onSend: (message: string) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  disabled?: boolean
  placeholder?: string
  replyTo?: ChatMessage | null
  onCancelReply?: () => void
}

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
  placeholder = "כתבו הודעה...",
  replyTo,
  onCancelReply
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled) return
    const finalMessage = replyTo
      ? `↩️ בתגובה ל${replyTo.user?.name || 'משתמש'}: "${replyTo.content.slice(0, 50)}${replyTo.content.length > 50 ? '...' : ''}"\n${message}`
      : message
    onSend(finalMessage)
    setMessage('')
    setShowEmojis(false)
    onTypingStop?.()
    onCancelReply?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.()
    }
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    onTypingStart?.()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTypingStop?.(), 2000)
  }, [onTypingStart, onTypingStop])

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current) }
  }, [])

  // Focus on reply
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus()
  }, [replyTo])

  return (
    <div className="relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-2 animate-in slide-in-from-bottom-2 duration-200">
          <Reply className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">
              תגובה ל-{replyTo.user?.name || 'משתמש'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-border/60 rounded-2xl p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">אימוג׳ים מהירים</span>
            <button onClick={() => setShowEmojis(false)} className="hover:bg-muted rounded-full p-0.5 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap max-w-[240px]">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-all text-xl hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-11 w-11 shrink-0 rounded-xl", showEmojis && "bg-primary/10 text-primary")}
          onClick={() => setShowEmojis(!showEmojis)}
        >
          <Smile className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => onTypingStop?.()}
            placeholder={replyTo ? `השב ל-${replyTo.user?.name}...` : placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl px-4 py-3 text-sm",
              "bg-white border-2 border-border/50 shadow-sm",
              "focus:outline-none focus:border-primary/50",
              "placeholder:text-muted-foreground transition-all",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

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

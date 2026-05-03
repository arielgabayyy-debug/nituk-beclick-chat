"use client"

import { cn } from '@/lib/utils'
import type { TypingUser } from '@/lib/chat-types'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
  className?: string
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const names = typingUsers.map(t => t.user?.name || 'מישהו')
  
  let text = ''
  if (names.length === 1) {
    text = `${names[0]} מקליד/ה...`
  } else if (names.length === 2) {
    text = `${names[0]} ו-${names[1]} מקלידים...`
  } else {
    text = `${names.length} אנשים מקלידים...`
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      {/* Typing animation dots */}
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  )
}

"use client"

import { cn } from '@/lib/utils'
import type { TypingUser } from '@/lib/chat-types'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
  className?: string
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const names = typingUsers.slice(0, 3).map(t => t.user?.name || 'מישהו')
  const colors = typingUsers.slice(0, 3).map(t => t.user?.avatar_color || '#06b6d4')
  const avatarUrls = typingUsers.slice(0, 3).map(t => t.user?.avatar_url || null)

  let text = ''
  if (names.length === 1) {
    text = `${names[0]} מקליד/ה...`
  } else if (names.length === 2) {
    text = `${names[0]} ו-${names[1]} מקלידים...`
  } else if (typingUsers.length > 3) {
    text = `${typingUsers.length} אנשים מקלידים...`
  } else {
    text = `${names.join(', ')} מקלידים...`
  }

  return (
    <div className={cn(
      "flex items-center gap-2.5 px-4 py-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      {/* User avatars */}
      <div className="flex -space-x-1 space-x-reverse">
        {colors.slice(0, 3).map((color, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border-2 border-background overflow-hidden shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
            style={{ backgroundColor: color }}
          >
            {avatarUrls[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrls[i]!} alt="" className="w-full h-full object-cover" />
            ) : (
              names[i]?.charAt(0).toUpperCase()
            )}
          </div>
        ))}
      </div>

      {/* Animated dots */}
      <div className="flex gap-0.5 items-center bg-muted/60 rounded-full px-2.5 py-1.5">
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      <span className="font-medium">{text}</span>
    </div>
  )
}

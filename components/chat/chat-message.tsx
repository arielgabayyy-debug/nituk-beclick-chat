"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { UserBadge } from './user-badge'
import { Pin, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage as ChatMessageType, ChatUser, MessageReaction } from '@/lib/chat-types'
import { REACTION_EMOJIS, formatTime } from '@/lib/chat-types'

interface ChatMessageProps {
  message: ChatMessageType
  currentUser?: ChatUser
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string, isPinned: boolean) => void
  onReact?: (messageId: string, emoji: string) => void
  onUserClick?: (user: ChatUser) => void
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

// Group reactions by emoji
function groupReactions(reactions: MessageReaction[]): { emoji: string; count: number; userIds: string[] }[] {
  const grouped: Record<string, { count: number; userIds: string[] }> = {}
  
  reactions.forEach(r => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { count: 0, userIds: [] }
    }
    grouped[r.emoji].count++
    grouped[r.emoji].userIds.push(r.user_id)
  })

  return Object.entries(grouped).map(([emoji, data]) => ({
    emoji,
    ...data
  }))
}

export function ChatMessageComponent({ 
  message, 
  currentUser,
  onDelete,
  onPin,
  onReact,
  onUserClick 
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const isOwn = message.user_id === currentUser?.id
  const isAdmin = currentUser?.user_type === 'admin'
  const user = message.user as ChatUser | undefined
  const groupedReactions = groupReactions(message.reactions || [])

  return (
    <div 
      className={cn(
        "flex gap-3 group relative",
        isOwn && "flex-row-reverse",
        message.is_pinned && "bg-amber-500/5 rounded-xl p-2 -mx-2 border border-amber-500/20"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowReactions(false)
      }}
    >
      {/* Pinned indicator */}
      {message.is_pinned && (
        <div className="absolute -top-1 right-2 bg-amber-500 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pin className="w-3 h-3" />
          נעוץ
        </div>
      )}

      {/* Avatar */}
      <button 
        onClick={() => user && onUserClick?.(user)}
        className="w-10 h-10 rounded-full shrink-0 transition-transform group-hover:scale-105 shadow-lg cursor-pointer hover:ring-2 hover:ring-primary/50 overflow-hidden"
        style={{ 
          backgroundColor: user?.avatar_color || '#06b6d4',
          boxShadow: `0 0 20px ${user?.avatar_color || '#06b6d4'}40`
        }}
      >
        {user?.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-sm font-bold text-white">
            {user ? getInitials(user.name) : '?'}
          </span>
        )}
      </button>

      {/* Message bubble */}
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isOwn && "items-end"
      )}>
        {/* User info */}
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isOwn && "flex-row-reverse"
        )}>
          <button 
            onClick={() => user && onUserClick?.(user)}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {user?.name || 'משתמש'}
          </button>
          {user && <UserBadge userType={user.user_type} />}
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message content */}
        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all relative",
          isOwn 
            ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-tl-md" 
            : "bg-muted/80 border border-border/50 rounded-tr-md",
          "hover:shadow-xl"
        )}>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Reactions display */}
        {groupedReactions.length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-1 mt-1.5",
            isOwn && "justify-end"
          )}>
            {groupedReactions.map(({ emoji, count, userIds }) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                  "bg-muted/80 hover:bg-muted border border-border/50",
                  userIds.includes(currentUser?.id || '') && "border-primary/50 bg-primary/10"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={cn(
          "absolute top-0 flex items-center gap-1 animate-in fade-in duration-150",
          isOwn ? "left-0" : "right-0"
        )}>
          {/* Reactions button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-muted/80 hover:bg-muted"
              onClick={() => setShowReactions(!showReactions)}
            >
              <span className="text-sm">😊</span>
            </Button>
            
            {/* Reaction picker */}
            {showReactions && (
              <div className={cn(
                "absolute top-full mt-1 z-50 flex gap-1 p-2 rounded-xl glass border border-border/50",
                "animate-in fade-in slide-in-from-top-2 duration-200",
                isOwn ? "right-0" : "left-0"
              )}>
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact?.(message.id, emoji)
                      setShowReactions(false)
                    }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg transition-all hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-full hover:bg-amber-500/20",
                  message.is_pinned && "bg-amber-500/20"
                )}
                onClick={() => onPin?.(message.id, message.is_pinned || false)}
                title={message.is_pinned ? "בטל נעיצה" : "נעץ הודעה"}
              >
                <Pin className={cn(
                  "w-3.5 h-3.5",
                  message.is_pinned ? "text-amber-500" : "text-muted-foreground"
                )} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-destructive/20"
                onClick={() => onDelete?.(message.id)}
                title="מחק הודעה"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

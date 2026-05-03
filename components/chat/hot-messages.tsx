"use client"

import { useMemo } from 'react'
import { Flame, MessageCircle } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

interface HotMessagesProps {
  messages: ChatMessage[]
  onJumpToMessage: (id: string) => void
}

export function HotMessages({ messages, onJumpToMessage }: HotMessagesProps) {
  const hotMessages = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return messages
      .filter(m => {
        const reactionCount = m.reactions?.length || 0
        const upvotes = m.upvotes_count || 0
        const age = new Date(m.created_at).getTime()
        return age > dayAgo && (reactionCount + upvotes) >= 2 && !m.content.startsWith('[voice:')
      })
      .sort((a, b) => ((b.reactions?.length || 0) + (b.upvotes_count || 0)) - ((a.reactions?.length || 0) + (a.upvotes_count || 0)))
      .slice(0, 3)
  }, [messages])

  if (hotMessages.length === 0) return null

  return (
    <div className="glass rounded-2xl border border-border/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-500" />
        הודעות חמות היום
      </h3>
      <div className="space-y-2">
        {hotMessages.map(msg => {
          const totalReactions = (msg.reactions?.length || 0) + (msg.upvotes_count || 0)
          return (
            <button
              key={msg.id}
              onClick={() => onJumpToMessage(msg.id)}
              className="w-full text-right flex items-start gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors group"
            >
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                style={{ backgroundColor: msg.user?.avatar_color || '#06b6d4' }}
              >
                {msg.user?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-0.5">{msg.user?.name}</p>
                <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{msg.content}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 text-orange-500 text-xs font-bold">
                <Flame className="w-3 h-3" />
                <span>{totalReactions}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

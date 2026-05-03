"use client"

import { Pin, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatTime } from '@/lib/chat-types'

interface PinnedMessagesProps {
  messages: ChatMessage[]
  onJumpToMessage?: (messageId: string) => void
}

export function PinnedMessages({ messages, onJumpToMessage }: PinnedMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (messages.length === 0) return null

  const displayMessages = isExpanded ? messages : messages.slice(0, 1)

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
      <div className="px-4 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-sm"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Pin className="w-4 h-4" />
            <span className="font-medium">הודעות נעוצות ({messages.length})</span>
          </div>
          {messages.length > 1 && (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            )
          )}
        </button>

        <div className={cn(
          "space-y-2 mt-2 transition-all",
          isExpanded ? "max-h-[300px] overflow-y-auto" : "max-h-[60px] overflow-hidden"
        )}>
          {displayMessages.map(msg => (
            <button
              key={msg.id}
              onClick={() => onJumpToMessage?.(msg.id)}
              className="w-full text-right bg-amber-500/10 rounded-lg p-2 hover:bg-amber-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-amber-300">
                  {(msg.user as ChatUser)?.name || 'משתמש'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2">
                {msg.content}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

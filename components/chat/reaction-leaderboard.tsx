"use client"

import { useMemo } from 'react'
import { Award } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'

interface ReactionLeaderboardProps {
  messages: ChatMessage[]
  onJumpToMessage?: (id: string) => void
}

export function ReactionLeaderboard({ messages, onJumpToMessage }: ReactionLeaderboardProps) {
  const topMessages = useMemo(() => {
    return messages
      .filter(m => (m.reactions || []).length > 0 && !m.content.startsWith('[voice:'))
      .map(m => ({
        id: m.id,
        content: m.content.slice(0, 60) + (m.content.length > 60 ? '…' : ''),
        userName: m.user?.name || 'משתמש',
        totalReactions: (m.reactions || []).length,
        topEmoji: (() => {
          const counts: Record<string, number> = {}
          ;(m.reactions || []).forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1 })
          return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '❤️'
        })(),
        uniqueEmojis: [...new Set((m.reactions || []).map(r => r.emoji))].slice(0, 3),
      }))
      .sort((a, b) => b.totalReactions - a.totalReactions)
      .slice(0, 5)
  }, [messages])

  if (topMessages.length === 0) return null

  return (
    <div className="bg-white dark:bg-muted border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold">הודעות אהובות</h3>
      </div>
      <div className="divide-y divide-border/30">
        {topMessages.map((msg, i) => (
          <button
            key={msg.id}
            onClick={() => onJumpToMessage?.(msg.id)}
            className="w-full text-right p-3 hover:bg-muted/40 transition group"
          >
            <div className="flex items-start gap-2">
              <span className={`text-sm font-bold shrink-0 w-5 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                #{i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">{msg.userName}</p>
                <p className="text-xs leading-relaxed line-clamp-2">{msg.content}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {msg.uniqueEmojis.map(e => (
                    <span key={e} className="text-sm">{e}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground">{msg.totalReactions} תגובות</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

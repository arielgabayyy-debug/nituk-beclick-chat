"use client"

import { Pin, X, ChevronRight } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

interface PinboardProps {
  messages: ChatMessage[]
  onJumpToMessage: (id: string) => void
  onUnpin?: (id: string) => void
  isAdmin?: boolean
  onClose: () => void
}

export function Pinboard({ messages, onJumpToMessage, onUnpin, isAdmin, onClose }: PinboardProps) {
  const pinned = messages.filter(m => m.is_pinned)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">הודעות נעוצות</h3>
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pinned.length}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {pinned.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Pin className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין הודעות נעוצות</p>
            </div>
          ) : (
            pinned.map(msg => (
              <div key={msg.id} className="group p-4 hover:bg-muted/30 transition">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: msg.user?.avatar_color || '#06b6d4' }}
                  >
                    {msg.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{msg.user?.name || 'משתמש'}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(msg.created_at)}</span>
                      {isAdmin && onUnpin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUnpin(msg.id) }}
                          className="text-[10px] text-red-400 hover:text-red-600 hover:underline opacity-0 group-hover:opacity-100 transition ml-auto"
                        >
                          הסר נעיצה
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-3">
                      {msg.has_gif ? '🖼️ GIF' : msg.content.startsWith('[voice:') ? '🎤 הודעת קול' : msg.content}
                    </p>
                    {(msg.reactions || []).length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {[...new Set((msg.reactions || []).map(r => r.emoji))].slice(0, 5).map(e => (
                          <span key={e} className="text-sm">{e}</span>
                        ))}
                        <span className="text-[10px] text-muted-foreground self-center">{msg.reactions!.length}</span>
                      </div>
                    )}
                  </div>
                  {/* Jump button */}
                  <button
                    onClick={() => { onJumpToMessage(msg.id); onClose() }}
                    className="shrink-0 p-1.5 hover:bg-primary/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="עבור להודעה"
                  >
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

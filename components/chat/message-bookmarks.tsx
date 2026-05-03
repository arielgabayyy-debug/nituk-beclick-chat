"use client"

import { useState, useEffect, useCallback } from 'react'
import { Bookmark, X, ChevronRight } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

const STORAGE_KEY = 'chat_bookmarks'

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setBookmarkedIds(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  const toggleBookmark = useCallback((messageId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) { next.delete(messageId) } else { next.add(messageId) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isBookmarked = useCallback((messageId: string) => bookmarkedIds.has(messageId), [bookmarkedIds])

  return { bookmarkedIds, toggleBookmark, isBookmarked }
}

const MUTED_KEY = 'chat_muted_users'

export function useMutedUsers() {
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MUTED_KEY)
      if (raw) setMutedUserIds(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  const toggleMute = useCallback((userId: string) => {
    setMutedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) { next.delete(userId) } else { next.add(userId) }
      localStorage.setItem(MUTED_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isMuted = useCallback((userId: string) => mutedUserIds.has(userId), [mutedUserIds])

  return { mutedUserIds, toggleMute, isMuted }
}

interface BookmarksPanelProps {
  messages: ChatMessage[]
  bookmarkedIds: Set<string>
  onClose: () => void
  onJumpToMessage: (id: string) => void
}

export function BookmarksPanel({ messages, bookmarkedIds, onClose, onJumpToMessage }: BookmarksPanelProps) {
  const saved = messages.filter(m => bookmarkedIds.has(m.id))

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 border-r border-border/40 shadow-2xl flex flex-col animate-in slide-in-from-left-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-semibold text-sm">הודעות שמורות</span>
          {saved.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full px-2 py-0.5 font-medium">{saved.length}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              לחץ על 🔖 על הודעה<br />כדי לשמור אותה כאן
            </p>
          </div>
        ) : (
          saved.map(msg => (
            <button
              key={msg.id}
              onClick={() => { onJumpToMessage(msg.id); onClose() }}
              className="w-full text-right group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border/40"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                style={{ backgroundColor: msg.user?.avatar_color || '#06b6d4' }}
              >
                {msg.user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold truncate">{msg.user?.name || 'משתמש'}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(msg.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {msg.content.startsWith('[voice:') ? '🎤 הודעה קולית' : msg.content}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

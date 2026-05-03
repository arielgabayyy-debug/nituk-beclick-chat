"use client"

import { useState, useMemo } from 'react'
import { Search, X, Filter, User, Calendar, MessageCircle, FileText, Mic, Image, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

type MessageTypeFilter = 'all' | 'text' | 'voice' | 'image' | 'gif'
type DateFilter = 'all' | 'today' | 'week' | 'month'

interface AdvancedSearchProps {
  messages: ChatMessage[]
  onlineUsers: ChatUser[]
  onJumpToMessage: (id: string) => void
  onClose: () => void
}

export function AdvancedSearch({ messages, onlineUsers, onJumpToMessage, onClose }: AdvancedSearchProps) {
  const [query, setQuery] = useState('')
  const [userFilter, setUserFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  const results = useMemo(() => {
    if (!query.trim() && !userFilter && typeFilter === 'all' && dateFilter === 'all') return []

    const now = new Date()
    const lq = query.toLowerCase()

    return messages.filter(m => {
      // Text filter
      if (lq && !m.content.toLowerCase().includes(lq) && !m.user?.name.toLowerCase().includes(lq)) return false

      // User filter
      if (userFilter && m.user_id !== userFilter) return false

      // Type filter
      if (typeFilter === 'voice' && !m.content.startsWith('[voice:')) return false
      if (typeFilter === 'image' && !/\.(jpg|jpeg|png|gif|webp)/i.test(m.content)) return false
      if (typeFilter === 'gif' && !m.has_gif) return false
      if (typeFilter === 'text' && (m.content.startsWith('[voice:') || m.has_gif)) return false

      // Date filter
      if (dateFilter !== 'all') {
        const d = new Date(m.created_at)
        if (dateFilter === 'today' && d.toDateString() !== now.toDateString()) return false
        if (dateFilter === 'week' && now.getTime() - d.getTime() > 7 * 24 * 60 * 60 * 1000) return false
        if (dateFilter === 'month' && now.getTime() - d.getTime() > 30 * 24 * 60 * 60 * 1000) return false
      }

      return true
    }).slice(0, 50)
  }, [messages, query, userFilter, typeFilter, dateFilter])

  // Unique users from messages for user filter
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, ChatUser>()
    messages.forEach(m => { if (m.user) map.set(m.user_id, m.user) })
    return Array.from(map.values()).slice(0, 20)
  }, [messages])

  const hasFilters = userFilter || typeFilter !== 'all' || dateFilter !== 'all'

  const getMessagePreview = (m: ChatMessage) => {
    if (m.content.startsWith('[voice:')) return '🎤 הודעה קולית'
    if (m.has_gif) return '🖼️ GIF'
    return m.content.slice(0, 80) + (m.content.length > 80 ? '…' : '')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חפש בהודעות, משתמשים, מחירים..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-muted rounded-full transition">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition",
              showFilters || hasFilters ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {hasFilters ? 'פילטרים פעילים' : 'פילטרים'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-border/30 bg-muted/20 space-y-3">
            {/* Type filter */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5">סוג הודעה</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: 'all', label: 'הכל', icon: <MessageCircle className="w-3 h-3" /> },
                  { id: 'text', label: 'טקסט', icon: <FileText className="w-3 h-3" /> },
                  { id: 'voice', label: 'קול', icon: <Mic className="w-3 h-3" /> },
                  { id: 'image', label: 'תמונה', icon: <Image className="w-3 h-3" /> },
                ] as const).map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setTypeFilter(id)}
                    className={cn(
                      "flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition",
                      typeFilter === id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date filter */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5">תאריך</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: 'all', label: 'הכל' },
                  { id: 'today', label: 'היום' },
                  { id: 'week', label: 'שבוע אחרון' },
                  { id: 'month', label: 'חודש אחרון' },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setDateFilter(id)}
                    className={cn(
                      "flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition",
                      dateFilter === id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <Calendar className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* User filter */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5">משתמש</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setUserFilter(null)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg transition",
                    !userFilter ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  כולם
                </button>
                {uniqueUsers.slice(0, 8).map(u => (
                  <button
                    key={u.id}
                    onClick={() => setUserFilter(u.id === userFilter ? null : u.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition",
                      userFilter === u.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: u.avatar_color }}
                    />
                    {u.name}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setUserFilter(null); setTypeFilter('all'); setDateFilter('all') }}
                className="text-[10px] text-destructive hover:underline"
              >
                נקה כל הפילטרים
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && (query || hasFilters) ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Search className="w-8 h-8 opacity-30" />
              <p className="text-sm">לא נמצאו תוצאות</p>
              <p className="text-xs">נסה מילות חיפוש אחרות</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Search className="w-8 h-8 opacity-30" />
              <p className="text-sm">הזן טקסט לחיפוש</p>
              <p className="text-xs">או פתח פילטרים לסינון מתקדם</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/30">
                נמצאו {results.length} תוצאות
              </div>
              {results.map(msg => (
                <button
                  key={msg.id}
                  className="w-full text-right p-3 hover:bg-muted/40 transition border-b border-border/20 last:border-0 group"
                  onClick={() => { onJumpToMessage(msg.id); onClose() }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: msg.user?.avatar_color || '#06b6d4' }}
                    >
                      {msg.user?.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{msg.user?.name || 'משתמש'}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(msg.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {getMessagePreview(msg)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

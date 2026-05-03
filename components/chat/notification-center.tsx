"use client"

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, Check, CheckCheck, X, MessageCircle, Heart, AtSign, Trophy, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/chat-types'

export type NotificationType = 'mention' | 'reaction' | 'reply' | 'achievement' | 'announcement' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  messageId?: string
  read: boolean
  createdAt: string
}

const STORAGE_KEY = 'app_notifications'

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setNotifications(JSON.parse(raw))
    } catch {}
  }, [])

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    setNotifications(prev => {
      const next = [
        { ...notif, id: Date.now().toString(), read: false, createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, 50) // keep last 50
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, addNotification, markRead, markAllRead, clearAll, unreadCount }
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  mention: <AtSign className="w-4 h-4 text-cyan-500" />,
  reaction: <Heart className="w-4 h-4 text-pink-500" />,
  reply: <MessageCircle className="w-4 h-4 text-blue-500" />,
  achievement: <Trophy className="w-4 h-4 text-amber-500" />,
  announcement: <Megaphone className="w-4 h-4 text-orange-500" />,
  system: <Bell className="w-4 h-4 text-muted-foreground" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  mention: 'bg-cyan-100 dark:bg-cyan-950/30',
  reaction: 'bg-pink-100 dark:bg-pink-950/30',
  reply: 'bg-blue-100 dark:bg-blue-950/30',
  achievement: 'bg-amber-100 dark:bg-amber-950/30',
  announcement: 'bg-orange-100 dark:bg-orange-950/30',
  system: 'bg-muted',
}

interface NotificationCenterProps {
  notifications: AppNotification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClearAll: () => void
  onJumpToMessage?: (id: string) => void
  onClose: () => void
}

export function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onJumpToMessage,
  onClose,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">התראות</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> הכל כנקרא
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={onClearAll} className="text-[10px] text-destructive hover:underline">מחק הכל</button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
          {(['all', 'mention', 'reaction', 'reply', 'achievement', 'announcement'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 text-[10px] px-2 py-1 rounded-full transition",
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              {f === 'all' ? 'הכל' : f === 'mention' ? 'אזכורים' : f === 'reaction' ? 'תגובות' : f === 'reply' ? 'תשובות' : f === 'achievement' ? 'הישגים' : 'הכרזות'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <BellOff className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין התראות</p>
            </div>
          ) : (
            filtered.map(notif => (
              <button
                key={notif.id}
                className={cn(
                  "w-full text-right p-3 hover:bg-muted/40 transition flex items-start gap-3",
                  !notif.read && "bg-primary/5"
                )}
                onClick={() => {
                  onMarkRead(notif.id)
                  if (notif.messageId) onJumpToMessage?.(notif.messageId)
                  onClose()
                }}
              >
                <div className={cn("w-8 h-8 rounded-full shrink-0 flex items-center justify-center", TYPE_BG[notif.type])}>
                  {TYPE_ICONS[notif.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn("text-xs font-medium", !notif.read && "font-semibold")}>{notif.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(notif.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.body}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Check, MessageCircle, AtSign, Award } from 'lucide-react'
import { formatTimeAgo } from '@/lib/chat-types'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'mention' | 'reaction' | 'system' | 'badge'
  title: string
  body: string
  time: string
  read: boolean
}

interface NotificationBellProps {
  currentUserId: string
  currentUserName: string
}

export function NotificationBell({ currentUserId, currentUserName }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(`notifications_${currentUserId}`) || '[]')
    setNotifications(saved)
  }, [currentUserId])

  const save = (notifs: Notification[]) => {
    localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify(notifs.slice(0, 50)))
    setNotifications(notifs)
  }

  // Add notification helper — exposed so parent can call
  const addNotification = useCallback((n: Omit<Notification, 'id' | 'read' | 'time'>) => {
    const notif: Notification = {
      ...n,
      id: Date.now().toString(),
      time: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, 50)
      localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify(updated))
      return updated
    })
  }, [currentUserId])

  // Detect @mentions in incoming messages (scan localStorage key 'pending_mentions')
  useEffect(() => {
    const check = () => {
      const pending = JSON.parse(localStorage.getItem(`pending_mentions_${currentUserId}`) || '[]')
      if (pending.length > 0) {
        pending.forEach((m: { from: string; preview: string }) => {
          addNotification({
            type: 'mention',
            title: `${m.from} הזכיר אותך`,
            body: m.preview,
          })
        })
        localStorage.removeItem(`pending_mentions_${currentUserId}`)
      }
    }
    const interval = setInterval(check, 3000)
    return () => clearInterval(interval)
  }, [currentUserId, addNotification])

  const unread = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    save(updated)
  }

  const dismiss = (id: string) => {
    const updated = notifications.filter(n => n.id !== id)
    save(updated)
  }

  const IconForType = ({ type }: { type: Notification['type'] }) => {
    if (type === 'mention') return <AtSign className="w-4 h-4 text-blue-500" />
    if (type === 'reaction') return <span className="text-sm">❤️</span>
    if (type === 'badge') return <Award className="w-4 h-4 text-amber-500" />
    return <MessageCircle className="w-4 h-4 text-primary" />
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead() }}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`התראות${unread > 0 ? ` — ${unread} חדשות` : ''}`}
        title="התראות"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                התראות
              </h4>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    סמן הכל כנקרא
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">אין התראות</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors", !n.read && "bg-blue-50/50 dark:bg-blue-900/10")}>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      <IconForType type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(n.time)}</p>
                    </div>
                    <button onClick={() => dismiss(n.id)} className="p-1 hover:bg-gray-200 rounded-lg shrink-0">
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100">
                <button onClick={() => save([])} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  נקה הכל
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

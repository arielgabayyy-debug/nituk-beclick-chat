"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  const sendNotification = (title: string, body: string, icon = '/community-logo-v2.jpg') => {
    if (permission !== 'granted' || document.visibilityState === 'visible') return
    try {
      new Notification(title, { body, icon, dir: 'rtl', lang: 'he' })
    } catch {}
  }

  return { permission, requestPermission, sendNotification }
}

interface NotificationBannerProps {
  onDismiss: () => void
}

export function NotificationBanner({ onDismiss }: NotificationBannerProps) {
  const { requestPermission } = useNotificationPermission()

  const handleAllow = async () => {
    await requestPermission()
    onDismiss()
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-[55] w-72 bg-white dark:bg-gray-900 border border-border/40 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right-4 duration-300">
      <button onClick={onDismiss} className="absolute top-3 left-3 p-1 hover:bg-muted rounded-full">
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">הפעל התראות</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            קבל התראה כשמישהו מאזכר אותך ב-@
          </p>
          <div className="flex gap-2">
            <button onClick={handleAllow} className="flex-1 text-xs bg-primary text-primary-foreground rounded-lg py-1.5 font-medium hover:opacity-90 transition">
              אפשר
            </button>
            <button onClick={onDismiss} className="flex-1 text-xs border border-border/50 rounded-lg py-1.5 text-muted-foreground hover:bg-muted transition">
              אחר כך
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

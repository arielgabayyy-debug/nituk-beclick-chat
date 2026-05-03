"use client"

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOnlineToast, setShowOnlineToast] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOnlineToast(true)
      setTimeout(() => setShowOnlineToast(false), 3000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showOnlineToast) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 duration-300">
      {!isOnline ? (
        <div className="flex items-center gap-2.5 bg-red-600 text-white px-4 py-2.5 rounded-full shadow-xl text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>אין חיבור לאינטרנט</span>
        </div>
      ) : showOnlineToast ? (
        <div className="flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-2.5 rounded-full shadow-xl text-sm font-medium">
          <Wifi className="w-4 h-4" />
          <span>החיבור חזר!</span>
        </div>
      ) : null}
    </div>
  )
}

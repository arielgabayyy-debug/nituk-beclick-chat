"use client"

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Signal } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline'

export function ConnectionStatus() {
  const [quality, setQuality] = useState<ConnectionQuality>('excellent')
  const [ping, setPing] = useState<number | null>(null)

  useEffect(() => {
    // Check online status
    const handleOnline = () => setQuality('good')
    const handleOffline = () => setQuality('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Measure ping every 30 seconds
    const measurePing = async () => {
      if (!navigator.onLine) { setQuality('offline'); return }
      const start = Date.now()
      try {
        await fetch('/api/link-preview?url=https://google.com', { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        const ms = Date.now() - start
        setPing(ms)
        setQuality(ms < 200 ? 'excellent' : ms < 500 ? 'good' : 'poor')
      } catch {
        setQuality(navigator.onLine ? 'poor' : 'offline')
      }
    }
    measurePing()
    const interval = setInterval(measurePing, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (quality === 'excellent') return null // Don't show when excellent

  const config = {
    good: { icon: <Signal className="w-3 h-3" />, label: 'קישוריות טובה', color: 'text-amber-500' },
    poor: { icon: <Signal className="w-3 h-3" />, label: `איטי (${ping}ms)`, color: 'text-orange-500' },
    offline: { icon: <WifiOff className="w-3 h-3" />, label: 'ללא חיבור', color: 'text-red-500' },
  }[quality]

  return (
    <div className={cn("flex items-center gap-1 text-[10px] font-medium", config.color)} title={config.label}>
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  )
}

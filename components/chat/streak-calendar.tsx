"use client"

import { useMemo } from 'react'
import { Calendar } from 'lucide-react'

interface StreakCalendarProps {
  userId: string
}

export function StreakCalendar({ userId }: StreakCalendarProps) {
  const activity = useMemo(() => {
    // Get activity data from localStorage (stored when sending messages)
    const key = `activity_${userId}`
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>
    } catch { return {} }
  }, [userId])

  const days = useMemo(() => {
    const result: { date: string; count: number; label: string }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      result.push({
        date: dateStr,
        count: activity[dateStr] || 0,
        label: d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
      })
    }
    return result
  }, [activity])

  const maxCount = Math.max(...days.map(d => d.count), 1)

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted/40 dark:bg-muted/20'
    const intensity = count / maxCount
    if (intensity > 0.75) return 'bg-emerald-600'
    if (intensity > 0.5) return 'bg-emerald-500'
    if (intensity > 0.25) return 'bg-emerald-400'
    return 'bg-emerald-300'
  }

  const totalActiveDays = days.filter(d => d.count > 0).length

  return (
    <div className="glass rounded-2xl border border-border/30 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        פעילות 30 ימים
        <span className="text-[10px] text-muted-foreground font-normal mr-auto">{totalActiveDays} ימים פעילים</span>
      </h3>
      <div className="grid grid-cols-10 gap-1">
        {days.map(day => (
          <div
            key={day.date}
            className={`w-full aspect-square rounded-sm transition-all hover:scale-110 ${getColor(day.count)}`}
            title={`${day.label}: ${day.count} הודעות`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
        <span>לפני 30 ימים</span>
        <div className="flex items-center gap-1">
          <span>פחות</span>
          {['bg-muted/40', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'].map((c, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
          ))}
          <span>יותר</span>
        </div>
        <span>היום</span>
      </div>
    </div>
  )
}

// Track activity when sending messages
export function trackMessageActivity(userId: string) {
  const key = `activity_${userId}`
  const today = new Date().toISOString().slice(0, 10)
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>
    data[today] = (data[today] || 0) + 1
    // Keep only last 60 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    Object.keys(data).forEach(k => { if (k < cutoffStr) delete data[k] })
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

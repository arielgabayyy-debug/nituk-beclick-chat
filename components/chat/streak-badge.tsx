"use client"

import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'

export function useStreak() {
  const [streak, setStreak] = useState(0)
  const [isNewDay, setIsNewDay] = useState(false)

  useEffect(() => {
    const today = new Date().toDateString()
    const lastVisit = localStorage.getItem('last_visit_date')
    const savedStreak = parseInt(localStorage.getItem('login_streak') || '0', 10)

    if (lastVisit === today) {
      // Already visited today
      setStreak(savedStreak)
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const isConsecutive = lastVisit === yesterday.toDateString()

      const newStreak = isConsecutive ? savedStreak + 1 : 1
      setStreak(newStreak)
      setIsNewDay(newStreak > 1)
      localStorage.setItem('login_streak', String(newStreak))
      localStorage.setItem('last_visit_date', today)
    }
  }, [])

  return { streak, isNewDay }
}

interface StreakBadgeProps {
  streak: number
  compact?: boolean
}

export function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  if (streak < 2) return null

  const color = streak >= 30 ? 'text-red-500'
    : streak >= 14 ? 'text-orange-500'
    : streak >= 7 ? 'text-amber-500'
    : 'text-yellow-500'

  if (compact) {
    return (
      <span className={`flex items-center gap-0.5 text-xs font-bold ${color}`} title={`${streak} ימים רצופים`}>
        <Flame className="w-3 h-3" />
        {streak}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-1 text-sm font-bold ${color} bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full`}>
      <Flame className="w-4 h-4 animate-pulse" />
      <span>{streak} ימים</span>
    </div>
  )
}

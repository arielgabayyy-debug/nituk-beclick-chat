"use client"

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ChatUser, UserAchievement } from '@/lib/chat-types'
import { ACHIEVEMENT_INFO } from '@/lib/chat-types'

interface AchievementToastProps {
  user: ChatUser
  achievements: UserAchievement[]
}

export function AchievementToast({ user, achievements }: AchievementToastProps) {
  const [queue, setQueue] = useState<UserAchievement[]>([])
  const [current, setCurrent] = useState<UserAchievement | null>(null)
  const seenKey = `seen_achievements_${user.id}`

  useEffect(() => {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) || '[]'))
    const newOnes = achievements.filter(a => !seen.has(a.id))
    if (newOnes.length > 0) {
      setQueue(newOnes)
      // Mark all as seen
      newOnes.forEach(a => seen.add(a.id))
      localStorage.setItem(seenKey, JSON.stringify([...seen]))
    }
  }, [achievements])

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0])
      setQueue(q => q.slice(1))
    }
  }, [current, queue])

  useEffect(() => {
    if (current) {
      const t = setTimeout(() => setCurrent(null), 5000)
      // Trigger confetti via event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('achievement_unlocked'))
      }
      return () => clearTimeout(t)
    }
  }, [current])

  if (!current) return null
  const info = ACHIEVEMENT_INFO[current.achievement_type]
  if (!info) return null

  return (
    <div className="fixed top-20 right-4 z-[65] animate-in slide-in-from-right-4 duration-400 max-w-xs">
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-amber-500/30 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-2xl">
          {info.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80 mb-0.5">🏆 הישג חדש!</p>
          <p className="font-bold text-sm leading-snug">{info.name}</p>
          <p className="text-xs text-white/80 leading-snug">{info.description}</p>
        </div>
        <button onClick={() => setCurrent(null)} className="shrink-0 p-1 hover:bg-white/20 rounded-full transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

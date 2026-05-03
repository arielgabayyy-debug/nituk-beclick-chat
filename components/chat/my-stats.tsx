"use client"

import { useMemo } from 'react'
import { TrendingUp, MessageCircle, Heart, Star, Award, Zap } from 'lucide-react'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatNumber } from '@/lib/chat-types'
import { cn } from '@/lib/utils'

interface MyStatsProps {
  messages: ChatMessage[]
  currentUser: ChatUser
}

export function MyStats({ messages, currentUser }: MyStatsProps) {
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const myMessages = messages.filter(m => m.user_id === currentUser.id)
    const myWeekMessages = myMessages.filter(m => new Date(m.created_at).getTime() > weekAgo)

    const reactionsReceived = myMessages.reduce((sum, m) => sum + (m.reactions?.length || 0), 0)
    const weekReactions = myWeekMessages.reduce((sum, m) => sum + (m.reactions?.length || 0), 0)

    const upvotesReceived = myMessages.reduce((sum, m) => sum + (m.upvotes_count || 0), 0)

    // Most used emoji in my messages (from reactions others gave me)
    const emojiCounts: Record<string, number> = {}
    myMessages.forEach(m => {
      ;(m.reactions || []).forEach(r => {
        emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1
      })
    })
    const topEmoji = Object.entries(emojiCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    // Voice messages sent
    const voiceSent = myMessages.filter(m => m.content.startsWith('[voice:')).length

    // Streak
    const streak = (() => {
      try {
        const data = JSON.parse(localStorage.getItem(`activity_${currentUser.id}`) || '{}')
        return Object.keys(data).length
      } catch { return 0 }
    })()

    return {
      totalMessages: myMessages.length,
      weekMessages: myWeekMessages.length,
      reactionsReceived,
      weekReactions,
      upvotesReceived,
      topEmoji,
      voiceSent,
      streak,
      level: currentUser.level,
      points: currentUser.points,
    }
  }, [messages, currentUser])

  const items = [
    { label: 'הודעות השבוע', value: stats.weekMessages, icon: <MessageCircle className="w-4 h-4" />, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'תגובות השבוע', value: stats.weekReactions, icon: <Heart className="w-4 h-4" />, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30' },
    { label: 'נקודות', value: formatNumber(stats.points), icon: <Star className="w-4 h-4" />, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
    { label: `ימי פעילות`, value: stats.streak, icon: <Zap className="w-4 h-4" />, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' },
    { label: 'עזרות', value: stats.upvotesReceived, icon: <Award className="w-4 h-4" />, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'סה״כ הודעות', value: stats.totalMessages, icon: <TrendingUp className="w-4 h-4" />, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
  ]

  return (
    <div className="bg-white dark:bg-muted border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold">הסטטיסטיקות שלי</h3>
        {stats.topEmoji && (
          <span className="mr-auto text-lg" title="האמוג'י הכי פופולרי שלך">{stats.topEmoji}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-border/30" dir="rtl">
        {items.map(item => (
          <div key={item.label} className="flex flex-col items-center gap-1 p-3 hover:bg-muted/30 transition">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", item.color)}>
              {item.icon}
            </div>
            <span className="text-sm font-bold">{item.value}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
      {stats.voiceSent > 0 && (
        <div className="px-4 py-2 border-t border-border/30 text-xs text-muted-foreground text-center">
          🎤 שלחת {stats.voiceSent} הודעות קוליות · רמה {stats.level}
        </div>
      )}
    </div>
  )
}

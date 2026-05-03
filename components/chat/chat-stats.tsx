"use client"

import { useMemo } from 'react'
import { MessageCircle, TrendingUp, Clock, Users } from 'lucide-react'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'

interface ChatStatsProps {
  messages: ChatMessage[]
  onlineUsers: ChatUser[]
}

export function ChatStats({ messages, onlineUsers }: ChatStatsProps) {
  const PROVIDERS = ['פרטנר', 'סלקום', 'פלאפון', 'הוט מובייל', 'גולן טלקום', 'רמי לוי', '019']

  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime()

    const todayMsgs = messages.filter(m => new Date(m.created_at).getTime() >= todayStart)
    const weekMsgs = messages.filter(m => new Date(m.created_at).getTime() >= weekStart)

    // Peak hour (from today's messages)
    const hourCounts: Record<number, number> = {}
    todayMsgs.forEach(m => {
      const h = new Date(m.created_at).getHours()
      hourCounts[h] = (hourCounts[h] || 0) + 1
    })
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

    // Most active user this week
    const userCounts: Record<string, { count: number; name: string }> = {}
    weekMsgs.forEach(m => {
      if (!m.user) return
      if (!userCounts[m.user_id]) userCounts[m.user_id] = { count: 0, name: m.user.name }
      userCounts[m.user_id].count++
    })
    const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0]

    // Most mentioned provider this week
    const providerCounts: Record<string, number> = {}
    weekMsgs.forEach(m => {
      PROVIDERS.forEach(p => { if (m.content.includes(p)) providerCounts[p] = (providerCounts[p] || 0) + 1 })
    })
    const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]

    // Next milestone
    const totalMsgs = messages.length
    const MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000]
    const nextMilestone = MILESTONES.find(m => m > totalMsgs) || null
    const prevMilestone = nextMilestone ? (MILESTONES[MILESTONES.indexOf(nextMilestone) - 1] || 0) : MILESTONES[MILESTONES.length - 1]
    const milestoneProgress = nextMilestone ? ((totalMsgs - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 100

    return {
      todayCount: todayMsgs.length,
      weekCount: weekMsgs.length,
      peakHour: peakHour ? `${peakHour[0]}:00` : null,
      topUser,
      uniqueUsersToday: new Set(todayMsgs.map(m => m.user_id)).size,
      topProvider: topProvider ? { name: topProvider[0], count: topProvider[1] } : null,
      nextMilestone,
      milestoneProgress,
      totalMsgs,
    }
  }, [messages])

  return (
    <div className="glass rounded-2xl border border-border/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        סטטיסטיקות
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/40 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-[10px] text-muted-foreground">היום</span>
          </div>
          <p className="text-lg font-bold text-foreground">{stats.todayCount}</p>
          <p className="text-[10px] text-muted-foreground">הודעות</p>
        </div>

        <div className="bg-muted/40 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground">היום</span>
          </div>
          <p className="text-lg font-bold text-foreground">{stats.uniqueUsersToday}</p>
          <p className="text-[10px] text-muted-foreground">משתמשים פעילים</p>
        </div>

        {stats.peakHour && (
          <div className="bg-muted/40 rounded-xl p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-muted-foreground">שעת שיא</span>
            </div>
            <p className="text-base font-bold text-foreground">{stats.peakHour}</p>
          </div>
        )}

        <div className="bg-muted/40 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageCircle className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[10px] text-muted-foreground">שבוע</span>
          </div>
          <p className="text-lg font-bold text-foreground">{stats.weekCount}</p>
          <p className="text-[10px] text-muted-foreground">הודעות</p>
        </div>
      </div>

      {/* Activity bar chart (last 12 hours) */}
      {(() => {
        const now = new Date()
        const hours = Array.from({ length: 12 }, (_, i) => {
          const h = (now.getHours() - 11 + i + 24) % 24
          const count = messages.filter(m => new Date(m.created_at).getHours() === h && new Date(m.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length
          return { h, count }
        })
        const max = Math.max(...hours.map(h => h.count), 1)
        if (max === 0) return null
        return (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">פעילות ב-12 שעות אחרונות</p>
            <div className="flex items-end gap-0.5 h-10">
              {hours.map(({ h, count }) => (
                <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm bg-primary/40 hover:bg-primary/70 transition-colors"
                    style={{ height: `${Math.max(2, (count / max) * 100)}%` }}
                    title={`${h}:00 — ${count} הודעות`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5">
              <span>{hours[0].h}:00</span>
              <span>{now.getHours()}:00</span>
            </div>
          </div>
        )
      })()}

      {stats.topProvider && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-base">📡</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">הספק הנדון השבוע</p>
            <p className="text-sm font-semibold truncate">{stats.topProvider.name}</p>
          </div>
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{stats.topProvider.count}×</span>
        </div>
      )}

      {/* Milestone progress */}
      {stats.nextMilestone && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">עד {stats.nextMilestone.toLocaleString()} הודעות</span>
            <span className="text-[10px] font-medium text-primary">{stats.totalMsgs.toLocaleString()} / {stats.nextMilestone.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${stats.milestoneProgress}%` }} />
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 text-left">עוד {(stats.nextMilestone - stats.totalMsgs).toLocaleString()} הודעות למיילסטון 🎉</p>
        </div>
      )}

      {stats.topUser && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-base">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">הכי פעיל השבוע</p>
            <p className="text-sm font-semibold truncate">{stats.topUser.name}</p>
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{stats.topUser.count}</span>
        </div>
      )}
    </div>
  )
}

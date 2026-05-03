"use client"

import { useMemo } from 'react'
import { Activity, MessageCircle, Heart, Award, TrendingUp } from 'lucide-react'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

interface ActivityItem {
  id: string
  type: 'message' | 'reaction' | 'achievement' | 'join' | 'deal'
  userId: string
  userName: string
  avatarColor: string
  description: string
  time: string
}

interface ActivityFeedProps {
  messages: ChatMessage[]
  onlineUsers: ChatUser[]
  maxItems?: number
}

export function ActivityFeed({ messages, onlineUsers, maxItems = 10 }: ActivityFeedProps) {
  const activities = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []

    // Recent messages (last 20)
    const recent = messages.slice(-20).reverse()
    recent.forEach(m => {
      if (!m.user) return
      const isDeal = /[₪%]|\d+\s*ש"ח|מבצע|חבילה|הנחה|עסקה|חינם/i.test(m.content)

      if (isDeal) {
        items.push({
          id: `deal-${m.id}`,
          type: 'deal',
          userId: m.user_id,
          userName: m.user.name,
          avatarColor: m.user.avatar_color,
          description: `שיתף עסקה: "${m.content.slice(0, 40)}..."`,
          time: m.created_at,
        })
      } else if ((m.reactions || []).length > 2) {
        items.push({
          id: `reaction-${m.id}`,
          type: 'reaction',
          userId: m.user_id,
          userName: m.user.name,
          avatarColor: m.user.avatar_color,
          description: `קיבל ${m.reactions!.length} תגובות על הודעתו`,
          time: m.created_at,
        })
      } else {
        items.push({
          id: `msg-${m.id}`,
          type: 'message',
          userId: m.user_id,
          userName: m.user.name,
          avatarColor: m.user.avatar_color,
          description: m.content.startsWith('[voice:') ? 'שלח הודעה קולית' : `כתב: "${m.content.slice(0, 50)}${m.content.length > 50 ? '...' : ''}"`,
          time: m.created_at,
        })
      }
    })

    // Sort by time, most recent first, deduplicate by user
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, maxItems)
  }, [messages, onlineUsers, maxItems])

  const TYPE_ICONS: Record<ActivityItem['type'], React.ReactNode> = {
    message: <MessageCircle className="w-3.5 h-3.5 text-blue-500" />,
    reaction: <Heart className="w-3.5 h-3.5 text-pink-500" />,
    achievement: <Award className="w-3.5 h-3.5 text-amber-500" />,
    join: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
    deal: <span className="text-sm">💰</span>,
  }

  if (activities.length === 0) return null

  return (
    <div className="bg-white dark:bg-muted border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold">פעילות אחרונה</h3>
      </div>
      <div className="divide-y divide-border/20">
        {activities.map(item => (
          <div key={item.id} className="px-3 py-2 flex items-center gap-2.5 hover:bg-muted/30 transition">
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: item.avatarColor }}
            >
              {item.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">{item.userName}</span>
                <span className="shrink-0">{TYPE_ICONS[item.type]}</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(item.time)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

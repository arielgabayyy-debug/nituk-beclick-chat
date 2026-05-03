"use client"

import { Lightbulb, HelpCircle, Calendar, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DailyQuestion, DailyTip, CommunityEvent } from '@/lib/chat-types'

interface DailyQuestionProps {
  question: DailyQuestion | null
}

export function DailyQuestionCard({ question }: DailyQuestionProps) {
  if (!question) return null

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 shrink-0">
          <HelpCircle className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-foreground">שאלת היום</h3>
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
          </div>
          <p className="text-foreground/90 text-lg font-medium leading-relaxed">
            {question.question}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            {question.responses_count} תגובות • שתפו את דעתכם בצ׳אט!
          </p>
        </div>
      </div>
    </div>
  )
}

interface DailyTipProps {
  tip: DailyTip | null
}

export function DailyTipCard({ tip }: DailyTipProps) {
  if (!tip) return null

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 shrink-0">
          <Lightbulb className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-foreground">טיפ היום</h3>
            {tip.category && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                {tip.category}
              </span>
            )}
          </div>
          <p className="text-foreground/90 leading-relaxed">
            {tip.tip_text}
          </p>
        </div>
      </div>
    </div>
  )
}

interface UpcomingEventsProps {
  events: CommunityEvent[]
}

export function UpcomingEventsCard({ events }: UpcomingEventsProps) {
  if (events.length === 0) return null

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'expert_hour':
        return '👨‍💼'
      case 'quiz':
        return '🎯'
      case 'special':
        return '🎉'
      default:
        return '📅'
    }
  }

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'expert_hour':
        return 'שעת מומחה'
      case 'quiz':
        return 'חידון'
      case 'special':
        return 'אירוע מיוחד'
      default:
        return 'אירוע'
    }
  }

  const formatEventTime = (date: string) => {
    const eventDate = new Date(date)
    const now = new Date()
    const diffMs = eventDate.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 0) return 'עכשיו!'
    if (diffHours < 24) return `בעוד ${diffHours} שעות`
    if (diffDays === 1) return 'מחר'
    return `בעוד ${diffDays} ימים`
  }

  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 backdrop-blur-xl rounded-2xl border border-cyan-500/30 overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-bold text-foreground">אירועים קרובים</h3>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {events.map((event) => (
          <div key={event.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getEventIcon(event.event_type)}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{event.title}</h4>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                    {getEventTypeName(event.event_type)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatEventTime(event.starts_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

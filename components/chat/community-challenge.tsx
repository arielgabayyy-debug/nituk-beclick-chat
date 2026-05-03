"use client"

import { useState, useEffect } from 'react'
import { Target, Check, Trophy } from 'lucide-react'

interface Challenge {
  id: string
  title: string
  description: string
  reward: number
  target: number
  unit: string
  expiresAt: string // ISO string, end of current week
}

const WEEKLY_CHALLENGES: Omit<Challenge, 'id' | 'expiresAt'>[] = [
  { title: 'שגריר הקהילה', description: 'שלח 10 הודעות השבוע', reward: 50, target: 10, unit: 'הודעות' },
  { title: 'צייד עסקאות', description: 'שתף 2 עסקאות חמות השבוע', reward: 30, target: 2, unit: 'עסקאות' },
  { title: 'חבר טוב', description: 'עזור ל-3 אנשים השבוע', reward: 40, target: 3, unit: 'עזרות' },
  { title: 'יוצר תוכן', description: 'צור סקר שיקבל 5 הצבעות', reward: 60, target: 5, unit: 'הצבעות' },
]

interface CommunityChallengeProps {
  userMessagesThisWeek: number
}

export function CommunityChallenge({ userMessagesThisWeek }: CommunityChallengeProps) {
  const [challenge] = useState<Challenge>(() => {
    const weekIdx = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % WEEKLY_CHALLENGES.length
    const base = WEEKLY_CHALLENGES[weekIdx]
    const now = new Date()
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
    endOfWeek.setHours(23, 59, 59, 999)
    return { ...base, id: `w${weekIdx}`, expiresAt: endOfWeek.toISOString() }
  })

  const [completed, setCompleted] = useState(() =>
    localStorage.getItem(`challenge_done_${challenge.id}`) === '1'
  )

  const progress = Math.min(userMessagesThisWeek, challenge.target)
  const percentage = (progress / challenge.target) * 100

  useEffect(() => {
    if (progress >= challenge.target && !completed) {
      setCompleted(true)
      localStorage.setItem(`challenge_done_${challenge.id}`, '1')
    }
  }, [progress, challenge, completed])

  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return (
    <div className={`glass rounded-2xl border p-4 transition-all ${completed ? 'border-emerald-400/40 bg-emerald-500/5' : 'border-border/30'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${completed ? 'bg-emerald-500' : 'bg-primary/10'}`}>
          {completed ? <Check className="w-4 h-4 text-white" /> : <Target className="w-4 h-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{challenge.title}</h3>
          <p className="text-[10px] text-muted-foreground">{daysLeft} ימים נותרו</p>
        </div>
        <div className="flex items-center gap-1 text-amber-500">
          <Trophy className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">+{challenge.reward}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{challenge.description}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{progress} / {challenge.target} {challenge.unit}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-purple-500'}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      {completed && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 text-center">✅ אתגר שבועי הושלם! 🎉</p>
      )}
    </div>
  )
}

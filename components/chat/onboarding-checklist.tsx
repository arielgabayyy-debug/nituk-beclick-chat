"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, X, ChevronDown, ChevronUp, Sparkles, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatUser } from '@/lib/chat-types'

interface ChecklistItem {
  id: string
  label: string
  description: string
  points: number
  check: (user: ChatUser, messagesCount: number) => boolean
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'sent_first_msg', label: 'שלח הודעה ראשונה', description: 'הכנס לשיחה ותשלח את ההודעה הראשונה שלך', points: 20, check: (u) => u.messages_count > 0 },
  { id: 'set_status', label: 'הגדר סטטוס', description: "הוסף אימוג'י וסטטוס אישי בפרופיל שלך", points: 10, check: (u) => { try { return !!localStorage.getItem(`user_status_${u.id}`) } catch { return false } } },
  { id: 'react_message', label: 'הגב להודעה', description: "לחץ על אמוג'י להוסיף תגובה להודעה של מישהו", points: 15, check: () => { try { return !!localStorage.getItem('reaction_done') } catch { return false } } },
  { id: 'share_deal', label: 'שתף עסקה', description: 'שתף עסקה מצוינת שמצאת בקהילה', points: 25, check: (u) => { try { return JSON.parse(localStorage.getItem(`shop_purchased_${u.id}`) || '[]').length > 0 || localStorage.getItem('deal_shared') === '1' } catch { return false } } },
  { id: 'upvote', label: 'עזור למישהו', description: 'לחץ 👍 על הודעה שעזרה לך', points: 15, check: (u) => { try { return JSON.parse(localStorage.getItem(`upvoted_${u.id}`) || '[]').length > 0 } catch { return false } } },
  { id: 'save_message', label: 'שמור הודעה', description: 'לחץ על 🔖 לשמור הודעה שימושית', points: 10, check: () => { try { return JSON.parse(localStorage.getItem('chat_bookmarks') || '[]').length > 0 } catch { return false } } },
  { id: 'profile_complete', label: 'השלם פרופיל', description: 'עדכן תמונת פרופיל או צבע אווטאר', points: 20, check: (u) => !!u.avatar_url },
  { id: 'sent_10_msgs', label: 'שלח 10 הודעות', description: 'הפוך לחלק פעיל מהקהילה', points: 30, check: (u) => u.messages_count >= 10 },
]

const STORAGE_KEY = 'onboarding_dismissed'

interface OnboardingChecklistProps {
  user: ChatUser
  messagesCount?: number
  onSendMessage?: (text: string) => void
}

export function OnboardingChecklist({ user, messagesCount = 0, onSendMessage }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setDismissed(!!localStorage.getItem(STORAGE_KEY))
  }, [])

  const items = CHECKLIST_ITEMS.map(item => ({
    ...item,
    completed: item.check(user, messagesCount),
  }))

  const completedCount = items.filter(i => i.completed).length
  const totalPoints = items.filter(i => i.completed).reduce((sum, i) => sum + i.points, 0)
  const pct = Math.round((completedCount / items.length) * 100)
  const allDone = completedCount === items.length

  // Auto-hide when all tasks complete and user dismisses
  if (dismissed) return null

  // If user already has more than 50 messages they're not new — hide
  if (user.messages_count > 50 && allDone) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className={cn(
      "border rounded-2xl overflow-hidden transition-all",
      allDone
        ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-400/30"
        : "bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20"
    )}>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/20 transition"
      >
        <Sparkles className={cn("w-4 h-4 shrink-0", allDone ? "text-emerald-500" : "text-primary")} />
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold">{allDone ? '🎉 סיימת את המדריך למתחילים!' : 'צעדים ראשונים'}</p>
          <p className="text-xs text-muted-foreground">{completedCount}/{items.length} סיימת · {totalPoints} נקודות הרווחת</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 relative">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-border/40" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} className={allDone ? "text-emerald-500" : "text-primary"} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{pct}%</span>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-border/20">
          {allDone ? (
            <div className="p-4 text-center">
              <p className="text-2xl mb-2">🏆</p>
              <p className="text-sm font-semibold">כל הכבוד! השלמת את כל המשימות</p>
              <p className="text-xs text-muted-foreground mt-1">הרווחת {totalPoints} נקודות בונוס!</p>
              {onSendMessage && (
                <button
                  onClick={() => onSendMessage('🎉 זה עתה השלמתי את המדריך למתחילים בקהילה! אשמח להכיר אתכם!')}
                  className="mt-3 text-xs bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:opacity-90 transition"
                >
                  שתף עם הקהילה 🚀
                </button>
              )}
              <button onClick={handleDismiss} className="block mx-auto mt-2 text-xs text-muted-foreground hover:underline">
                סגור
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {items.map(item => (
                <div
                  key={item.id}
                  className={cn("flex items-start gap-3 px-4 py-2.5 transition", item.completed && "opacity-60")}
                >
                  {item.completed
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-border shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", item.completed && "line-through")}>{item.label}</p>
                    {!item.completed && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                  <span className={cn("text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full", item.completed ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary")}>
                    +{item.points}
                  </span>
                </div>
              ))}
              <div className="px-4 py-2 flex justify-end">
                <button onClick={handleDismiss} className="text-xs text-muted-foreground hover:underline">
                  הסתר
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

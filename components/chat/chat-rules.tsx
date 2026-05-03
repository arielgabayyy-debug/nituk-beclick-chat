"use client"

import { useState, useEffect } from 'react'
import { X, ShieldCheck } from 'lucide-react'

const RULES = [
  '🤝 היו מכבדים ונחמדים כלפי כולם',
  '🔥 שתפו עסקאות ומבצעים שמצאתם',
  '🚫 אין לפרסם ספאם או תוכן פוגעני',
  '💡 שאלו שאלות — כולנו כאן לעזור!',
  '⭐ עוזרים לאחרים = מרוויחים נקודות',
]

export function ChatRulesCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('chat_rules_dismissed')
    if (!dismissed) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('chat_rules_dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mx-4 mb-2 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-400/20 rounded-2xl p-4 relative">
        <button
          onClick={dismiss}
          className="absolute top-3 left-3 p-1 hover:bg-white/10 rounded-full transition text-muted-foreground hover:text-foreground"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-cyan-500 shrink-0" />
          <h3 className="font-semibold text-sm text-foreground">כללי הקהילה שלנו</h3>
        </div>
        <ul className="space-y-1.5">
          {RULES.map((rule, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={dismiss}
          className="mt-3 w-full text-xs text-center py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/20 rounded-xl font-medium text-cyan-600 dark:text-cyan-400 transition"
        >
          הבנתי! בוא נתחיל 🚀
        </button>
      </div>
    </div>
  )
}

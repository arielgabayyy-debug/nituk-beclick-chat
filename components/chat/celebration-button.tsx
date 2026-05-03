"use client"

import { useState } from 'react'
import { PartyPopper } from 'lucide-react'

interface CelebrationButtonProps {
  onSend: (content: string) => void
}

const CELEBRATIONS = [
  { emoji: '🎉', text: 'חגיגה!', msg: '🎉 חגיגה לכולם! כיף לי לחלוק את השמחה הזו איתכם!' },
  { emoji: '🥳', text: 'מסיבה!', msg: '🥳 מסיבה בצ\'אט! כולם מוזמנים לחגוג!' },
  { emoji: '🏆', text: 'ניצחון!', msg: '🏆 ניצחון! הצלחתי לחסוך וגאה בזה!' },
  { emoji: '💰', text: 'חסכתי!', msg: '💰 חסכתי! הקהילה הזו ממש שינתה לי את החיים!' },
  { emoji: '🎊', text: 'קונפטי!', msg: '🎊 🎊 🎊 אירוע מיוחד — כולם מוזמנים לחגוג!' },
  { emoji: '⭐', text: 'עסקה!', msg: '⭐ מצאתי עסקה מושלמת — חייבים לשתף!' },
]

export function CelebrationButton({ onSend }: CelebrationButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amber-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 text-amber-600 dark:text-amber-400 rounded-xl px-3 py-2 transition font-medium border border-amber-400/20"
        title="שלח הודעת חגיגה"
      >
        <PartyPopper className="w-3.5 h-3.5" />
        חגיגה!
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-white dark:bg-muted border border-border/60 rounded-2xl shadow-xl p-2 grid grid-cols-3 gap-1.5 w-44 animate-in fade-in zoom-in-95 duration-150">
          {CELEBRATIONS.map(c => (
            <button
              key={c.emoji}
              onClick={() => { onSend(c.msg); setOpen(false) }}
              className="flex flex-col items-center gap-0.5 p-2 hover:bg-muted rounded-xl transition group"
            >
              <span className="text-xl group-hover:scale-125 transition-transform">{c.emoji}</span>
              <span className="text-[9px] text-muted-foreground">{c.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

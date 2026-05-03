"use client"

import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'איך מרוויחים נקודות?',
    a: 'שלחי הודעות, עזרי לאחרים, שתפי עסקאות, השתתפי בסקרים וקבלי ❤️ על הודעות. כל פעולה שווה נקודות!'
  },
  {
    q: 'מה ההבדל בין מנוי לאורח?',
    a: 'מנויים מקבלים תג מיוחד, יכולים להעלות תמונת פרופיל ומיועדים לנמענים שמקבלים את הניוזלטר שלנו.'
  },
  {
    q: 'איך משתפים עסקה חמה?',
    a: 'לחצי על הכרטיסייה "עסקאות" בסרגל הימני ואז "שתף עסקה". תיאור הצעה, ספק ואת החיסכון!'
  },
  {
    q: 'מה עושים אם מישהו מציק?',
    a: 'לחצי על 🚩 על ההודעה ובחרי סיבה. צוות הניהול יקבל את הדיווח ויטפל בו.'
  },
  {
    q: 'איך כותבים טקסט מעוצב?',
    a: '**מודגש** עם כוכביות, _נטוי_ עם קו תחתון, `קוד` עם גרשיים. לרשימה: - פריט'
  },
]

export function CommunityFAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const items = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 3)

  return (
    <div className="glass rounded-2xl border border-border/30 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-primary" />
        שאלות נפוצות
      </h3>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border/20">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-right hover:bg-muted/40 transition-colors"
            >
              <span className="flex-1 text-right">{item.q}</span>
              {open === i
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2" />}
            </button>
            {open === i && (
              <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed bg-muted/20 animate-in slide-in-from-top-1 duration-150">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
      {FAQ_ITEMS.length > 3 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="mt-2 w-full text-[10px] text-primary hover:underline"
        >
          {showAll ? 'הצג פחות' : `+ ${FAQ_ITEMS.length - 3} שאלות נוספות`}
        </button>
      )}
    </div>
  )
}

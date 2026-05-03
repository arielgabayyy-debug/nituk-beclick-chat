"use client"

import { useState, useEffect } from 'react'
import { Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react'

interface Feature {
  version: string
  date: string
  items: string[]
}

const CHANGELOG: Feature[] = [
  {
    version: '2.8',
    date: 'מאי 2026',
    items: [
      '🎙️ בקרת מהירות הפעלה להודעות קוליות (0.75x–2x)',
      '👑 תג VIP זהב לחברים שרכשו בחנות הנקודות',
      '📌 לוח מסמר — כל ההודעות הנעוצות במקום אחד',
      '😊 בוחר אמוג׳י מלא עם 8 קטגוריות + חיפוש',
      '🌐 כפתור תרגום בכל הודעה (עברית→EN/AR/RU)',
    ],
  },
  {
    version: '2.7',
    date: 'מאי 2026',
    items: [
      '💬 הודעות ישירות (DM) בין משתמשים',
      '🔔 מרכז התראות עם מנגנון סינון',
      '⭐ חנות נקודות — קנה תגים ופיצ׳רים',
      '🔍 חיפוש מתקדם עם פילטרים (סוג/תאריך/משתמש)',
      '⏰ תזמון הודעות לשליחה עתידית',
    ],
  },
  {
    version: '2.6',
    date: 'מאי 2026',
    items: [
      '🏆 הצבעה למשתמש השבוע',
      '🔇 השתקת משתמשים — הסתר הודעות שלהם',
      '🏷️ תיוג אוטומטי של הודעות (שאלה/עסקה/עזרה)',
      '🎨 8 ערכות נושא לצ׳אט',
      '⚡ תשובות שמורות + עריכת חיוג מהיר',
    ],
  },
  {
    version: '2.5',
    date: 'אפריל 2026',
    items: [
      '📊 לוח מנהל משופר עם גרפים חיים',
      '🎯 מאתר מגמות ומילות מפתח',
      '🏅 מערכת הישגים (10 סוגים)',
      '🖼️ גלריית תמונות + צופה תמונות מלא',
      '📎 גרירת קבצים לאזור הצ׳אט',
    ],
  },
]

const STORAGE_KEY = 'whats_new_seen_v'
const CURRENT_VERSION = '2.8'

export function WhatsNew() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState<string | null>('2.8')
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== CURRENT_VERSION) {
      setHasNew(true)
    }
  }, [])

  const handleOpen = () => {
    setShow(true)
    setHasNew(false)
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        title="מה חדש?"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline">מה חדש?</span>
        {hasNew && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16" onClick={() => setShow(false)}>
          <div
            className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-amber-500/10 to-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold">מה חדש בגרסה {CURRENT_VERSION}</h3>
              </div>
              <button onClick={() => setShow(false)} className="p-1 hover:bg-muted rounded-full transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {CHANGELOG.map(v => (
                <div key={v.version} className="border border-border/60 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === v.version ? null : v.version)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">v{v.version}</span>
                      <span className="text-sm font-medium">{v.date}</span>
                      {v.version === CURRENT_VERSION && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full">חדש!</span>
                      )}
                    </div>
                    {expanded === v.version
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                  {expanded === v.version && (
                    <ul className="px-4 pb-3 space-y-1.5 border-t border-border/30">
                      {v.items.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

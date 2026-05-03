"use client"

import { useEffect, useState } from 'react'
import { X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['Ctrl', 'F'], desc: 'חיפוש בהודעות' },
  { keys: ['Esc'], desc: 'סגור חיפוש / ביטול תגובה' },
  { keys: ['↑'], desc: 'ערוך הודעה אחרונה שלך (כשהקלט ריק)' },
  { keys: ['Enter'], desc: 'שלח הודעה' },
  { keys: ['Shift', 'Enter'], desc: 'שורה חדשה' },
  { keys: ['Tab'], desc: 'השלם @אזכור / :אימוג׳' },
  { keys: ['?'], desc: 'פתח רשימת קיצורי דרך זו' },
]

const TEXT_MARKDOWN = [
  { syntax: '**טקסט**', result: 'טקסט מודגש' },
  { syntax: '`קוד`', result: 'קוד inline' },
  { syntax: '```...```', result: 'בלוק קוד' },
  { syntax: '# כותרת', result: 'כותרת ראשית' },
  { syntax: '- פריט', result: 'רשימה עם נקודות' },
  { syntax: '1. פריט', result: 'רשימה ממוספרת' },
  { syntax: '> ציטוט', result: 'ציטוט מוכנס' },
  { syntax: '---', desc: 'קו מפריד' },
]

interface ShortcutsModalProps {
  onClose: () => void
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border/40 p-5 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">קיצורי דרך ועיצוב</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">⌨️ קיצורי מקלדת</h3>
            <div className="space-y-1.5">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{s.desc}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map(k => (
                      <kbd key={k} className="text-[11px] font-mono bg-muted border border-border/50 rounded px-1.5 py-0.5">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Markdown */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">✏️ עיצוב טקסט</h3>
            <div className="space-y-1.5">
              {TEXT_MARKDOWN.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{m.result || m.desc}</span>
                  <code className="text-[11px] font-mono bg-muted/60 border border-border/30 rounded px-2 py-0.5 text-primary shrink-0">{m.syntax}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Slash commands */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🎮 פקודות</h3>
            <p className="text-sm text-muted-foreground">הקלד <code className="font-mono text-primary bg-muted/60 px-1 rounded">/</code> בקלט לראות פקודות זמינות</p>
          </div>
        </div>
      </div>
    </div>
  )
}

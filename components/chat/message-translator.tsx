"use client"

import { useState } from 'react'
import { Languages, Loader2, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageTranslatorProps {
  content: string
  onClose: () => void
}

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English', name: 'אנגלית' },
  { code: 'ar', label: '🇸🇦 عربي', name: 'ערבית' },
  { code: 'ru', label: '🇷🇺 Русский', name: 'רוסית' },
  { code: 'fr', label: '🇫🇷 Français', name: 'צרפתית' },
  { code: 'es', label: '🇪🇸 Español', name: 'ספרדית' },
  { code: 'de', label: '🇩🇪 Deutsch', name: 'גרמנית' },
  { code: 'uk', label: '🇺🇦 Українська', name: 'אוקראינית' },
  { code: 'he', label: '🇮🇱 עברית', name: 'עברית' },
]

// Simple cache so same message isn't translated twice
const cache = new Map<string, string>()

export function MessageTranslator({ content, onClose }: MessageTranslatorProps) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetLang, setTargetLang] = useState('en')
  const [detectedFrom, setDetectedFrom] = useState<string | null>(null)

  const translate = async (lang = targetLang) => {
    const cacheKey = `${content}__${lang}`
    if (cache.has(cacheKey)) {
      setTranslated(cache.get(cacheKey)!)
      setTargetLang(lang)
      return
    }

    setLoading(true)
    setError(null)
    setTargetLang(lang)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetLang: lang }),
      })

      const data = await res.json() as {
        translated?: string
        from?: string
        error?: string
      }

      if (!res.ok || data.error) {
        setError(data.error || 'שגיאה בתרגום')
        return
      }

      if (data.translated) {
        cache.set(cacheKey, data.translated)
        setTranslated(data.translated)
        if (data.from) setDetectedFrom(data.from)
      }
    } catch {
      setError('בעיית רשת. בדוק חיבור לאינטרנט ונסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
  const fromLang = LANGUAGES.find(l => l.code === detectedFrom)

  return (
    <div className="mt-2 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3 text-sm animate-in fade-in duration-200" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
          <Languages className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">תרגום</span>
          {detectedFrom && fromLang && (
            <span className="text-[10px] text-muted-foreground">
              מ{fromLang.name} → {langName}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded-full transition touch-manipulation">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Quick language buttons */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => translate(lang.code)}
            disabled={loading}
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full border transition-all touch-manipulation",
              targetLang === lang.code && translated
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white dark:bg-muted border-border/50 text-muted-foreground hover:border-blue-300 hover:text-blue-600"
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">מתרגם...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-destructive flex-1">{error}</p>
          <button
            onClick={() => translate()}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline touch-manipulation"
          >
            <RotateCcw className="w-3 h-3" /> נסה שוב
          </button>
        </div>
      )}

      {translated && !loading && !error && (
        <div className="space-y-1.5">
          <div className="bg-white dark:bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
            <p className="text-sm leading-relaxed" dir="auto">{translated}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              תורגם ל{langName}
            </span>
            <button
              onClick={() => { setTranslated(null); setError(null) }}
              className="text-[11px] text-primary hover:underline touch-manipulation"
            >
              שנה שפה
            </button>
          </div>
        </div>
      )}

      {/* Default state — no translation yet */}
      {!translated && !loading && !error && (
        <p className="text-xs text-muted-foreground">לחץ על שפה כדי לתרגם</p>
      )}
    </div>
  )
}

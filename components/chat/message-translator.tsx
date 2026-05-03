"use client"

import { useState } from 'react'
import { Languages, Loader2, X } from 'lucide-react'

interface MessageTranslatorProps {
  content: string
  onClose: () => void
}

export function MessageTranslator({ content, onClose }: MessageTranslatorProps) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetLang, setTargetLang] = useState<'en' | 'ar' | 'ru'>('en')

  const LANG_NAMES = { en: 'אנגלית', ar: 'ערבית', ru: 'רוסית' }

  const translate = async () => {
    setLoading(true)
    try {
      // Use Google Translate free API (unofficial endpoint)
      const sl = 'iw' // Hebrew source
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(content)}`
      )
      const json = await res.json()
      // Result format: [[["translated", "original", null, null, 10]], null, "iw"]
      const result = json[0]?.map((seg: [string]) => seg[0]).join('') || ''
      setTranslated(result)
    } catch {
      setTranslated('לא ניתן לתרגם כרגע. אנא נסה שוב מאוחר יותר.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 bg-muted/40 border border-border/40 rounded-xl p-3 text-sm animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Languages className="w-4 h-4" />
          <span className="text-xs font-medium">תרגום</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded-full transition">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {!translated ? (
        <div className="flex items-center gap-2">
          <select
            value={targetLang}
            onChange={e => setTargetLang(e.target.value as 'en' | 'ar' | 'ru')}
            className="text-xs bg-background border border-border/60 rounded-lg px-2 py-1 focus:outline-none"
          >
            {Object.entries(LANG_NAMES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={translate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1 hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
            תרגם ל{LANG_NAMES[targetLang]}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed" dir="auto">{translated}</p>
          <button
            onClick={() => setTranslated(null)}
            className="text-[11px] text-primary hover:underline mt-1"
          >
            שנה שפה
          </button>
        </div>
      )}
    </div>
  )
}

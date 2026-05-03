"use client"

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'

interface TrendingKeywordsProps {
  messages: ChatMessage[]
  onSearch: (keyword: string) => void
}

const STOP_WORDS = new Set([
  'של', 'את', 'לא', 'הם', 'על', 'עם', 'אני', 'אתה', 'הוא', 'היא', 'אנחנו',
  'כל', 'זה', 'זו', 'זאת', 'כי', 'אם', 'גם', 'כבר', 'רק', 'עוד', 'כן', 'לי',
  'מה', 'איך', 'יש', 'אין', 'פה', 'שם', 'כך', 'כמו', 'מי', 'לו', 'לה',
  'אבל', 'או', 'מאוד', 'היה', 'להיות', 'הייתה', 'ה', 'ב', 'מ', 'ל', 'ו',
  'the', 'is', 'are', 'in', 'on', 'at', 'for', 'and', 'or', 'to', 'of',
])

export function TrendingKeywords({ messages, onSearch }: TrendingKeywordsProps) {
  const keywords = useMemo(() => {
    const hourAgo = Date.now() - 3 * 60 * 60 * 1000
    const recent = messages.filter(m => new Date(m.created_at).getTime() > hourAgo)
    const freq: Record<string, number> = {}
    recent.forEach(m => {
      if (m.content.startsWith('[voice:')) return
      const words = m.content.replace(/[^֐-׿\w\s]/g, '').split(/\s+/)
      words.forEach(w => {
        const clean = w.toLowerCase().trim()
        if (clean.length >= 3 && !STOP_WORDS.has(clean)) {
          freq[clean] = (freq[clean] || 0) + 1
        }
      })
    })
    return Object.entries(freq)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }))
  }, [messages])

  if (keywords.length === 0) return null

  return (
    <div className="glass rounded-2xl border border-border/30 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        נושאים חמים (3 שעות)
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map(({ word, count }) => (
          <button
            key={word}
            onClick={() => onSearch(word)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-full border border-primary/20 transition-all hover:scale-105"
          >
            <span>{word}</span>
            <span className="text-[9px] opacity-70 font-bold">{count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

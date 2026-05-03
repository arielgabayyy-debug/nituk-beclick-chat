"use client"

import { useState } from 'react'
import { X, Flame, Send } from 'lucide-react'
import { PROVIDER_LIST } from '@/lib/chat-types'

interface QuickDealProps {
  onShare: (title: string, description: string, provider: string, savings: number | null) => void
  onClose: () => void
}

export function QuickDeal({ onShare, onClose }: QuickDealProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState(PROVIDER_LIST[0])
  const [savings, setSavings] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) return
    onShare(title.trim(), description.trim(), provider, savings ? parseFloat(savings) : null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border/40 p-5 w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm">שתף עסקה חמה 🔥</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">כותרת העסקה *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="חבילת אינטרנט 100GB ב-30₪!"
              className="w-full text-sm border border-border/50 rounded-xl px-3 py-2 focus:outline-none focus:border-primary/50 bg-transparent"
              dir="auto"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ספק</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full text-sm border border-border/50 rounded-xl px-2 py-2 focus:outline-none bg-transparent"
              >
                {PROVIDER_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">חיסכון (₪)</label>
              <input
                type="number"
                value={savings}
                onChange={e => setSavings(e.target.value)}
                placeholder="50"
                className="w-full text-sm border border-border/50 rounded-xl px-3 py-2 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">פרטים נוספים</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="מתי מסתיים המבצע, מה כלול..."
              className="w-full text-sm border border-border/50 rounded-xl px-3 py-2 focus:outline-none resize-none h-16 bg-transparent"
              dir="auto"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            שתף עסקה!
          </button>
        </div>
      </div>
    </div>
  )
}

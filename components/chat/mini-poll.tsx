"use client"

import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiniPollProps {
  question: string
  optionA: string
  optionB: string
  storageKey: string
  isOwn?: boolean
}

export function MiniPoll({ question, optionA, optionB, storageKey, isOwn }: MiniPollProps) {
  const [voted, setVoted] = useState<'a' | 'b' | null>(null)
  const [counts, setCounts] = useState({ a: Math.floor(Math.random() * 30) + 5, b: Math.floor(Math.random() * 20) + 3 })

  useEffect(() => {
    const saved = localStorage.getItem(`minipoll_${storageKey}`)
    if (saved) setVoted(saved as 'a' | 'b')
  }, [storageKey])

  const vote = (choice: 'a' | 'b') => {
    if (voted) return
    setVoted(choice)
    localStorage.setItem(`minipoll_${storageKey}`, choice)
    setCounts(prev => ({ ...prev, [choice]: prev[choice] + 1 }))
  }

  const total = counts.a + counts.b
  const pctA = total > 0 ? Math.round((counts.a / total) * 100) : 50
  const pctB = 100 - pctA

  return (
    <div className={cn(
      "mt-2 rounded-xl border p-3 text-sm",
      isOwn ? "border-white/20 bg-white/10" : "border-border/40 bg-muted/30"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-4 h-4 opacity-70 shrink-0" />
        <p className={cn("font-medium text-sm", isOwn ? "text-white" : "text-foreground")}>{question}</p>
      </div>

      {voted ? (
        <div className="flex flex-col gap-1.5">
          {[{ key: 'a' as const, label: optionA, pct: pctA }, { key: 'b' as const, label: optionB, pct: pctB }].map(opt => (
            <div key={opt.key}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className={cn(voted === opt.key && "font-semibold")}>{opt.label}</span>
                <span className="opacity-70">{opt.pct}%</span>
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", isOwn ? "bg-white/20" : "bg-muted")}>
                <div
                  className={cn("h-full rounded-full transition-all duration-700", voted === opt.key ? "bg-primary" : isOwn ? "bg-white/40" : "bg-muted-foreground/30")}
                  style={{ width: `${opt.pct}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] opacity-50 mt-1">{total} הצבעות</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => vote('a')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              isOwn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-background border border-border/60 hover:border-primary hover:text-primary"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> {optionA}
          </button>
          <button
            onClick={() => vote('b')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              isOwn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-background border border-border/60 hover:border-destructive hover:text-destructive"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> {optionB}
          </button>
        </div>
      )}
    </div>
  )
}

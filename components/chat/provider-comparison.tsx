"use client"

import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Plan {
  name: string
  price: number
  data: string
  minutes: string
  sms: string
  network: string
  special?: string
}

const PROVIDERS: Array<{ name: string; icon: string; color: string; plans: Plan[] }> = [
  {
    name: 'רמי לוי',
    icon: '🟣',
    color: 'bg-purple-100 dark:bg-purple-950/30',
    plans: [
      { name: 'בסיסי', price: 30, data: '20GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'Partner' },
      { name: 'פרמיום', price: 45, data: '70GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'Partner', special: '20GB לרוסטינג' },
    ],
  },
  {
    name: 'גולן טלקום',
    icon: '🟡',
    color: 'bg-yellow-100 dark:bg-yellow-950/30',
    plans: [
      { name: 'סטנדרט', price: 39, data: '50GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'Cellcom' },
      { name: 'פלוס', price: 55, data: 'ללא הגבלה', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'Cellcom', special: 'שיחות חו"ל' },
    ],
  },
  {
    name: 'הוט מובייל',
    icon: '🟠',
    color: 'bg-orange-100 dark:bg-orange-950/30',
    plans: [
      { name: 'בסיסי', price: 35, data: '30GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'HOT' },
      { name: 'פרמיום', price: 50, data: '100GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'HOT', special: 'eSIM כלול' },
    ],
  },
  {
    name: '019',
    icon: '⚫',
    color: 'bg-slate-100 dark:bg-slate-800/40',
    plans: [
      { name: 'בסיסי', price: 25, data: '10GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'Partner' },
      { name: 'פלוס', price: 40, data: '40GB', minutes: 'ללא הגבלה', sms: 'ללא הגבלה', network: 'Partner', special: 'ממשיך פחות מ-40₪' },
    ],
  },
]

interface ProviderComparisonProps {
  onShareDeal?: (text: string) => void
}

export function ProviderComparison({ onShareDeal }: ProviderComparisonProps) {
  const [expanded, setExpanded] = useState(false)
  const [sortBy, setSortBy] = useState<'price' | 'data'>('price')

  const allPlans = PROVIDERS.flatMap(p =>
    p.plans.map(pl => ({ ...pl, provider: p.name, icon: p.icon, color: p.color }))
  ).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price
    // Data sort: compare as numbers (strip GB)
    const aGB = a.data === 'ללא הגבלה' ? 9999 : parseInt(a.data)
    const bGB = b.data === 'ללא הגבלה' ? 9999 : parseInt(b.data)
    return bGB - aGB
  })

  const displayed = expanded ? allPlans : allPlans.slice(0, 3)

  return (
    <div className="bg-white dark:bg-muted border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">השוואת תוכניות</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setSortBy('price')} className={cn("text-[10px] px-2 py-1 rounded-lg transition", sortBy === 'price' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
            לפי מחיר
          </button>
          <button onClick={() => setSortBy('data')} className={cn("text-[10px] px-2 py-1 rounded-lg transition", sortBy === 'data' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
            לפי נפח
          </button>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {displayed.map((plan, i) => (
          <div key={`${plan.provider}-${plan.name}`} className={cn("px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition group", plan.color)}>
            <div className="shrink-0">
              <span className="text-base">{plan.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold">{plan.provider}</span>
                <span className="text-[10px] text-muted-foreground bg-background/80 rounded px-1">{plan.name}</span>
                {plan.special && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded px-1">✨ {plan.special}</span>
                )}
              </div>
              <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                <span>📶 {plan.data}</span>
                <span>🌐 {plan.network}</span>
              </div>
            </div>
            <div className="shrink-0 text-left">
              <div className="text-sm font-bold text-primary">{plan.price}₪</div>
              <div className="text-[9px] text-muted-foreground">לחודש</div>
            </div>
            {onShareDeal && (
              <button
                onClick={() => onShareDeal(`💰 מצאתי עסקה מעולה! ${plan.provider} ${plan.name}: ${plan.data} נפח, ${plan.minutes} דקות, רק ${plan.price}₪/חודש!`)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:underline transition"
              >
                שתף
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition border-t border-border/30"
      >
        {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> הצג פחות</> : <><ChevronDown className="w-3.5 h-3.5" /> הצג עוד תוכניות</>}
      </button>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { Star, X, ShoppingBag, Check, Sparkles, Crown, Palette, Zap, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatUser } from '@/lib/chat-types'

interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  icon: React.ReactNode
  category: 'cosmetic' | 'feature' | 'badge'
  action?: string
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'rainbow_name',
    name: 'שם קשת הצבעים',
    description: 'שמך יוצג בצבעי קשת בהודעות',
    cost: 500,
    icon: <Sparkles className="w-6 h-6 text-pink-500" />,
    category: 'cosmetic',
    action: 'rainbow_name',
  },
  {
    id: 'golden_badge',
    name: 'תג זהב VIP',
    description: 'תג זהב מיוחד ליד שמך',
    cost: 1000,
    icon: <Crown className="w-6 h-6 text-amber-500" />,
    category: 'badge',
    action: 'golden_badge',
  },
  {
    id: 'custom_bubble',
    name: 'בועת הודעה מותאמת',
    description: 'בחר צבע מותאם לבועת ההודעות שלך',
    cost: 300,
    icon: <Palette className="w-6 h-6 text-purple-500" />,
    category: 'cosmetic',
    action: 'custom_bubble',
  },
  {
    id: 'slow_mode_bypass',
    name: 'עקיפת Slow Mode',
    description: 'כתוב הודעות בלי להמתין ל-Slow Mode (לשבוע)',
    cost: 200,
    icon: <Zap className="w-6 h-6 text-cyan-500" />,
    category: 'feature',
    action: 'slow_bypass',
  },
  {
    id: 'mystery_box',
    name: 'קופסת מסתורין 🎁',
    description: 'קבל פרס הפתעה — ייתכן שווי של עד 1,000 נקודות!',
    cost: 150,
    icon: <Gift className="w-6 h-6 text-green-500" />,
    category: 'feature',
    action: 'mystery',
  },
  {
    id: 'emoji_pack',
    name: 'חבילת אמוג\'י מורחבת',
    description: 'גישה ל-50 אמוג\'י נוספים לתגובות',
    cost: 400,
    icon: <span className="text-2xl">🎭</span>,
    category: 'cosmetic',
    action: 'emoji_pack',
  },
]

interface PointsShopProps {
  currentUser: ChatUser
  onClose: () => void
  onPurchase?: (item: ShopItem, newPoints: number) => void
}

export function PointsShop({ currentUser, onClose, onPurchase }: PointsShopProps) {
  const [purchased, setPurchased] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`shop_purchased_${currentUser.id}`) || '[]') } catch { return [] }
  })
  const [balance, setBalance] = useState(currentUser.points)
  const [lastPurchased, setLastPurchased] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<'all' | 'cosmetic' | 'feature' | 'badge'>('all')

  const handleBuy = (item: ShopItem) => {
    if (balance < item.cost || purchased.includes(item.id)) return
    const newBalance = balance - item.cost
    setBalance(newBalance)
    const newPurchased = [...purchased, item.id]
    setPurchased(newPurchased)
    localStorage.setItem(`shop_purchased_${currentUser.id}`, JSON.stringify(newPurchased))
    setLastPurchased(item.id)
    // Apply effects
    if (item.action === 'slow_bypass') {
      const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000
      localStorage.setItem('slow_mode_bypass_expiry', expiry.toString())
    }
    if (item.action === 'golden_badge') {
      localStorage.setItem(`golden_badge_${currentUser.id}`, '1')
    }
    onPurchase?.(item, newBalance)
    setTimeout(() => setLastPurchased(null), 2000)
  }

  const filtered = filterCat === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === filterCat)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-400/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold">חנות נקודות</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-3 py-1">
              <Star className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">{balance.toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-4 py-2.5 border-b border-border/40">
          {([
            { id: 'all', label: 'הכל' },
            { id: 'cosmetic', label: '🎨 עיצוב' },
            { id: 'feature', label: '⚡ פיצ\'רים' },
            { id: 'badge', label: '🏅 תגים' },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterCat(id)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg transition",
                filterCat === id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-3">
          {filtered.map(item => {
            const isOwned = purchased.includes(item.id)
            const canAfford = balance >= item.cost
            const justBought = lastPurchased === item.id

            return (
              <div
                key={item.id}
                className={cn(
                  "border rounded-2xl p-3.5 flex items-center gap-3 transition-all",
                  isOwned ? "border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/20" : "border-border/60 hover:border-primary/40",
                  !canAfford && !isOwned && "opacity-60"
                )}
              >
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{item.cost.toLocaleString()} נקודות</span>
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={isOwned || !canAfford}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all",
                    isOwned
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default"
                      : canAfford
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isOwned ? (
                    <><Check className="w-3.5 h-3.5" /> {justBought ? '🎉' : 'נרכש'}</>
                  ) : canAfford ? (
                    'קנה'
                  ) : (
                    'חסרות נקודות'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer tip */}
        <div className="px-4 py-3 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            כתוב הודעות מועילות, עזור לאחרים וצבור נקודות! 💡
          </p>
        </div>
      </div>
    </div>
  )
}

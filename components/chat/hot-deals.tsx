"use client"

import { useState } from 'react'
import { Flame, ThumbsUp, ThumbsDown, Plus, Zap, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { HotDeal, ChatUser } from '@/lib/chat-types'
import { formatTimeAgo, formatCurrency, PROVIDER_LIST } from '@/lib/chat-types'

interface HotDealsProps {
  deals: HotDeal[]
  currentUser: ChatUser | null
  onVote: (dealId: string, voteType: 'up' | 'down') => void
  onShare: (title: string, description: string, provider: string, savingsAmount: number) => void
}

export function HotDeals({ deals, currentUser, onVote, onShare }: HotDealsProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    provider: '',
    savingsAmount: ''
  })

  const handleSubmit = () => {
    if (formData.title.trim()) {
      onShare(
        formData.title.trim(),
        formData.description.trim(),
        formData.provider,
        parseInt(formData.savingsAmount) || 0
      )
      setFormData({ title: '', description: '', provider: '', savingsAmount: '' })
      setShowForm(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl border border-orange-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 animate-pulse">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">עסקאות חמות</h3>
              <p className="text-xs text-muted-foreground">שיתופים מהקהילה</p>
            </div>
          </div>
          {currentUser && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(!showForm)}
              className="border-orange-500/50 hover:bg-orange-500/10"
            >
              <Plus className="h-4 w-4 ml-1" />
              שתף עסקה
            </Button>
          )}
        </div>
      </div>

      {/* Share Form */}
      {showForm && (
        <div className="p-4 border-b border-border/50 bg-card/50 space-y-3">
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="כותרת העסקה (למשל: 50% הנחה על חבילת גלישה)"
            className="bg-background/50"
          />
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="פרטים נוספים (אופציונלי)"
            className="bg-background/50"
          />
          <div className="flex gap-2">
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="flex-1 bg-background/50 border border-input rounded-lg px-3 py-2 text-sm"
            >
              <option value="">בחר ספק</option>
              {PROVIDER_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Input
              type="number"
              value={formData.savingsAmount}
              onChange={(e) => setFormData({ ...formData, savingsAmount: e.target.value })}
              placeholder="חיסכון ב-₪"
              className="w-32 bg-background/50"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} size="sm" className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
              <Zap className="h-4 w-4 ml-1" />
              פרסם עסקה
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Deals List */}
      <div className="max-h-80 overflow-y-auto">
        {deals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Flame className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>אין עסקאות חמות עדיין</p>
            <p className="text-xs">היה הראשון לשתף!</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {deals.map((deal) => (
              <div key={deal.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex gap-3">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => onVote(deal.id, 'up')}
                      disabled={!currentUser}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        deal.user_voted === 'up'
                          ? "bg-green-500/20 text-green-400"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <span className={cn(
                      "font-bold text-sm",
                      deal.upvotes > 0 && "text-green-400"
                    )}>
                      {deal.upvotes}
                    </span>
                    <button
                      onClick={() => onVote(deal.id, 'down')}
                      disabled={!currentUser}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        deal.user_voted === 'down'
                          ? "bg-red-500/20 text-red-400"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Deal content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">{deal.title}</h4>
                    {deal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {deal.provider && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Tag className="h-3 w-3" />
                          {deal.provider}
                        </span>
                      )}
                      {deal.savings_amount && deal.savings_amount > 0 && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-medium">
                          חיסכון: {formatCurrency(deal.savings_amount)}
                        </span>
                      )}
                      <span className="text-muted-foreground/70">
                        {formatTimeAgo(deal.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

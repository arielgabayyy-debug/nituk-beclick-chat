"use client"

import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Trash2, X, CheckCircle, BellOff } from 'lucide-react'
import { PROVIDER_LIST } from '@/lib/chat-types'
import { cn } from '@/lib/utils'

interface PriceAlert {
  id: string
  provider: string
  targetPrice: number
  lines: number
  triggered: boolean
  createdAt: string
}

const STORAGE_KEY = 'price_alerts'

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])

  useEffect(() => {
    try { setAlerts(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch {}
  }, [])

  const addAlert = useCallback((provider: string, targetPrice: number, lines: number) => {
    setAlerts(prev => {
      const next = [...prev, { id: Date.now().toString(), provider, targetPrice, lines, triggered: false, createdAt: new Date().toISOString() }]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // Check alerts against messages containing prices
  const checkAlerts = useCallback((messageContent: string) => {
    const priceMatch = messageContent.match(/(\d+)\s*₪/)
    if (!priceMatch) return []
    const mentionedPrice = parseInt(priceMatch[1])

    const triggered: PriceAlert[] = []
    setAlerts(prev => {
      const next = prev.map(a => {
        if (!a.triggered && PROVIDER_LIST.some(p => messageContent.includes(p) && p === a.provider)) {
          if (mentionedPrice <= a.targetPrice * a.lines) {
            triggered.push(a)
            return { ...a, triggered: true }
          }
        }
        return a
      })
      if (triggered.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return triggered
  }, [])

  const activeCount = alerts.filter(a => !a.triggered).length

  return { alerts, addAlert, removeAlert, checkAlerts, activeCount }
}

interface PriceAlertsProps {
  onClose: () => void
}

export function PriceAlertsPanel({ onClose }: PriceAlertsProps) {
  const { alerts, addAlert, removeAlert } = usePriceAlerts()
  const [provider, setProvider] = useState(PROVIDER_LIST[0])
  const [targetPrice, setTargetPrice] = useState('')
  const [lines, setLines] = useState('1')
  const [showForm, setShowForm] = useState(false)

  const handleAdd = () => {
    const price = parseFloat(targetPrice)
    if (!price || price <= 0) return
    addAlert(provider, price, parseInt(lines))
    setTargetPrice(''); setLines('1'); setShowForm(false)
  }

  const active = alerts.filter(a => !a.triggered)
  const done = alerts.filter(a => a.triggered)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">התראות מחיר</h3>
            {active.length > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full font-bold">{active.length} פעיל</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(v => !v)} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> חדש</button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {showForm && (
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground">התראה חדשה</p>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full text-sm border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none bg-background">
              {PROVIDER_LIST.map(p => <option key={p}>{p}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">מחיר יעד (לקו)</label>
                <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="30" className="w-full text-sm border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none bg-background" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">מספר קווים</label>
                <input type="number" value={lines} onChange={e => setLines(e.target.value)} min="1" max="10" className="w-full text-sm border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none bg-background" />
              </div>
            </div>
            {targetPrice && (
              <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                🔔 אתרע כשמישהו ישתף {provider} ב-{targetPrice}₪ × {lines} קווים = <strong>{(parseFloat(targetPrice) * parseInt(lines)).toFixed(0)}₪</strong>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!targetPrice} className="flex-1 bg-amber-500 text-white text-sm rounded-lg py-2 hover:bg-amber-600 transition disabled:opacity-40 font-medium">הפעל התראה</button>
              <button onClick={() => setShowForm(false)} className="bg-muted text-sm rounded-lg px-3 py-2">ביטול</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {active.length === 0 && done.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <BellOff className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין התראות מחיר פעילות</p>
              <p className="text-xs text-center">צור התראה וקבל עדכון כשמישהו בקהילה ישתף עסקה שמתאימה</p>
            </div>
          ) : (
            <>
              {active.length > 0 && <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">פעיל</div>}
              {active.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition group">
                  <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.provider}</p>
                    <p className="text-xs text-muted-foreground">עד {alert.targetPrice}₪ × {alert.lines} = {alert.targetPrice * alert.lines}₪</p>
                  </div>
                  <button onClick={() => removeAlert(alert.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
              {done.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase border-t border-border/30">הופעלו</div>
                  {done.map(alert => (
                    <div key={alert.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through">{alert.provider}</p>
                        <p className="text-xs text-muted-foreground">עד {alert.targetPrice}₪ × {alert.lines}</p>
                      </div>
                      <button onClick={() => removeAlert(alert.id)} className="p-1 hover:bg-muted rounded-lg">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

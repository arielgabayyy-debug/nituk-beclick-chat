"use client"

import { useState, useEffect } from 'react'
import { Calculator, TrendingDown, Plus, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROVIDER_LIST } from '@/lib/chat-types'

interface SavingsEntry {
  id: string
  provider: string
  oldPrice: number
  newPrice: number
  lines: number
  date: string
}

const STORAGE_KEY = 'my_savings'

// Simulated community stats (would come from DB in production)
const COMMUNITY_TOTAL_SAVINGS = 284750 // ₪ total saved by community

function useSavings() {
  const [entries, setEntries] = useState<SavingsEntry[]>([])

  useEffect(() => {
    try {
      setEntries(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
    } catch {}
  }, [])

  const add = (entry: Omit<SavingsEntry, 'id' | 'date'>) => {
    const next = [
      ...entries,
      { ...entry, id: Date.now().toString(), date: new Date().toISOString() }
    ]
    setEntries(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const remove = (id: string) => {
    const next = entries.filter(e => e.id !== id)
    setEntries(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const totalMonthlySaving = entries.reduce((sum, e) => sum + (e.oldPrice - e.newPrice) * e.lines, 0)
  const totalAnnualSaving = totalMonthlySaving * 12

  return { entries, add, remove, totalMonthlySaving, totalAnnualSaving }
}

export function SavingsCalculator({ onShareSaving }: { onShareSaving?: (text: string) => void }) {
  const { entries, add, remove, totalMonthlySaving, totalAnnualSaving } = useSavings()
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [provider, setProvider] = useState(PROVIDER_LIST[0])
  const [oldPrice, setOldPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [lines, setLines] = useState('1')

  const handleAdd = () => {
    const op = parseFloat(oldPrice), np = parseFloat(newPrice), l = parseInt(lines)
    if (!op || !np || !l || op <= np) return
    add({ provider, oldPrice: op, newPrice: np, lines: l })
    setOldPrice(''); setNewPrice(''); setLines('1')
    setShowForm(false)
  }

  const monthlySave = parseFloat(oldPrice || '0') - parseFloat(newPrice || '0')
  const linesNum = parseInt(lines || '1')

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/5 transition"
      >
        <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold">מחשבון חיסכון</p>
          {totalMonthlySaving > 0 && (
            <p className="text-xs text-emerald-600 font-medium">חוסך {totalMonthlySaving.toLocaleString()}₪/חודש</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">הקהילה חסכה</p>
            <p className="text-xs font-bold text-emerald-600">{(COMMUNITY_TOTAL_SAVINGS).toLocaleString()}₪</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-emerald-400/20">
          {/* Community milestone bar */}
          <div className="px-4 py-3 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">יעד קהילה: 500,000₪</span>
              <span className="text-xs font-bold text-emerald-600">{Math.round(COMMUNITY_TOTAL_SAVINGS / 5000)}%</span>
            </div>
            <div className="h-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, COMMUNITY_TOTAL_SAVINGS / 5000)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              🏆 {(500000 - COMMUNITY_TOTAL_SAVINGS).toLocaleString()}₪ עד היעד הבא
            </p>
          </div>

          {/* My savings summary */}
          {totalMonthlySaving > 0 && (
            <div className="px-4 py-3 flex gap-3 border-t border-emerald-400/10">
              <div className="flex-1 bg-white dark:bg-muted rounded-xl p-2.5 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">לחודש</p>
                <p className="text-lg font-bold text-emerald-600">{totalMonthlySaving.toLocaleString()}₪</p>
              </div>
              <div className="flex-1 bg-white dark:bg-muted rounded-xl p-2.5 text-center shadow-sm">
                <p className="text-xs text-muted-foreground">לשנה</p>
                <p className="text-lg font-bold text-emerald-600">{totalAnnualSaving.toLocaleString()}₪</p>
              </div>
              {onShareSaving && (
                <button
                  onClick={() => onShareSaving(`💰 חסכתי ${totalMonthlySaving.toLocaleString()}₪ בחודש (${totalAnnualSaving.toLocaleString()}₪ בשנה!) הודות לקהילה הזו! 🎉`)}
                  className="flex-1 bg-emerald-500 text-white rounded-xl p-2.5 text-xs font-medium hover:bg-emerald-600 transition"
                >
                  שתף 🚀
                </button>
              )}
            </div>
          )}

          {/* Savings entries */}
          {entries.length > 0 && (
            <div className="px-4 pb-2 space-y-1.5 border-t border-emerald-400/10 pt-2">
              {entries.map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs bg-white dark:bg-muted/50 rounded-lg px-3 py-2 group">
                  <span className="font-medium">{e.provider}</span>
                  <span className="text-muted-foreground line-through">{e.oldPrice}₪</span>
                  <span className="text-emerald-600 font-bold">→ {e.newPrice}₪</span>
                  {e.lines > 1 && <span className="text-muted-foreground">×{e.lines}</span>}
                  <span className="mr-auto font-bold text-emerald-600">-{((e.oldPrice - e.newPrice) * e.lines).toFixed(0)}₪/חודש</span>
                  <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <div className="px-4 pb-3 border-t border-emerald-400/10 pt-3 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground">הוסף חיסכון</p>
              <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full text-sm border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none bg-background">
                {PROVIDER_LIST.map(p => <option key={p}>{p}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">מחיר ישן</label>
                  <input type="number" value={oldPrice} onChange={e => setOldPrice(e.target.value)} placeholder="100" className="w-full text-sm border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">מחיר חדש</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="40" className="w-full text-sm border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none bg-background" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">קווים</label>
                  <input type="number" value={lines} onChange={e => setLines(e.target.value)} min="1" max="10" className="w-full text-sm border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none bg-background" />
                </div>
              </div>
              {monthlySave > 0 && linesNum > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    ✨ חיסכון: {(monthlySave * linesNum).toFixed(0)}₪/חודש · {(monthlySave * linesNum * 12).toFixed(0)}₪/שנה
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={!oldPrice || !newPrice || parseFloat(oldPrice) <= parseFloat(newPrice)} className="flex-1 bg-emerald-500 text-white text-sm rounded-lg py-2 hover:bg-emerald-600 transition disabled:opacity-40 font-medium">הוסף</button>
                <button onClick={() => setShowForm(false)} className="bg-muted text-sm rounded-lg px-3 py-2 hover:bg-muted/80 transition">ביטול</button>
              </div>
            </div>
          )}

          {!showForm && (
            <div className="px-4 pb-3 pt-2">
              <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 transition border border-dashed border-emerald-400/40 rounded-lg py-2 hover:bg-emerald-500/5">
                <Plus className="w-3.5 h-3.5" /> הוסף חיסכון שלי
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

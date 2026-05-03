"use client"

import { useState, useEffect, useCallback } from 'react'
import { Clock, Trash2, Send, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScheduledMessage {
  id: string
  content: string
  scheduledAt: string // ISO string
  sent: boolean
}

const STORAGE_KEY = 'scheduled_messages'

export function useScheduledMessages(onSend: (content: string) => void) {
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setScheduled(JSON.parse(raw))
    } catch {}
  }, [])

  // Check every 30 seconds if any scheduled message is due
  useEffect(() => {
    const check = () => {
      const now = new Date().toISOString()
      setScheduled(prev => {
        let changed = false
        const next = prev.map(m => {
          if (!m.sent && m.scheduledAt <= now) {
            onSend(m.content)
            changed = true
            return { ...m, sent: true }
          }
          return m
        })
        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          return next
        }
        return prev
      })
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [onSend])

  const schedule = useCallback((content: string, scheduledAt: string) => {
    setScheduled(prev => {
      const next = [
        ...prev,
        { id: Date.now().toString(), content, scheduledAt, sent: false },
      ]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const cancel = useCallback((id: string) => {
    setScheduled(prev => {
      const next = prev.filter(m => m.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const pendingCount = scheduled.filter(m => !m.sent).length

  return { scheduled, schedule, cancel, pendingCount }
}

interface ScheduledMessagesProps {
  scheduled: ScheduledMessage[]
  onCancel: (id: string) => void
  onSchedule: (content: string, scheduledAt: string) => void
  currentDraft?: string
  onClose: () => void
}

export function ScheduledMessagesPanel({ scheduled, onCancel, onSchedule, currentDraft, onClose }: ScheduledMessagesProps) {
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState(currentDraft || '')
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000) // 30 min from now
    d.setSeconds(0)
    return d.toISOString().slice(0, 16)
  })

  const pending = scheduled.filter(m => !m.sent)
  const sent = scheduled.filter(m => m.sent).slice(0, 5)

  const handleSchedule = () => {
    if (!content.trim() || !date) return
    onSchedule(content.trim(), new Date(date).toISOString())
    setContent('')
    setShowForm(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">הודעות מתוזמנות</h3>
            {pending.length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" /> חדשה
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {showForm && (
          <div className="p-3 border-b border-border/40 bg-muted/20 space-y-2">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="תוכן ההודעה..."
              className="w-full text-sm bg-background border border-border/60 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[60px]"
              rows={3}
            />
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="flex-1 text-xs bg-background border border-border/60 rounded-lg px-2 py-1.5 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSchedule} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs rounded-lg py-2 hover:opacity-90 transition">
                <Clock className="w-3.5 h-3.5" /> תזמן שליחה
              </button>
              <button onClick={() => setShowForm(false)} className="bg-muted text-xs rounded-lg px-3 py-2 hover:bg-muted/80 transition">
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {pending.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <Clock className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין הודעות מתוזמנות</p>
              <button onClick={() => setShowForm(true)} className="text-xs text-primary hover:underline">תזמן הודעה ראשונה</button>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">ממתינות לשליחה</p>
                  {pending.map(m => (
                    <div key={m.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-border/20 hover:bg-muted/30 transition">
                      <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs line-clamp-2">{m.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(m.scheduledAt).toLocaleString('he-IL')}
                        </p>
                      </div>
                      <button onClick={() => onCancel(m.id)} className="p-1 hover:bg-red-50 rounded-md transition">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {sent.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">נשלחו</p>
                  {sent.map(m => (
                    <div key={m.id} className="flex items-start gap-2 px-4 py-2 opacity-50">
                      <Send className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs line-clamp-1">{m.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">נשלח</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

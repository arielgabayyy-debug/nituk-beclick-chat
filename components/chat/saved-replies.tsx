"use client"

import { useState, useEffect, useCallback } from 'react'
import { MessageSquarePlus, Trash2, X, Plus, Zap } from 'lucide-react'

const STORAGE_KEY = 'chat_saved_replies'

export interface SavedReply {
  id: string
  title: string
  content: string
  createdAt: string
}

export function useSavedReplies() {
  const [replies, setReplies] = useState<SavedReply[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setReplies(JSON.parse(raw))
    } catch {}
  }, [])

  const save = useCallback((title: string, content: string) => {
    setReplies(prev => {
      const next: SavedReply[] = [
        { id: Date.now().toString(), title, content, createdAt: new Date().toISOString() },
        ...prev,
      ].slice(0, 20) // max 20
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setReplies(prev => {
      const next = prev.filter(r => r.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { replies, save, remove }
}

interface SavedRepliesPanelProps {
  onInsert: (content: string) => void
  onClose: () => void
  currentDraft?: string
}

const DEFAULT_REPLIES: Omit<SavedReply, 'id' | 'createdAt'>[] = [
  { title: 'ברוכים הבאים', content: 'ברוכים הבאים לקהילה! 🎉 כאן תמצאו עצות, עסקאות ותמיכה מהחברים הכי טובים שיש.' },
  { title: 'שאלו אותי', content: 'אשמח לעזור! 😊 אשלח פרטים בDM או ענו פה ואני אחזור אליכם בהקדם.' },
  { title: 'עסקה מצוינת', content: '💰 עסקה מצוינת! שיתפתי את הפרטים — שווה לבדוק לפני שיגמר.' },
  { title: 'תודה לקהילה', content: '🙏 תודה ענקית לכל הקהילה! בזכותכם חסכתי המון. ממליץ לכולם!' },
]

export function SavedRepliesPanel({ onInsert, onClose, currentDraft }: SavedRepliesPanelProps) {
  const { replies, save, remove } = useSavedReplies()
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState(currentDraft || '')

  const allReplies = [
    ...replies,
    ...DEFAULT_REPLIES.map((r, i) => ({ ...r, id: `default-${i}`, createdAt: '2024-01-01' })),
  ]

  const handleSave = () => {
    if (!newTitle.trim() || !newContent.trim()) return
    save(newTitle.trim(), newContent.trim())
    setShowAdd(false)
    setNewTitle('')
    setNewContent('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">תשובות שמורות</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" /> הוסף
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="p-3 border-b border-border/40 bg-muted/30 flex flex-col gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="כותרת (למשל: ברכות, עזרה...)"
              className="text-sm bg-background border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="תוכן ההודעה..."
              className="text-sm bg-background border border-border/60 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[60px]"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground text-xs rounded-lg py-1.5 hover:opacity-90 transition font-medium">
                שמור
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-muted text-xs rounded-lg py-1.5 hover:bg-muted/80 transition">
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Replies list */}
        <div className="flex-1 overflow-y-auto">
          {allReplies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <MessageSquarePlus className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין תשובות שמורות עדיין</p>
            </div>
          ) : (
            allReplies.map(reply => (
              <button
                key={reply.id}
                className="w-full text-right p-3 hover:bg-muted/60 transition group border-b border-border/30 last:border-0"
                onClick={() => { onInsert(reply.content); onClose() }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{reply.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{reply.content}</p>
                  </div>
                  {!reply.id.startsWith('default-') && (
                    <button
                      onClick={e => { e.stopPropagation(); remove(reply.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-md transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

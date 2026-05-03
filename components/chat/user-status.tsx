"use client"

import { useState, useEffect } from 'react'
import { Smile, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STATUS_EMOJIS = ['😊', '🔥', '😴', '🎯', '🤔', '💡', '✅', '🔍', '📱', '💰', '🎉', '👀']
const STORAGE_KEY = 'user_status'

export function useUserStatus(userId: string) {
  const key = `${STORAGE_KEY}_${userId}`
  const [status, setStatus] = useState<{ emoji: string; text: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setStatus(JSON.parse(raw))
    } catch {}
  }, [key])

  const saveStatus = (emoji: string, text: string) => {
    const s = { emoji, text }
    setStatus(s)
    localStorage.setItem(key, JSON.stringify(s))
  }

  const clearStatus = () => {
    setStatus(null)
    localStorage.removeItem(key)
  }

  return { status, saveStatus, clearStatus }
}

interface UserStatusEditorProps {
  userId: string
  onClose: () => void
}

export function UserStatusEditor({ userId, onClose }: UserStatusEditorProps) {
  const { status, saveStatus, clearStatus } = useUserStatus(userId)
  const [emoji, setEmoji] = useState(status?.emoji || '😊')
  const [text, setText] = useState(status?.text || '')

  const handleSave = () => {
    if (text.trim()) saveStatus(emoji, text.trim())
    else clearStatus()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 w-full max-w-xs border border-border/40" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">הגדר סטטוס</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full"><X className="w-4 h-4" /></button>
        </div>

        {/* Current preview */}
        <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 mb-4">
          <span className="text-xl">{emoji}</span>
          <span className="text-sm text-muted-foreground flex-1">{text || 'הקלד סטטוס...'}</span>
        </div>

        {/* Emoji picker */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STATUS_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`text-xl w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-110 ${emoji === e ? 'bg-primary/15 ring-2 ring-primary/30' : 'hover:bg-muted'}`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Text input */}
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 60))}
          placeholder="מה אתה עושה? (עד 60 תווים)"
          className="w-full text-sm border border-border/50 rounded-xl px-3 py-2 focus:outline-none focus:border-primary/50 mb-4 bg-transparent"
          maxLength={60}
          dir="auto"
        />

        <div className="flex gap-2">
          {status && (
            <Button variant="outline" onClick={() => { clearStatus(); onClose() }} className="flex-1 h-9 text-sm text-destructive border-destructive/30 hover:bg-destructive/5">
              מחק סטטוס
            </Button>
          )}
          <Button onClick={handleSave} className="flex-1 h-9 text-sm">
            <Check className="w-3.5 h-3.5 mr-1" />
            שמור
          </Button>
        </div>
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  userId: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ userId, size = 'sm' }: StatusBadgeProps) {
  const { status } = useUserStatus(userId)
  if (!status) return null
  return (
    <span className={`flex items-center gap-1 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
      <span>{status.emoji}</span>
      <span className="truncate max-w-[120px]">{status.text}</span>
    </span>
  )
}

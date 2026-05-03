"use client"

import { useState, useEffect } from 'react'
import { X, Megaphone } from 'lucide-react'

const STORAGE_KEY = 'pinned_announcement'
const DISMISS_KEY = 'announcement_dismissed_v'

export function useAnnouncementBar() {
  const [text, setText] = useState('')

  const save = (msg: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: msg, version: Date.now() }))
    setText(msg)
  }
  const clear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setText('')
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        setText(data.text || '')
      }
    } catch {}
  }, [])

  return { text, save, clear }
}

interface AnnouncementBarProps {
  isAdmin: boolean
}

export function AnnouncementBar({ isAdmin }: AnnouncementBarProps) {
  const { text, save, clear } = useAnnouncementBar()
  const [dismissed, setDismissed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const dismissKey = `${DISMISS_KEY}${text.slice(0, 10)}`

  useEffect(() => {
    setDismissed(!!localStorage.getItem(dismissKey))
  }, [text, dismissKey])

  if (!text || (dismissed && !isAdmin)) return null

  if (editing && isAdmin) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
          placeholder="הודעה לכולם..."
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') { save(draft); setEditing(false) }
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <button onClick={() => { save(draft); setEditing(false) }} className="text-xs text-amber-600 font-medium hover:text-amber-700">שמור</button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground">ביטול</button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-400/20 px-4 py-2.5 flex items-center gap-3">
      <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />
      <p className="flex-1 text-sm text-foreground font-medium">{text}</p>
      {isAdmin && (
        <button onClick={() => { setDraft(text); setEditing(true) }} className="text-[10px] text-amber-600 hover:underline shrink-0">ערוך</button>
      )}
      {isAdmin && (
        <button onClick={clear} className="text-[10px] text-red-500 hover:underline shrink-0">הסר</button>
      )}
      {!isAdmin && (
        <button
          onClick={() => { localStorage.setItem(dismissKey, '1'); setDismissed(true) }}
          className="shrink-0 hover:bg-amber-500/10 rounded-full p-0.5 transition"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { Zap, Plus, Trash2, X, GripVertical, Save } from 'lucide-react'

const STORAGE_KEY = 'speed_dial_custom'

const DEFAULT_DIALS = [
  'מישהו יכול לעזור?',
  'תודה לכולם! 🙏',
  'שאלה קצרה —',
  'מצאתי עסקה מעולה!',
  'מעניין מאוד!',
]

export function useSpeedDials() {
  const [dials, setDials] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : DEFAULT_DIALS
    } catch { return DEFAULT_DIALS }
  })

  const save = (newDials: string[]) => {
    setDials(newDials)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDials))
  }

  return { dials, save }
}

interface SpeedDialEditorProps {
  onClose: () => void
}

export function SpeedDialEditor({ onClose }: SpeedDialEditorProps) {
  const { dials, save } = useSpeedDials()
  const [editing, setEditing] = useState([...dials])
  const [newDial, setNewDial] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)

  const handleAdd = () => {
    if (!newDial.trim()) return
    setEditing(prev => [...prev, newDial.trim()])
    setNewDial('')
  }

  const handleRemove = (i: number) => {
    setEditing(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleChange = (i: number, val: string) => {
    setEditing(prev => prev.map((d, idx) => idx === i ? val : d))
  }

  const handleSave = () => {
    save(editing.filter(d => d.trim()))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">עריכת חיוג מהיר</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {editing.map((dial, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-40 shrink-0" />
              <input
                type="text"
                value={dial}
                onChange={e => handleChange(i, e.target.value)}
                className="flex-1 text-sm bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => handleRemove(i)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}

          {/* Add new */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newDial}
              onChange={e => setNewDial(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="הוסף הודעה מהירה..."
              className="flex-1 text-sm bg-background border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleAdd}
              className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-border/40 flex gap-2">
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm rounded-xl py-2 hover:opacity-90 transition font-medium">
            <Save className="w-4 h-4" /> שמור
          </button>
          <button onClick={onClose} className="bg-muted text-sm rounded-xl px-4 py-2 hover:bg-muted/80 transition">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

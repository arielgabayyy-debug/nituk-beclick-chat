"use client"

import { useState } from 'react'
import { Flag, X, Send } from 'lucide-react'

const REPORT_REASONS = [
  'תוכן פוגעני',
  'ספאם',
  'הטרדה',
  'מידע שקרי',
  'פרסום לא רצוי',
  'אחר',
]

interface ReportDialogProps {
  messageContent: string
  userName: string
  onSubmit: (reason: string) => void
  onClose: () => void
}

export function ReportDialog({ messageContent, userName, onSubmit, onClose }: ReportDialogProps) {
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (!selected) return
    onSubmit(`${selected}${note ? `: ${note}` : ''}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border/40 p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-red-500">
            <Flag className="w-5 h-5" />
            <h3 className="font-bold text-sm text-foreground">דווח על הודעה</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview */}
        <div className="bg-muted/40 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">{userName}:</p>
          <p className="text-xs line-clamp-3 text-foreground">{messageContent}</p>
        </div>

        {/* Reasons */}
        <div className="space-y-2 mb-3">
          {REPORT_REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className={`w-full text-right text-sm px-3 py-2 rounded-xl border transition-all ${
                selected === reason
                  ? 'border-red-400/50 bg-red-500/10 text-red-600 dark:text-red-400 font-medium'
                  : 'border-border/30 hover:border-border/60 hover:bg-muted/50'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Optional note */}
        {selected === 'אחר' && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="הוסף פירוט..."
            className="w-full text-sm border border-border/50 rounded-xl px-3 py-2 focus:outline-none focus:border-primary/50 mb-3 bg-transparent resize-none h-16"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2 text-sm font-medium transition disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          שלח דיווח
        </button>
      </div>
    </div>
  )
}

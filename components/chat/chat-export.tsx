"use client"

import { useState } from 'react'
import { Download, X, FileText, FileJson, Check } from 'lucide-react'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatTime } from '@/lib/chat-types'

interface ChatExportProps {
  messages: ChatMessage[]
  currentUser: ChatUser
  onClose: () => void
}

export function ChatExport({ messages, currentUser, onClose }: ChatExportProps) {
  const [format, setFormat] = useState<'txt' | 'json' | 'html'>('txt')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week'>('all')
  const [done, setDone] = useState(false)

  const filterMessages = () => {
    const now = new Date()
    return messages.filter(m => {
      if (dateRange === 'today') {
        const d = new Date(m.created_at)
        return d.toDateString() === now.toDateString()
      }
      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return new Date(m.created_at) >= weekAgo
      }
      return true
    })
  }

  const exportAsText = (msgs: ChatMessage[]) => {
    const lines = [
      '=== ייצוא שיחה — חיבור וניתוק בקליק ===',
      `תאריך ייצוא: ${new Date().toLocaleString('he-IL')}`,
      `מספר הודעות: ${msgs.length}`,
      '============================================',
      '',
      ...msgs.map(m => {
        const name = m.user?.name || 'משתמש'
        const time = formatTime(m.created_at)
        const content = m.has_gif ? '[GIF]' : m.content.startsWith('[voice:') ? '[הודעת קול]' : m.content
        return `[${time}] ${name}: ${content}`
      })
    ]
    return lines.join('\n')
  }

  const exportAsHtml = (msgs: ChatMessage[]) => {
    const rows = msgs.map(m => {
      const name = m.user?.name || 'משתמש'
      const time = new Date(m.created_at).toLocaleString('he-IL')
      const content = m.has_gif ? '[GIF]' : m.content.startsWith('[voice:') ? '[הודעת קול]' : m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const isOwn = m.user_id === currentUser.id
      return `<div style="margin:8px;padding:8px;border-radius:8px;background:${isOwn ? '#e0f2fe' : '#f8f8f8'};max-width:80%;${isOwn ? 'margin-right:auto;' : ''}">
        <strong style="font-size:12px;color:#666">${name}</strong> <span style="font-size:11px;color:#999">${time}</span>
        <p style="margin:4px 0;font-size:14px">${content}</p>
      </div>`
    })
    return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ייצוא שיחה</title></head>
<body style="font-family:Arial,sans-serif;padding:16px;">
<h2>ייצוא שיחה — חיבור וניתוק בקליק</h2>
<p style="color:#666">${msgs.length} הודעות | ${new Date().toLocaleString('he-IL')}</p>
${rows.join('\n')}
</body></html>`
  }

  const handleExport = () => {
    const msgs = filterMessages()
    let content = ''
    let filename = `chat-export-${new Date().toISOString().slice(0, 10)}`
    let mimeType = 'text/plain'

    if (format === 'txt') {
      content = exportAsText(msgs)
      filename += '.txt'
    } else if (format === 'json') {
      content = JSON.stringify(msgs.map(m => ({
        id: m.id,
        user: m.user?.name,
        content: m.content,
        created_at: m.created_at,
        reactions: (m.reactions || []).map(r => r.emoji),
      })), null, 2)
      filename += '.json'
      mimeType = 'application/json'
    } else {
      content = exportAsHtml(msgs)
      filename += '.html'
      mimeType = 'text/html'
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setDone(true)
    setTimeout(() => { setDone(false); onClose() }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">ייצוא שיחה</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Format */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">פורמט</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'txt', label: 'טקסט', icon: FileText },
              { id: 'json', label: 'JSON', icon: FileJson },
              { id: 'html', label: 'HTML', icon: FileText },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-all ${
                  format === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 hover:border-primary/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground mb-2 font-medium">טווח תאריכים</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'all', label: 'הכל' },
              { id: 'week', label: 'שבוע אחרון' },
              { id: 'today', label: 'היום' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setDateRange(id)}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  dateRange === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {filterMessages().length} הודעות יוצאו
        </p>

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 font-medium hover:opacity-90 transition"
        >
          {done ? <><Check className="w-4 h-4" /> הורד!</> : <><Download className="w-4 h-4" /> ייצא</>}
        </button>
      </div>
    </div>
  )
}

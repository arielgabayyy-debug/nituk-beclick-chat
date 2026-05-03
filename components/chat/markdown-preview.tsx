"use client"

import { X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

// Simple inline markdown render (mirrors the chat-message renderer logic)
function renderPreview(content: string): React.ReactNode {
  if (!content.trim()) return <span className="text-muted-foreground italic">תצוגה מקדימה ריקה</span>

  const lines = content.split('\n')
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (/^#{1,3}\s/.test(line)) {
          const level = line.match(/^(#{1,3})/)?.[1].length || 1
          const text = line.replace(/^#{1,3}\s/, '')
          const cls = level === 1 ? 'text-base font-bold' : 'text-sm font-semibold'
          return <p key={i} className={cls}>{renderInline(text)}</p>
        }
        if (/^[-*]\s/.test(line)) {
          return <div key={i} className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" /><span>{renderInline(line.replace(/^[-*]\s/, ''))}</span></div>
        }
        if (/^>\s/.test(line)) {
          return <div key={i} className="border-r-2 border-current opacity-70 pr-2 italic text-xs">{renderInline(line.replace(/^>\s/, ''))}</div>
        }
        if (/^-{3,}$/.test(line.trim())) {
          return <hr key={i} className="border-border/40 my-1" />
        }
        return <span key={i} className="block">{renderInline(line) || <br />}</span>
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(_(.+?)_)|(`([^`]+)`)|(@\S+)/g
  let last = 0, m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) parts.push(<strong key={m.index}>{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={m.index}>{m[4]}</em>)
    else if (m[5]) parts.push(<code key={m.index} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{m[6]}</code>)
    else if (m[0].startsWith('@')) parts.push(<span key={m.index} className="text-primary font-semibold">{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? <>{parts}</> : text
}

interface MarkdownPreviewProps {
  content: string
  isOwn?: boolean
  onClose: () => void
}

export function MarkdownPreview({ content, isOwn, onClose }: MarkdownPreviewProps) {
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="w-3.5 h-3.5" />
          תצוגה מקדימה
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded transition">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <div className={cn(
        "px-4 py-3 max-h-32 overflow-y-auto",
        isOwn
          ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white"
          : "bg-white dark:bg-muted"
      )}>
        {renderPreview(content)}
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { ImageDown, Check, Loader2 } from 'lucide-react'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatTime } from '@/lib/chat-types'

interface CopyAsImageProps {
  message: ChatMessage
  currentUser?: ChatUser
}

export function CopyAsImage({ message, currentUser }: CopyAsImageProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const generate = async () => {
    setState('loading')
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { setState('idle'); return }

      const content = message.has_gif ? '🖼️ GIF'
        : message.content.startsWith('[voice:') ? '🎤 הודעת קול'
        : message.content.startsWith('[video:') ? '🎥 הודעת וידאו'
        : message.content.slice(0, 300)

      const userName = message.user?.name || 'משתמש'
      const time = formatTime(message.created_at)

      // Measure text
      canvas.width = 600
      ctx.font = '16px Arial'
      const lines = wrapText(ctx, content, 500)
      canvas.height = 100 + lines.length * 24

      // Background
      const bg = ctx.createLinearGradient(0, 0, 600, canvas.height)
      bg.addColorStop(0, '#f0f9ff')
      bg.addColorStop(1, '#f5f3ff')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Bubble
      ctx.fillStyle = message.user_id === currentUser?.id ? '#06b6d4' : '#ffffff'
      const bubbleX = 16, bubbleY = 44, bubbleW = 568, bubbleH = 24 + lines.length * 24
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 16)
      ctx.fill()

      // Watermark + branding
      ctx.fillStyle = '#94a3b8'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('חיבור וניתוק בקליק 🔗 community chat', 300, 24)

      // User name + time
      ctx.fillStyle = message.user_id === currentUser?.id ? 'rgba(255,255,255,0.8)' : '#64748b'
      ctx.font = 'bold 13px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(`${userName} · ${time}`, 568, 70)

      // Message content
      ctx.fillStyle = message.user_id === currentUser?.id ? '#ffffff' : '#1e293b'
      ctx.font = '15px Arial'
      ctx.textAlign = 'right'
      lines.forEach((line, i) => {
        ctx.fillText(line, 568, 94 + i * 24)
      })

      // Download
      const a = document.createElement('a')
      a.download = `message-${message.id.slice(0, 8)}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()

      setState('done')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
    }
  }

  return (
    <button
      onClick={generate}
      disabled={state === 'loading'}
      className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-all"
      title="הורד הודעה כתמונה"
    >
      {state === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        : state === 'done' ? <Check className="w-3.5 h-3.5 text-emerald-500" />
        : <ImageDown className="w-3.5 h-3.5 text-muted-foreground" />
      }
    </button>
  )
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 8) // max 8 lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

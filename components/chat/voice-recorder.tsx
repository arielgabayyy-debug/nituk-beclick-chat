"use client"

// ── Voice Recorder ─────────────────────────────────────────────────────────
// Uses native file picker on ALL devices — no browser permission dialog needed.
// On mobile: opens the phone's built-in voice recorder app directly.
// On desktop: opens file browser to pick an existing audio file.

import { useState, useRef } from 'react'
import { Mic, Send, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number) => void
  disabled?: boolean
}

export function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Open native file picker — works on all devices without any permission dialog
  const openPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAudioBlob(file)
    setAudioUrl(url)
    // Get duration from metadata
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration))
      }
    }
  }

  const cancel = () => {
    setAudioUrl(null)
    setAudioBlob(null)
    setDuration(0)
  }

  const send = async () => {
    if (!audioBlob) return
    setUploading(true)
    try {
      const type = audioBlob.type || ''
      const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a'
        : type.includes('ogg') ? 'ogg'
        : type.includes('webm') ? 'webm'
        : 'audio'
      const fd = new FormData()
      fd.append('file', audioBlob, `voice.${ext}`)
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'שגיאה בהעלאה'); return }
      onSend(data.url, duration)
      cancel()
    } catch {
      alert('שגיאה בשליחה, נסה שוב.')
    } finally {
      setUploading(false)
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Preview state — after file picked
  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border/50">
        <audio src={audioUrl} controls className="h-8 flex-1" style={{ minWidth: 120 }} />
        {duration > 0 && <span className="text-xs text-muted-foreground shrink-0">{fmt(duration)}</span>}
        <button
          onClick={send}
          disabled={uploading}
          className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition shrink-0 touch-manipulation"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={cancel}
          className="p-1.5 hover:bg-muted rounded-full transition shrink-0 touch-manipulation"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    )
  }

  // Idle state
  return (
    <>
      {/* accept="audio/*" + capture="user" → opens phone's voice recorder on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,audio/mp4,audio/m4a,.m4a,.mp3,.aac,.wav,.ogg"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all",
          "hover:bg-red-50 hover:text-red-500 active:bg-red-100 active:scale-95 text-muted-foreground",
          "touch-manipulation select-none",
          disabled && "opacity-50 pointer-events-none"
        )}
        title="הקלט הודעה קולית"
        aria-label="הקלט הודעה קולית"
      >
        <Mic className="w-5 h-5" />
      </button>
    </>
  )
}

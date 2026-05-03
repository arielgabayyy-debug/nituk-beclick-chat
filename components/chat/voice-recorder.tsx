"use client"

import { useState, useRef, useEffect } from 'react'
import { Mic, Send, X, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number) => void
  disabled?: boolean
}

export function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start(100)
      setRecording(true)
      setDuration(0)
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 200)
    } catch {
      alert('לא ניתן לגשת למיקרופון')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const cancelRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const sendVoice = async () => {
    if (!audioBlob) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', audioBlob, 'voice.webm')
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'שגיאה'); return }
      onSend(`[voice:${data.url}:${duration}]`, duration)
      setAudioBlob(null); setAudioUrl(null); setDuration(0)
    } catch { alert('שגיאה בשליחה') }
    finally { setUploading(false) }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Preview mode
  if (audioUrl && !recording) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border/50">
        <audio src={audioUrl} controls className="h-8 flex-1" style={{ minWidth: 160 }} />
        <span className="text-xs text-muted-foreground">{fmt(duration)}</span>
        <button onClick={sendVoice} disabled={uploading} className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition">
          <Send className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancelRecording} className="p-1.5 hover:bg-muted rounded-full transition">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    )
  }

  // Recording mode
  if (recording) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 border border-red-200 dark:border-red-800">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-mono text-red-600 dark:text-red-400 min-w-[40px]">{fmt(duration)}</span>
        <div className="flex-1 flex items-center gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
          <Square className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancelRecording} className="p-1.5 hover:bg-red-100 rounded-full transition text-red-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onMouseDown={startRecording}
      onTouchStart={e => { e.preventDefault(); startRecording() }}
      disabled={disabled}
      className={cn("p-2.5 rounded-xl transition-all hover:bg-red-50 hover:text-red-500 text-muted-foreground", disabled && "opacity-50")}
      title="החזק להקלטת הודעה קולית"
      aria-label="הקלט הודעה קולית"
    >
      <Mic className="w-5 h-5" />
    </button>
  )
}

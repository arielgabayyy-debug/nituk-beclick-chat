"use client"

import { useState, useRef, useEffect } from 'react'
import { Mic, Send, X, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number) => void
  disabled?: boolean
}

const BAR_COUNT = 24

// Detect iOS synchronously (needed before any async call)
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as typeof window & { MSStream?: unknown }).MSStream
}

// Detect if we're inside an iframe
function isInIframe(): boolean {
  try { return window !== window.top } catch { return true }
}

export function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4))
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const getSupportedMimeType = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', '']
    for (const type of candidates) {
      if (!type) return ''
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }

  // ── Native file input (iOS / iframe fallback) ───────────────────────────
  const openNativeFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleNativeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAudioBlob(file)
    setAudioUrl(url)
    // Get real duration from audio metadata
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration))
      }
    }
  }

  // ── Main entry point (called synchronously from onClick) ────────────────
  const handleMicClick = () => {
    const ios = isIOS()
    const iframe = isInIframe()

    if (iframe && !ios) {
      // Desktop inside iframe → mic blocked by browser policy.
      // Open the chat standalone in a new tab where mic works freely.
      const win = window.open('https://nituk-beclick-chat.vercel.app', '_blank', 'noopener,noreferrer')
      if (!win) {
        alert('אנא אפשר חלונות קופצים בדפדפן שלך, ואז לחץ שוב על המיקרופון.')
      }
      return
    }

    if (ios) {
      // iOS (iframe or standalone) → native file picker (sync, user-gesture safe)
      openNativeFilePicker()
      return
    }

    // Desktop standalone → getUserMedia flow
    startGetUserMedia()
  }

  // ── getUserMedia recording (desktop/Android) ────────────────────────────
  const startGetUserMedia = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      openNativeFilePicker()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioCtx = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        audioCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        analyserRef.current = analyser

        const drawBars = () => {
          const data = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(data)
          setBars(Array.from({ length: BAR_COUNT }, (_, i) => {
            const idx = Math.floor(i * data.length / BAR_COUNT)
            return Math.max(3, Math.round((data[idx] / 255) * 28))
          }))
          animFrameRef.current = requestAnimationFrame(drawBars)
        }
        drawBars()
      }

      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      const actualMime = mediaRecorder.mimeType || 'audio/webm'

      mediaRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMime })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        audioCtxRef.current?.close().catch(() => {})
        audioCtxRef.current = null
        setBars(Array(BAR_COUNT).fill(4))
      }
      mediaRecorder.start(100)
      setRecording(true)
      setDuration(0)
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(
        () => setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)),
        200
      )
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        alert('לא נמצא מיקרופון במכשיר זה.')
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        alert('המיקרופון תפוס על ידי אפליקציה אחרת. סגור אותה ונסה שוב.')
      } else {
        // Permission denied or any other error — no alert, no fallback on desktop
        alert('לא ניתן לגשת למיקרופון. ודא שהדפדפן קיבל הרשאה.')
      }
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const cancelRecording = () => {
    mediaRef.current?.stop()
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setBars(Array(BAR_COUNT).fill(4))
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const sendVoice = async () => {
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
      onSend(`[voice:${data.url}:${duration}]`, duration)
      setAudioBlob(null)
      setAudioUrl(null)
      setDuration(0)
    } catch {
      alert('שגיאה בשליחה, נסה שוב.')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    audioCtxRef.current?.close().catch(() => {})
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Preview ───────────────────────────────────────────────────────────
  if (audioUrl && !recording) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border/50">
        <audio src={audioUrl} controls className="h-8 flex-1" style={{ minWidth: 140 }} />
        {duration > 0 && <span className="text-xs text-muted-foreground shrink-0">{fmt(duration)}</span>}
        <button onClick={sendVoice} disabled={uploading}
          className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition shrink-0">
          <Send className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancelRecording} className="p-1.5 hover:bg-muted rounded-full transition shrink-0">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    )
  }

  // ── Recording ─────────────────────────────────────────────────────────
  if (recording) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 border border-red-200 dark:border-red-800">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-mono text-red-600 dark:text-red-400 min-w-[40px]">{fmt(duration)}</span>
        <div className="flex-1 flex items-end justify-center gap-0.5 h-8">
          {bars.map((h, i) => (
            <div key={i} className="w-1 bg-red-400 rounded-full transition-all duration-75" style={{ height: `${h}px` }} />
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

  // Detect iframe at render time (for badge + tooltip)
  const inIframe = typeof window !== 'undefined' && isInIframe()
  const desktopIframe = inIframe && !isIOS()

  // ── Idle ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden file input — iOS native audio recorder */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,audio/mp4,audio/m4a,.m4a,.mp4,.aac,.wav"
        className="hidden"
        onChange={handleNativeFile}
      />
      <div className="relative group/mic">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={disabled}
          className={cn(
            "p-2.5 rounded-xl transition-all hover:bg-red-50 hover:text-red-500 text-muted-foreground",
            disabled && "opacity-50"
          )}
          title={desktopIframe ? "לחץ לפתיחת הצ'אט בחלון חדש עם מיקרופון" : "הקלט הודעה קולית"}
          aria-label="הקלט הודעה קולית"
        >
          <Mic className="w-5 h-5" />
          {desktopIframe && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-background" />
          )}
        </button>
        {desktopIframe && (
          <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 opacity-0 group-hover/mic:opacity-100 transition-opacity pointer-events-none z-50 text-right leading-relaxed shadow-xl">
            🎙️ לחץ לפתיחה בחלון חדש — שם ההקלטה עובדת מלאה
          </div>
        )}
      </div>
    </>
  )
}

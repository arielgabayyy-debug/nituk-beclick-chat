"use client"

import { useState, useRef, useEffect } from 'react'
import { Video, Square, Send, X, Play, Pause, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_DURATION = 15 // seconds

interface VideoRecorderProps {
  onSend: (videoUrl: string, duration: number, thumbnail?: string) => void
  disabled?: boolean
}

export function VideoRecorder({ onSend, disabled }: VideoRecorderProps) {
  const [phase, setPhase] = useState<'idle' | 'preview' | 'recording' | 'review' | 'uploading'>('idle')
  const [duration, setDuration] = useState(0)
  const [playback, setPlayback] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const getSupportedVideoMime = (): string => {
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4', '']
    for (const type of candidates) {
      if (!type) return ''
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('הדפדפן שלך אינו תומך בהקלטת וידאו.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: true })
      streamRef.current = stream
      if (previewRef.current) {
        previewRef.current.srcObject = stream
        previewRef.current.play()
      }
      setPhase('preview')
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        alert('אנא אשר גישה למצלמה ומיקרופון בהגדרות הדפדפן.')
      } else {
        alert('לא ניתן לגשת למצלמה. ודא שהמכשיר שלך מחובר ומאושר.')
      }
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    const mimeType = getSupportedVideoMime()
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {})
    mediaRef.current = mr
    chunksRef.current = []
    const actualMime = mr.mimeType || 'video/webm'
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: actualMime })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      if (videoRef.current) {
        videoRef.current.src = url
        videoRef.current.load()
      }
      stopStream()
      setPhase('review')
    }
    mr.start(100)
    setPhase('recording')
    setDuration(0)
    timerRef.current = setInterval(() => {
      setDuration(d => {
        if (d >= MAX_DURATION - 1) { stopRecording(); return MAX_DURATION }
        return d + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const cancel = () => {
    stopStream()
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
    blobRef.current = null
    setPhase('idle')
    setDuration(0)
    setPlayback(false)
  }

  const handleSend = async () => {
    if (!blobRef.current) return
    setPhase('uploading')
    try {
      const fd = new FormData()
      fd.append('file', blobRef.current, 'video.webm')
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd }) // reuse audio upload endpoint
      const data = await res.json() as { url: string }
      if (!res.ok) { alert('שגיאה בהעלאה'); setPhase('review'); return }
      onSend(`[video:${data.url}:${duration}]`, duration)
      cancel()
    } catch {
      alert('שגיאה')
      setPhase('review')
    }
  }

  useEffect(() => () => { stopStream(); if (timerRef.current) clearInterval(timerRef.current) }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={startCamera}
        disabled={disabled}
        className={cn("p-2.5 rounded-xl transition-all hover:bg-purple-50 hover:text-purple-500 text-muted-foreground", disabled && "opacity-50")}
        title="הקלטת וידאו קצר (15 שניות)"
      >
        <Video className="w-5 h-5" />
      </button>
    )
  }

  if (phase === 'review') {
    return (
      <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 border border-purple-200 dark:border-purple-800 min-w-[280px]">
        <video ref={videoRef} className="h-14 w-20 rounded-lg object-cover shrink-0" playsInline muted={false}
          onEnded={() => setPlayback(false)} />
        <div className="flex-1">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300">וידאו {fmt(duration)}</p>
          <button
            onClick={() => {
              if (!videoRef.current) return
              if (playback) { videoRef.current.pause(); setPlayback(false) }
              else { videoRef.current.play(); setPlayback(true) }
            }}
            className="text-[10px] text-purple-600 hover:underline flex items-center gap-1"
          >
            {playback ? <><Pause className="w-3 h-3" /> השהה</> : <><Play className="w-3 h-3" /> נגן</>}
          </button>
        </div>
        <button onClick={handleSend} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition">
          <Send className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-2 hover:bg-purple-100 rounded-full transition text-purple-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  if (phase === 'uploading') {
    return (
      <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2 border border-purple-200">
        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
        <span className="text-xs text-purple-600">מעלה וידאו...</span>
      </div>
    )
  }

  // preview + recording phases
  return (
    <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 border border-purple-200 dark:border-purple-800">
      <video ref={previewRef} className="h-12 w-16 rounded-lg object-cover bg-black shrink-0 mirror" playsInline muted style={{ transform: 'scaleX(-1)' }} />
      {phase === 'recording' && (
        <>
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
          <span className="text-sm font-mono text-red-600 min-w-[40px]">{fmt(duration)}</span>
          <div className="flex-1 h-1.5 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(duration / MAX_DURATION) * 100}%` }} />
          </div>
        </>
      )}
      {phase === 'preview' && <span className="text-xs text-purple-600 flex-1">לחץ ● להתחיל</span>}
      {phase === 'recording' ? (
        <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
          <Square className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button onClick={startRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
          <div className="w-3.5 h-3.5 bg-white rounded-full" />
        </button>
      )}
      <button onClick={cancel} className="p-1.5 hover:bg-purple-100 rounded-full transition text-purple-400">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

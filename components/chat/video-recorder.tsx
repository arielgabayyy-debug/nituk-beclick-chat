"use client"

import { useState, useRef, useEffect } from 'react'
import { Video, Square, Send, X, Play, Pause, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_DURATION = 15

interface VideoRecorderProps {
  onSend: (content: string) => void
  disabled?: boolean
}

// ── Device detection (same pattern as voice-recorder) ─────────────────────
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

// ── Permission check helper ────────────────────────────────────────────────
async function checkPermission(kind: 'microphone' | 'camera'): Promise<PermissionState | 'unknown'> {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const result = await navigator.permissions.query({ name: kind as PermissionName })
    return result.state
  } catch {
    return 'unknown'
  }
}

export function VideoRecorder({ onSend, disabled }: VideoRecorderProps) {
  const [phase, setPhase] = useState<'idle' | 'preview' | 'recording' | 'review' | 'uploading'>('idle')
  const [duration, setDuration] = useState(0)
  const [playback, setPlayback] = useState(false)
  const [permError, setPermError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getSupportedVideoMime = (): string => {
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4', '']
    for (const type of candidates) {
      if (!type) return ''
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }

  // ── Native file picker (mobile fallback) ───────────────────────────────
  const openNativeFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleNativeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhase('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd })
      const data = await res.json() as { url: string }
      if (!res.ok) { alert(data.url || 'שגיאה בהעלאה'); setPhase('idle'); return }
      // Estimate duration
      const url = URL.createObjectURL(file)
      const vid = document.createElement('video')
      vid.src = url
      vid.onloadedmetadata = () => {
        const dur = isFinite(vid.duration) ? Math.round(vid.duration) : 0
        onSend(`[video:${data.url}:${dur}]`)
        setPhase('idle')
      }
      vid.onerror = () => {
        onSend(`[video:${data.url}:0]`)
        setPhase('idle')
      }
    } catch {
      alert('שגיאה בהעלאה, נסה שוב.')
      setPhase('idle')
    }
  }

  // ── Start camera — always use native picker (no permission dialog) ─────
  const startCamera = () => {
    setPermError(null)
    openNativeFilePicker()
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
      if (videoRef.current) { videoRef.current.src = url; videoRef.current.load() }
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
    setPermError(null)
  }

  const handleSend = async () => {
    if (!blobRef.current) return
    setPhase('uploading')
    try {
      const fd = new FormData()
      fd.append('file', blobRef.current, 'video.webm')
      const res = await fetch('/api/upload-audio', { method: 'POST', body: fd })
      const data = await res.json() as { url: string }
      if (!res.ok) { alert('שגיאה בהעלאה'); setPhase('review'); return }
      onSend(`[video:${data.url}:${duration}]`)
      cancel()
    } catch {
      alert('שגיאה')
      setPhase('review')
    }
  }

  useEffect(() => () => {
    stopStream()
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Idle ──────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <>
        {/* Hidden file input for mobile / fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,video/mp4,video/webm,.mp4,.webm,.mov,.avi"
          capture="user"
          className="hidden"
          onChange={handleNativeFile}
        />
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={startCamera}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all",
              "hover:bg-purple-50 hover:text-purple-500 active:bg-purple-100 active:scale-95 text-muted-foreground",
              "touch-manipulation select-none",
              disabled && "opacity-50 pointer-events-none"
            )}
            title="הקלטת וידאו קצר (15 שניות)"
            aria-label="הקלטת וידאו קצר"
          >
            <Video className="w-5 h-5" />
          </button>
          {permError && (
            <p className="text-[10px] text-destructive text-center max-w-[120px] leading-tight">{permError}</p>
          )}
        </div>
      </>
    )
  }

  if (phase === 'review') {
    return (
      <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 border border-purple-200 dark:border-purple-800 min-w-[280px]">
        <video ref={videoRef} className="h-14 w-20 rounded-lg object-cover shrink-0" playsInline
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
        <button onClick={handleSend} className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition touch-manipulation">
          <Send className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-2 hover:bg-purple-100 rounded-full transition text-purple-400 touch-manipulation">
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

  // preview + recording
  return (
    <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2 border border-purple-200 dark:border-purple-800">
      <video ref={previewRef} className="h-12 w-16 rounded-lg object-cover bg-black shrink-0" playsInline muted
        style={{ transform: 'scaleX(-1)' }} />
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
        <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition touch-manipulation">
          <Square className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button onClick={startRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition touch-manipulation">
          <div className="w-3.5 h-3.5 bg-white rounded-full" />
        </button>
      )}
      <button onClick={cancel} className="p-1.5 hover:bg-purple-100 rounded-full transition text-purple-400 touch-manipulation">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

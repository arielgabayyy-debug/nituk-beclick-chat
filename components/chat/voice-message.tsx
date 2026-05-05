"use client"

import { useState, useRef, useCallback } from 'react'
import { Play, Pause, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface VoiceMessageProps {
  url: string
  duration: number
  isOwn: boolean
}

const SPEEDS = [1, 1.5, 2, 0.75] as const
type Speed = typeof SPEEDS[number]

// Fetch a signed URL from our API when the direct URL fails
async function getSignedUrl(originalUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/signed-media?url=${encodeURIComponent(originalUrl)}`)
    if (!res.ok) return null
    const data = await res.json() as { signedUrl?: string }
    return data.signedUrl ?? null
  } catch {
    return null
  }
}

export function VoiceMessage({ url, duration, isOwn }: VoiceMessageProps) {
  const [playing, setPlaying]       = useState(false)
  const [progress, setProgress]     = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed]           = useState<Speed>(1)
  const [loadState, setLoadState]   = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [activeSrc, setActiveSrc]   = useState(url)
  const audioRef = useRef<HTMLAudioElement>(null)
  const retried   = useRef(false)

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  // ── Playback ──────────────────────────────────────────────────
  const toggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    // Only call load() when recovering from an error (resets the element).
    // On first play (idle), preload="metadata" has already buffered enough data,
    // so calling load() would reset the buffer and guarantee a play() rejection on iOS.
    if (loadState === 'error') {
      setLoadState('loading')
      audio.load()
    } else if (loadState === 'idle') {
      setLoadState('loading')
      // Don't call audio.load() — preload="metadata" already ran it automatically.
      // Re-applying load() here resets the internal buffer and causes NotSupportedError
      // on iOS Safari when play() is called in the same microtask.
    }

    try {
      await audio.play()
      setPlaying(true)
      setLoadState('ready')
    } catch (err) {
      // play() can be rejected on iOS if audio hasn't buffered yet (NotAllowedError
      // or NotSupportedError). Surface the error so the user can retry rather than
      // showing a spinner forever.
      console.warn('audio.play() rejected:', err)
      setPlaying(false)
      setLoadState('error')
    }
  }, [playing, loadState])

  // ── Error handling with signed URL fallback ───────────────────
  const handleError = useCallback(async () => {
    setPlaying(false)

    if (!retried.current) {
      retried.current = true
      setLoadState('loading')

      const signed = await getSignedUrl(activeSrc)
      if (signed && signed !== activeSrc) {
        // Swap to signed URL and retry
        setActiveSrc(signed)
        // The <audio> will re-render with new src and attempt to load
        setLoadState('idle')
        return
      }
    }

    setLoadState('error')
  }, [activeSrc])

  const handleRetry = useCallback(() => {
    retried.current = false
    setActiveSrc(url)
    setLoadState('idle')
    setProgress(0)
    setCurrentTime(0)
  }, [url])

  // ── Speed cycle ───────────────────────────────────────────────
  const cycleSpeed = () => {
    const idx  = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  // ── Seek ──────────────────────────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect   = e.currentTarget.getBoundingClientRect()
    const pct    = (e.clientX - rect.left) / rect.width
    const newTime = pct * (audio.duration || 0)
    audio.currentTime = newTime
    setCurrentTime(newTime)
    setProgress(pct * 100)
  }

  // ── Styling helpers ───────────────────────────────────────────
  const btnBase  = isOwn
    ? 'bg-white/20 hover:bg-white/30 text-white'
    : 'bg-primary/10 hover:bg-primary/20 text-primary'
  const trackBg  = isOwn ? 'bg-white/20' : 'bg-muted'
  const trackFill = isOwn ? 'bg-white' : 'bg-primary'
  const meta     = 'opacity-70'

  if (loadState === 'error') {
    return (
      <div className={`flex items-center gap-2 min-w-[180px] text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
        <span className="flex-1">{'לא ניתן לטעון שמע'}</span>
        <button
          onClick={handleRetry}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-muted hover:bg-muted/80'}`}
        >
          <RefreshCw className="w-3 h-3" />
          {'נסה שוב'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      {/*
        ⚠️  NO crossOrigin attribute here.
        crossOrigin="anonymous" requires Supabase Storage to send CORS headers.
        Without it, the browser plays the file normally from the public URL.
        We use a signed-URL fallback (handleError) for private/expired files.
      */}
      {/* playsInline: prevents iOS Safari from opening the native fullscreen player */}
      <audio
        ref={audioRef}
        src={activeSrc}
        preload="metadata"
        playsInline
        onTimeUpdate={() => {
          const audio = audioRef.current
          if (!audio) return
          setCurrentTime(audio.currentTime)
          setProgress((audio.currentTime / (audio.duration || 1)) * 100)
        }}
        onCanPlay={() => setLoadState('ready')}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
        onError={handleError}
      />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${btnBase}`}
      >
        {loadState === 'loading'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : playing
            ? <Pause className="w-4 h-4" />
            : <Play  className="w-4 h-4 mr-[-1px]" />
        }
      </button>

      {/* Progress + time */}
      <div className="flex-1 space-y-1">
        <div
          className={`h-1.5 rounded-full overflow-hidden cursor-pointer ${trackBg}`}
          onClick={handleSeek}
        >
          <div
            className={`h-full rounded-full transition-all ${trackFill}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={`flex justify-between text-[10px] ${meta}`}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Speed button */}
      <button
        onClick={cycleSpeed}
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition shrink-0 ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        }`}
        title="שנה מהירות"
      >
        {speed}x
      </button>
    </div>
  )
}

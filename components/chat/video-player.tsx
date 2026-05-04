"use client"

import { useState, useCallback, useRef } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface VideoPlayerProps {
  url: string
  duration: number
  isOwn: boolean
}

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

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function VideoPlayer({ url, duration, isOwn }: VideoPlayerProps) {
  const [activeSrc, setActiveSrc] = useState(url)
  const [hasError, setHasError]   = useState(false)
  const retried = useRef(false)

  const handleError = useCallback(async () => {
    if (!retried.current) {
      retried.current = true
      const signed = await getSignedUrl(activeSrc)
      if (signed && signed !== activeSrc) {
        setActiveSrc(signed)
        setHasError(false)
        return
      }
    }
    setHasError(true)
  }, [activeSrc])

  const handleRetry = () => {
    retried.current = false
    setActiveSrc(url)
    setHasError(false)
  }

  if (hasError) {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-xs max-w-[280px] ${isOwn ? 'border-white/20 bg-white/10 text-white/70' : 'border-border/40 bg-muted text-muted-foreground'}`}>
        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
        <span className="flex-1">{'לא ניתן לטעון וידאו'}</span>
        <button
          onClick={handleRetry}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-muted-foreground/10 hover:bg-muted-foreground/20'}`}
        >
          <RefreshCw className="w-3 h-3" />
          {'נסה שוב'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden max-w-[280px] border border-border/40 shadow-sm">
      {/*
        ⚠️  NO crossOrigin attribute.
        Removed to avoid CORS-block on Supabase Storage public URLs.
        The signed-URL fallback (handleError) covers private/expired files.
      */}
      <video
        src={activeSrc}
        controls
        playsInline
        preload="metadata"
        className="w-full max-h-[220px] object-cover bg-black"
        style={{ maxWidth: 280 }}
        onError={handleError}
      />
      <div
        className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none ${
          isOwn ? 'bg-black/40 text-white' : 'bg-white/80 text-gray-700'
        }`}
      >
        {'🎥'} {fmt(duration)}
      </div>
    </div>
  )
}

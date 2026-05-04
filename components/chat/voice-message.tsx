"use client"

import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

interface VoiceMessageProps {
  url: string
  duration: number
  isOwn: boolean
}

const SPEEDS = [1, 1.5, 2, 0.75] as const
type Speed = typeof SPEEDS[number]

export function VoiceMessage({ url, duration, isOwn }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState<Speed>(1)
  const audioRef = useRef<HTMLAudioElement>(null)

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const newTime = pct * (audioRef.current.duration || 0)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    setProgress(pct * 100)
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      <audio
        ref={audioRef}
        src={url}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setCurrentTime(audioRef.current.currentTime)
          setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100)
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
        onError={(e) => {
          // Fallback: retry without crossOrigin if CORS fails
          const audio = e.currentTarget
          if (audio.crossOrigin) {
            audio.crossOrigin = ''
            audio.load()
          }
        }}
      />
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-[-1px]" />}
      </button>
      <div className="flex-1 space-y-1">
        {/* Seekable progress bar */}
        <div
          className={`h-1.5 rounded-full overflow-hidden cursor-pointer ${isOwn ? 'bg-white/20' : 'bg-muted'}`}
          onClick={handleSeek}
        >
          <div className={`h-full rounded-full transition-all ${isOwn ? 'bg-white' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] opacity-70">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      {/* Speed button */}
      <button
        onClick={cycleSpeed}
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition shrink-0 ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
        title="שנה מהירות"
      >
        {speed}x
      </button>
    </div>
  )
}

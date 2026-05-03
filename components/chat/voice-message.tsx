"use client"

import { useState, useRef } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface VoiceMessageProps {
  url: string
  duration: number
  isOwn: boolean
}

export function VoiceMessage({ url, duration, isOwn }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause() }
    else { audioRef.current.play() }
    setPlaying(!playing)
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setCurrentTime(audioRef.current.currentTime)
          setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100)
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
      />
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-[-1px]" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${isOwn ? 'bg-white/20' : 'bg-muted'}`}>
          <div className={`h-full rounded-full transition-all ${isOwn ? 'bg-white' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] opacity-70">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <Volume2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
    </div>
  )
}

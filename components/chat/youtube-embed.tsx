"use client"

import { useState } from 'react'
import { Play } from 'lucide-react'

interface YoutubeEmbedProps {
  url: string
  isOwn: boolean
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function YoutubeEmbed({ url, isOwn }: YoutubeEmbedProps) {
  const [playing, setPlaying] = useState(false)
  const videoId = extractVideoId(url)
  if (!videoId) return null

  const thumb = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`

  return (
    <div className={`mt-2 rounded-xl overflow-hidden max-w-[320px] border ${isOwn ? 'border-white/20' : 'border-border/40'} shadow-md`}>
      {playing ? (
        <iframe
          src={embedUrl}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video block group overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="YouTube thumbnail" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-white fill-white mr-[-2px]" />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

export function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url)
}

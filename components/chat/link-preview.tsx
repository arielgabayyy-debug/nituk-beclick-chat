"use client"

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'

interface LinkPreviewData {
  title: string
  description: string
  image: string
  siteName: string
  url: string
}

interface LinkPreviewProps {
  url: string
  isOwn: boolean
}

const cache = new Map<string, LinkPreviewData | null>()

export function LinkPreview({ url, isOwn }: LinkPreviewProps) {
  const [data, setData] = useState<LinkPreviewData | null>(undefined as unknown as null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cache.has(url)) {
      setData(cache.get(url)!)
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error) { cache.set(url, null); setData(null) }
        else { cache.set(url, d); setData(d) }
      })
      .catch(() => { if (!cancelled) { cache.set(url, null); setData(null) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url])

  if (loading || !data) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex flex-col rounded-xl overflow-hidden border transition-opacity hover:opacity-90 max-w-[300px] ${
        isOwn
          ? 'border-white/20 bg-white/10'
          : 'border-border/50 bg-muted/30'
      }`}
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt={data.title}
          className="w-full h-36 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="p-2.5">
        {data.siteName && (
          <p className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
            {data.siteName}
          </p>
        )}
        {data.title && (
          <p className={`text-xs font-semibold leading-snug line-clamp-2 mb-0.5 ${isOwn ? 'text-white' : 'text-foreground'}`}>
            {data.title}
          </p>
        )}
        {data.description && (
          <p className={`text-[11px] leading-relaxed line-clamp-2 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
            {data.description}
          </p>
        )}
        <div className={`flex items-center gap-1 mt-1.5 ${isOwn ? 'text-white/50' : 'text-muted-foreground'}`}>
          <ExternalLink className="w-2.5 h-2.5" />
          <span className="text-[10px] truncate">{new URL(url).hostname}</span>
        </div>
      </div>
    </a>
  )
}

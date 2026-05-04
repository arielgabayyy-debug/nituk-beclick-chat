"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Search, Loader2, Film, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GIF_CATEGORIES } from '@/lib/chat-types'

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

// ── GIF API — calls our server-side proxy (key never exposed to browser) ─────
interface TenorGif {
  id: string
  content_description: string
  media_formats: {
    tinygif:    { url: string }
    gif:        { url: string }
    mediumgif?: { url: string }
  }
}

async function fetchGifs(opts: { q?: string; type?: 'search' | 'featured'; limit?: number }): Promise<TenorGif[]> {
  const p = new URLSearchParams({
    type:  opts.type || (opts.q ? 'search' : 'featured'),
    limit: String(opts.limit || 16),
  })
  if (opts.q) p.set('q', opts.q)
  const res = await fetch(`/api/gifs?${p}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`GIF API ${res.status}`)
  const data = await res.json() as { results?: TenorGif[] }
  return data.results || []
}

function getThumbUrl(gif: TenorGif): string {
  return gif.media_formats.tinygif?.url || gif.media_formats.gif?.url
}
function getFullUrl(gif: TenorGif): string {
  return gif.media_formats.mediumgif?.url || gif.media_formats.gif?.url
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('static-0')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [tenorGifs,      setTenorGifs]      = useState<TenorGif[]>([])
  const [trending,       setTrending]       = useState<TenorGif[]>([])
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(false)
  const [mode,           setMode]           = useState<'static' | 'tenor-trending' | 'tenor-search'>('static')
  const searchDebounce = useRef<NodeJS.Timeout | null>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  // Load trending GIFs on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchGifs({ type: 'featured' })
      .then(gifs => { if (!cancelled) { setTrending(gifs); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const searchTenor = useCallback(async (q: string) => {
    if (!q.trim()) { setTenorGifs([]); setMode('static'); return }
    setLoading(true); setError(false); setMode('tenor-search')
    try {
      const gifs = await fetchGifs({ q, type: 'search' })
      setTenorGifs(gifs)
    } catch {
      setError(true)
      setTenorGifs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearchQuery(v)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (v.length >= 2) {
      searchDebounce.current = setTimeout(() => searchTenor(v), 350)
    } else if (!v) {
      setTenorGifs([]); setMode('static')
    }
  }

  const clearSearch = () => {
    setSearchQuery(''); setTenorGifs([]); setMode('static')
    inputRef.current?.focus()
  }

  const currentStaticCat = GIF_CATEGORIES[parseInt(activeCategory.replace('static-', '')) || 0]
  const staticGifs        = currentStaticCat?.gifs || []

  // Which GIFs to show in the grid
  let gridGifs: { thumb: string; full: string; key: string }[] = []
  if (mode === 'tenor-search' || mode === 'tenor-trending') {
    gridGifs = (mode === 'tenor-search' ? tenorGifs : trending).map(g => ({
      key:   g.id,
      thumb: getThumbUrl(g),
      full:  getFullUrl(g),
    }))
  } else {
    gridGifs = staticGifs.map((url, i) => ({ key: `s-${i}`, thumb: url, full: url }))
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 bg-white dark:bg-gray-900 border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col",
          "bottom-0 left-0 right-0 h-[400px]",
          "sm:absolute sm:bottom-full sm:right-0 sm:left-auto sm:top-auto sm:mb-2 sm:h-[380px] sm:w-[360px]",
          "animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-200",
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-pink-500" />
            <span className="font-semibold text-sm">GIF</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2">
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
              : <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="חפש GIF... (מצחיק, תודה, כסף...)"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="shrink-0">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* ── Mode switcher (only when no search active) ───────────────────── */}
        {!searchQuery && (
          <div className="flex items-center gap-2 px-3 pb-2 shrink-0">
            <button
              onClick={() => setMode('static')}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition",
                mode === 'static' ? 'bg-pink-500 text-white' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              קטגוריות
            </button>
            <button
              onClick={() => setMode('tenor-trending')}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition",
                mode === 'tenor-trending' ? 'bg-pink-500 text-white' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              <TrendingUp className="w-3 h-3" /> טרנדינג
            </button>
          </div>
        )}

        {/* ── Category chips (only in static mode) ────────────────────────── */}
        {!searchQuery && mode === 'static' && (
          <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto shrink-0 scrollbar-none">
            {GIF_CATEGORIES.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(`static-${i}`)}
                className={cn(
                  "shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition",
                  activeCategory === `static-${i}`
                    ? 'bg-pink-500 text-white'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── GIF Grid ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading && gridGifs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-7 h-7 animate-spin text-pink-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <span className="text-3xl">😕</span>
              <p className="text-sm">שגיאה בחיפוש — נסה שוב</p>
              <button onClick={() => searchTenor(searchQuery)} className="text-xs text-pink-500 underline">נסה שוב</button>
            </div>
          ) : gridGifs.length === 0 && mode === 'tenor-search' ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm">לא נמצאו GIFs עבור &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {gridGifs.map(gif => (
                <button
                  key={gif.key}
                  onClick={() => onSelect(gif.full)}
                  className="relative aspect-video rounded-xl overflow-hidden border border-border/30 hover:border-pink-400/60 hover:scale-[1.02] transition-all group"
                >
                  <img
                    src={gif.thumb}
                    alt="gif"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-3 py-1.5 border-t border-border/30 shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            {mode === 'static' ? 'GIFs by GIPHY' : 'Powered by Tenor'}
          </p>
        </div>
      </div>
    </>
  )
}

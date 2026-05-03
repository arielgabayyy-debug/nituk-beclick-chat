"use client"

import { useState, useCallback } from 'react'
import { X, Image, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GIF_CATEGORIES } from '@/lib/chat-types'

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

// Tenor API - free key for demos (limited but works)
const TENOR_KEY = 'AIzaSyAyimkuEcduhV3QIZmCYkMPBSmBpCy27as'

interface TenorGif {
  id: string
  media_formats: { gif: { url: string }; tinygif: { url: string } }
  content_description: string
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string | 'search'>(GIF_CATEGORIES[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [tenorResults, setTenorResults] = useState<TenorGif[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  const searchTenor = useCallback(async (q: string) => {
    if (!q.trim()) { setTenorResults([]); return }
    setSearching(true); setSearchError(false)
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTenorResults(data.results || [])
    } catch {
      setSearchError(true)
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearchQuery(v)
    setActiveCategory('search')
    if (v.length >= 2) searchTenor(v)
    else setTenorResults([])
  }

  const currentCategory = GIF_CATEGORIES.find(c => c.id === activeCategory)
  const showTenorResults = activeCategory === 'search' || searchQuery.length >= 2

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl overflow-hidden z-50">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          <span className="font-semibold">בחר GIF</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-1.5">
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" /> : <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="חפש GIF... (חגיגה, תודה...)"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setTenorResults([]); setActiveCategory(GIF_CATEGORIES[0].id) }}>
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Categories (only when not searching) */}
      {!searchQuery && (
        <div className="flex gap-1 p-2 border-b border-border/50 overflow-x-auto">
          {GIF_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => { setActiveCategory(category.id); setSearchQuery('') }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* GIFs Grid */}
      <div className="p-2 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {showTenorResults && tenorResults.length > 0
          ? tenorResults.map(gif => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.media_formats.gif?.url || gif.media_formats.tinygif?.url)}
              className="relative aspect-video rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 hover:scale-105 transition-all"
            >
              <img src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url} alt={gif.content_description} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))
          : showTenorResults && !searching && !searchError && searchQuery.length >= 2
          ? <div className="col-span-2 py-6 text-center text-sm text-muted-foreground">לא נמצאו תוצאות</div>
          : searchError
          ? <div className="col-span-2 py-4 text-center text-sm text-muted-foreground">שגיאה בחיפוש, נסה שוב</div>
          : currentCategory?.gifs.map((gifUrl, index) => (
            <button
              key={index}
              onClick={() => onSelect(gifUrl)}
              className="relative aspect-video rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 hover:scale-105 transition-all"
            >
              <img src={gifUrl} alt="GIF" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))
        }
        {searching && (
          <div className="col-span-2 flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          {searchQuery ? 'Powered by Tenor' : 'GIFs from GIPHY'}
        </p>
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { X, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GIF_CATEGORIES } from '@/lib/chat-types'

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState(GIF_CATEGORIES[0].id)

  const currentCategory = GIF_CATEGORIES.find(c => c.id === activeCategory)

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

      {/* Categories */}
      <div className="flex gap-1 p-2 border-b border-border/50 overflow-x-auto">
        {GIF_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
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

      {/* GIFs Grid */}
      <div className="p-2 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {currentCategory?.gifs.map((gifUrl, index) => (
          <button
            key={index}
            onClick={() => onSelect(gifUrl)}
            className="relative aspect-video rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 hover:scale-105 transition-all"
          >
            <img
              src={gifUrl}
              alt="GIF"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          GIFs from GIPHY
        </p>
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { X, Images, Download } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'
import { ImageLightbox } from './image-lightbox'

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i
const URL_REGEX = /(https?:\/\/[^\s]+)/g

function extractImages(messages: ChatMessage[]): { url: string; userName: string; time: string }[] {
  const images: { url: string; userName: string; time: string }[] = []
  messages.forEach(m => {
    const urls = m.content.match(URL_REGEX) || []
    urls.forEach(url => {
      if (IMAGE_EXTENSIONS.test(url)) {
        images.push({ url, userName: m.user?.name || 'משתמש', time: m.created_at })
      }
    })
  })
  return images.reverse()
}

interface ImageGalleryProps {
  messages: ChatMessage[]
  onClose: () => void
}

export function ImageGallery({ messages, onClose }: ImageGalleryProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const images = extractImages(messages)

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 border-r border-border/40 shadow-2xl flex flex-col animate-in slide-in-from-left-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">גלריית תמונות</span>
            {images.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{images.length}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
                <Images className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">אין תמונות בצ׳אט עדיין</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxSrc(img.url)}
                  className="relative aspect-square rounded-xl overflow-hidden group border border-border/30 hover:border-primary/40 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt="תמונה"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* User label */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-[10px] text-white truncate">{img.userName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  )
}

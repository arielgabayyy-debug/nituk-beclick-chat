"use client"

import { useEffect, useState } from 'react'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt = 'תמונה', onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 3))
      if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.5))
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = src
    a.download = 'image.jpg'
    a.target = '_blank'
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={e => e.stopPropagation()}>
        <button onClick={() => setScale(s => Math.min(s + 0.25, 3))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleDownload} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scale hint */}
      {scale !== 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-xs px-3 py-1 rounded-full">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="object-contain rounded-lg shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${scale})`, maxWidth: '90vw', maxHeight: '90vh' }}
          draggable={false}
        />
      </div>
    </div>
  )
}

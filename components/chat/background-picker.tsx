"use client"

import { useState, useEffect } from 'react'
import { Palette, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const BACKGROUNDS = [
  { id: 'default', label: 'ברירת מחדל', preview: 'from-cyan-50 to-purple-50', css: '' },
  { id: 'dark-night', label: 'לילה כהה', preview: 'from-gray-900 to-slate-900', css: 'bg-theme-dark' },
  { id: 'sunset', label: 'שקיעה', preview: 'from-orange-100 to-pink-100', css: 'bg-theme-sunset' },
  { id: 'forest', label: 'יער', preview: 'from-green-100 to-emerald-200', css: 'bg-theme-forest' },
  { id: 'ocean', label: 'אוקיינוס', preview: 'from-blue-100 to-cyan-200', css: 'bg-theme-ocean' },
  { id: 'minimal', label: 'מינימל', preview: 'from-gray-50 to-white', css: 'bg-theme-minimal' },
  { id: 'cyberpunk', label: 'סייברפאנק', preview: 'from-purple-900 to-black', css: 'bg-theme-cyber' },
  { id: 'rose', label: 'ורוד', preview: 'from-pink-100 to-rose-200', css: 'bg-theme-rose' },
  { id: 'gold', label: 'זהב', preview: 'from-amber-100 to-yellow-200', css: 'bg-theme-gold' },
  { id: 'israel', label: '🇮🇱 ישראל', preview: 'from-blue-100 to-white', css: 'bg-theme-israel' },
]

export function BackgroundPicker() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('default')

  useEffect(() => {
    const saved = localStorage.getItem('chat_bg_theme') || 'default'
    setSelected(saved)
    applyTheme(saved)
  }, [])

  const applyTheme = (id: string) => {
    const bg = BACKGROUNDS.find(b => b.id === id)
    // Remove old theme classes
    BACKGROUNDS.forEach(b => { if (b.css) document.body.classList.remove(b.css) })
    if (bg?.css) document.body.classList.add(bg.css)
  }

  const select = (id: string) => {
    setSelected(id)
    applyTheme(id)
    localStorage.setItem('chat_bg_theme', id)
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="בחר רקע"
        aria-label="בחר רקע לצ'אט"
      >
        <Palette className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm">בחר רקע</h4>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {BACKGROUNDS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => select(bg.id)}
                  title={bg.label}
                  aria-label={bg.label}
                  className={cn(
                    "relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105",
                    `bg-gradient-to-br ${bg.preview}`,
                    selected === bg.id ? "border-primary shadow-lg" : "border-transparent"
                  )}
                >
                  {selected === bg.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-500">{BACKGROUNDS.find(b => b.id === selected)?.label}</span>
            </div>
          </div>
        </>
      )}
    </>
  )
}

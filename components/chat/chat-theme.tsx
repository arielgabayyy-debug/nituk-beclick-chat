"use client"

import { useState, useEffect } from 'react'
import { Palette, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatTheme {
  id: string
  name: string
  // CSS vars to apply
  bubbleOwn: string
  bubbleOther: string
  accent: string
  bgPattern?: string
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'ברירת מחדל',
    bubbleOwn: 'from-cyan-500 to-purple-600',
    bubbleOther: 'bg-white dark:bg-muted',
    accent: '#06b6d4',
  },
  {
    id: 'ocean',
    name: 'אוקיינוס',
    bubbleOwn: 'from-blue-500 to-cyan-400',
    bubbleOther: 'bg-blue-50 dark:bg-blue-950/40',
    accent: '#3b82f6',
  },
  {
    id: 'sunset',
    name: 'שקיעה',
    bubbleOwn: 'from-orange-500 to-rose-500',
    bubbleOther: 'bg-orange-50 dark:bg-orange-950/40',
    accent: '#f97316',
  },
  {
    id: 'forest',
    name: 'יער',
    bubbleOwn: 'from-emerald-500 to-teal-600',
    bubbleOther: 'bg-emerald-50 dark:bg-emerald-950/40',
    accent: '#10b981',
  },
  {
    id: 'lavender',
    name: 'לבנדר',
    bubbleOwn: 'from-purple-500 to-violet-600',
    bubbleOther: 'bg-purple-50 dark:bg-purple-950/40',
    accent: '#8b5cf6',
  },
  {
    id: 'rose',
    name: 'ורד',
    bubbleOwn: 'from-pink-500 to-rose-500',
    bubbleOther: 'bg-pink-50 dark:bg-pink-950/40',
    accent: '#ec4899',
  },
  {
    id: 'midnight',
    name: 'חצות',
    bubbleOwn: 'from-slate-600 to-slate-800',
    bubbleOther: 'bg-slate-100 dark:bg-slate-800',
    accent: '#64748b',
  },
  {
    id: 'gold',
    name: 'זהב',
    bubbleOwn: 'from-amber-500 to-yellow-400',
    bubbleOther: 'bg-amber-50 dark:bg-amber-950/40',
    accent: '#f59e0b',
  },
]

const THEME_STORAGE_KEY = 'chat_theme'

export function useChatTheme() {
  const [themeId, setThemeId] = useState('default')

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved) setThemeId(saved)
  }, [])

  const setTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem(THEME_STORAGE_KEY, id)
  }

  const currentTheme = CHAT_THEMES.find(t => t.id === themeId) || CHAT_THEMES[0]
  return { themeId, currentTheme, setTheme }
}

interface ChatThemePickerProps {
  currentThemeId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function ChatThemePicker({ currentThemeId, onSelect, onClose }: ChatThemePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-xs p-4 animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">ערכת נושא</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {CHAT_THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => { onSelect(theme.id); onClose() }}
              className="flex flex-col items-center gap-1.5 group"
            >
              {/* Preview bubble */}
              <div className={cn(
                "relative w-12 h-12 rounded-2xl bg-gradient-to-br shadow-md transition-transform group-hover:scale-110",
                theme.bubbleOwn,
                currentThemeId === theme.id && "ring-2 ring-offset-2 ring-primary scale-110"
              )}>
                {currentThemeId === theme.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white drop-shadow" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{theme.name}</span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-3">
          הנושא ישמר אוטומטית
        </p>
      </div>
    </div>
  )
}

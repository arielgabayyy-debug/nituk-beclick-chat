"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Search, X, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMOJI_CATEGORIES,
  EMOJI_KEYWORDS,
  SKIN_TONES,
  SKIN_TONE_BASES,
  type SkinTone,
} from '@/lib/emoji-data'

// ── LocalStorage helpers ─────────────────────────────────────────────────────
function getRecentEmojis(): string[] {
  try { return JSON.parse(localStorage.getItem('recent_emojis') || '[]').slice(0, 32) }
  catch { return [] }
}
function addRecentEmoji(emoji: string) {
  try {
    const recent = getRecentEmojis().filter(e => e !== emoji)
    localStorage.setItem('recent_emojis', JSON.stringify([emoji, ...recent].slice(0, 32)))
  } catch {}
}
function getSkinTone(): SkinTone {
  try { return (localStorage.getItem('emoji_skin_tone') || '') as SkinTone }
  catch { return '' }
}
function saveSkinTone(tone: SkinTone) {
  try { localStorage.setItem('emoji_skin_tone', tone) } catch {}
}

// ── Apply skin tone ───────────────────────────────────────────────────────────
function applyTone(emoji: string, tone: SkinTone): string {
  if (!tone) return emoji
  const base = emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/u, '')
  if (SKIN_TONE_BASES.has(base)) return base + tone
  return emoji
}

// ── Category icon mapping ─────────────────────────────────────────────────────
const CAT_ICONS: Record<string, string> = {
  recent:     '🕐',
  smileys:    '😊',
  people:     '👋',
  animals:    '🐶',
  food:       '🍕',
  travel:     '✈️',
  activities: '⚽',
  objects:    '📱',
  symbols:    '🔥',
  flags:      '🏳️',
}

// ── Search: keyword + visual scan ────────────────────────────────────────────
function searchEmojis(query: string, categories: typeof EMOJI_CATEGORIES): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results = new Set<string>()

  // 1. Keyword map lookup (highest priority)
  for (const [kw, emojis] of Object.entries(EMOJI_KEYWORDS)) {
    if (kw.includes(q) || q.includes(kw)) {
      emojis.forEach(e => results.add(e))
    }
  }

  // 2. All categories — include emojis that partially match (for single chars)
  if (q.length <= 2) {
    for (const cat of categories) {
      for (const e of cat.emojis) {
        if (e.includes(q)) results.add(e)
      }
    }
  }

  return Array.from(results).slice(0, 96)
}

// ── Component ─────────────────────────────────────────────────────────────────
interface FullEmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function FullEmojiPicker({ onSelect, onClose }: FullEmojiPickerProps) {
  const [search, setSearch]             = useState('')
  const [activeCategory, setCategory]   = useState('smileys')
  const [skinTone, setSkinTone]         = useState<SkinTone>(getSkinTone)
  const [showSkinMenu, setShowSkinMenu] = useState(false)
  const searchRef   = useRef<HTMLInputElement>(null)
  const gridRef     = useRef<HTMLDivElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  // Inject recent emojis into the first category
  const recent = getRecentEmojis()
  const categories = useMemo(() =>
    EMOJI_CATEGORIES.map(c =>
      c.id === 'recent' ? { ...c, emojis: recent } : c
    ).filter(c => c.id !== 'recent' || c.emojis.length > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [search])

  const searchResults = useMemo(() => searchEmojis(search, categories), [search, categories])
  const displayEmojis = search.trim()
    ? searchResults
    : categories.find(c => c.id === activeCategory)?.emojis || []

  const handleSelect = useCallback((rawEmoji: string) => {
    const emoji = applyTone(rawEmoji, skinTone)
    addRecentEmoji(emoji)
    onSelect(emoji)
  }, [skinTone, onSelect])

  const handleSkinTone = (tone: SkinTone) => {
    setSkinTone(tone)
    saveSkinTone(tone)
    setShowSkinMenu(false)
  }

  const activeCatLabel = categories.find(c => c.id === activeCategory)?.label || ''

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 bg-white dark:bg-gray-900 border border-border/60 rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          // Mobile: full bottom sheet; desktop: floating panel
          "bottom-0 left-0 right-0 h-[380px]",
          "sm:absolute sm:bottom-full sm:left-auto sm:right-0 sm:top-auto sm:h-[360px] sm:w-[340px] sm:mb-2",
          "animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-200",
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש אמוג׳י... (שמח, לב, כסף...)"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground min-w-0"
          />

          {/* Skin tone picker */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSkinMenu(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition text-base"
              title="גוון עור"
            >
              {'✋' + skinTone}
            </button>
            {showSkinMenu && (
              <div className="absolute top-full right-0 mt-1 flex gap-1 p-2 bg-white dark:bg-muted border border-border/60 rounded-xl shadow-xl z-10 animate-in fade-in duration-100">
                {SKIN_TONES.map(tone => (
                  <button
                    key={tone || 'default'}
                    onClick={() => handleSkinTone(tone)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xl flex items-center justify-center hover:bg-muted/60 transition",
                      skinTone === tone && "bg-primary/10 ring-1 ring-primary"
                    )}
                    title={tone ? `גוון ${tone}` : 'ברירת מחדל'}
                  >
                    {'✋' + tone}
                  </button>
                ))}
              </div>
            )}
          </div>

          {search ? (
            <button onClick={() => setSearch('')} className="shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : (
            <button onClick={onClose} className="shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* ── Category tabs ────────────────────────────────────────────────── */}
        {!search && (
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/30 overflow-x-auto shrink-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); gridRef.current?.scrollTo(0, 0) }}
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg text-base transition-all",
                  activeCategory === cat.id
                    ? "bg-primary/10 scale-110"
                    : "hover:bg-muted/60"
                )}
                title={cat.label}
              >
                {CAT_ICONS[cat.id] || cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* ── Category label / search count ───────────────────────────────── */}
        <div className="px-3 py-1 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {search.trim()
              ? `${searchResults.length} תוצאות עבור "${search}"`
              : activeCatLabel}
          </span>
        </div>

        {/* ── Emoji grid ───────────────────────────────────────────────────── */}
        <div ref={gridRef} className="flex-1 overflow-y-auto px-2 pb-2">
          {displayEmojis.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              {search ? (
                <>
                  <span className="text-3xl">🔍</span>
                  <p className="text-sm">לא נמצאו תוצאות עבור &ldquo;{search}&rdquo;</p>
                </>
              ) : (
                <>
                  <Clock className="w-8 h-8 opacity-30" />
                  <p className="text-sm">אין אמוג׳ים אחרונים</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {displayEmojis.map((emoji, i) => {
                const displayEmoji = applyTone(emoji, skinTone)
                return (
                  <button
                    key={`${emoji}-${i}`}
                    onClick={() => handleSelect(emoji)}
                    className="w-9 h-9 text-xl flex items-center justify-center rounded-lg hover:bg-muted transition-all hover:scale-125 active:scale-95 touch-manipulation"
                    title={emoji}
                  >
                    {displayEmoji}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

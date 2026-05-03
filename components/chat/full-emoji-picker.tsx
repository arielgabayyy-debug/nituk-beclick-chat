"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMOJI_CATEGORIES: Array<{
  id: string
  label: string
  icon: string
  emojis: string[]
}> = [
  {
    id: 'recent',
    label: 'אחרונים',
    icon: '🕐',
    emojis: [], // filled from localStorage
  },
  {
    id: 'smileys',
    label: 'פנים',
    icon: '😊',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    id: 'gestures',
    label: 'ידיים',
    icon: '👋',
    emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄'],
  },
  {
    id: 'hearts',
    label: 'לבבות',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','💯','💢','💥','💫','💦','💨','🕳','💬','👁‍🗨','💭','💤'],
  },
  {
    id: 'animals',
    label: 'חיות',
    icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔'],
  },
  {
    id: 'food',
    label: 'אוכל',
    icon: '🍕',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🫖','🍵','🧉','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧊','🥄','🍴','🍽','🥣','🥗','🥘'],
  },
  {
    id: 'travel',
    label: 'נסיעות',
    icon: '✈️',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣','🛤','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥','🛳','⛴','🚢','✈️','🛩','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰','🚀','🛸','🌍','🌎','🌏','🧭','🗺','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🏟','🏛','🏗','🧱','🪝','🏘','🏚','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽'],
  },
  {
    id: 'symbols',
    label: 'סמלים',
    icon: '🔥',
    emojis: ['🔥','⭐','🌟','✨','💫','🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🏅','🎖','🎗','🎫','🎟','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🎸','🎺','🎻','🥁','🎷','🎮','🕹','🎲','♟','🎯','🎳','🎱','🏓','🏸','🥊','🥋','⚽','🏀','🏈','⚾','🥎','🏐','🏉','🥏','🎾','🏒','🏑','🏏','🏹','🎣','🤿','🎿','🛷','🥌','💎','🔮','💡','🔑','🗝','🔓','🔒','🚪','🪑','🛋','🛏','🪞','🚿','🛁','🚽','🧹','🧺','🧻','🪣','🧼','🪥','🧴','🪒','🪮','💊','💉','🩺','🩹','🩻','🔬','🔭','🩼','🩺','📱','💻','⌨️','🖥','🖨','🖱','💾','💿','📀','📼','📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🧭','⏱','⏰','📡','🔋','🔌','💡','🔦','🕯','🪔','🧱','💰','💴','💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','📋','📁','📂','🗂','📅','📆','🗒','🗓','📇','📌','📍','✂️','🗃','🗄','🗑','🔒','🔓','🔏','🔐','🔑','🗝','🔨','🪓','⛏','⚒','🛠','🗡','⚔️','🛡','🪚','🔧','🔩','⚙️','🗜','⚖️','🦯','🔗','⛓','🪝','🧲','🪜','⚗️','🪄','🔭','📡','💊','🩺','🩻','🔬','🪬','🧿','🧸','🪅','🪆','🖼','🪩','🎎','🧧'],
  },
]

function getRecentEmojis(): string[] {
  try {
    return JSON.parse(localStorage.getItem('recent_emojis') || '[]').slice(0, 24)
  } catch { return [] }
}

function addRecentEmoji(emoji: string) {
  try {
    const recent = getRecentEmojis().filter(e => e !== emoji)
    localStorage.setItem('recent_emojis', JSON.stringify([emoji, ...recent].slice(0, 24)))
  } catch {}
}

interface FullEmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function FullEmojiPicker({ onSelect, onClose }: FullEmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('recent')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const recentEmojis = getRecentEmojis()

  const categories = EMOJI_CATEGORIES.map(c =>
    c.id === 'recent' ? { ...c, emojis: recentEmojis } : c
  ).filter(c => c.id !== 'recent' || c.emojis.length > 0)

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null
    // Simple search: return all emojis from all categories
    return categories.flatMap(c => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i).slice(0, 80)
  }, [search, categories])

  const currentEmojis = filteredEmojis || categories.find(c => c.id === activeCategory)?.emojis || []

  const handleSelect = (emoji: string) => {
    addRecentEmoji(emoji)
    onSelect(emoji)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm h-80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש אמוג'י..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="flex gap-0.5 px-2 py-1.5 overflow-x-auto border-b border-border/30">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg text-base transition-all",
                  activeCategory === cat.id ? "bg-primary/10 scale-110" : "hover:bg-muted/60"
                )}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* Emoji grid */}
        <div className="flex-1 overflow-y-auto p-2">
          {currentEmojis.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {search ? 'לא נמצאו תוצאות' : 'אין אמוג\'י אחרונים'}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {currentEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 text-xl flex items-center justify-center rounded-lg hover:bg-muted transition-all hover:scale-125 active:scale-95"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

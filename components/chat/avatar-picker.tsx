"use client"

import { useState } from 'react'
import { Palette, Check, X } from 'lucide-react'
import { AVATAR_COLORS } from '@/lib/chat-types'
import { createClient } from '@/lib/supabase/client'
import type { ChatUser } from '@/lib/chat-types'

interface AvatarPickerProps {
  currentUser: ChatUser
  onColorChange: (color: string) => void
}

const EXTENDED_COLORS = [
  ...AVATAR_COLORS,
  '#ff6b6b', '#ffa502', '#2ed573', '#1e90ff', '#ff4757', '#747d8c',
  '#a29bfe', '#fd79a8', '#00b894', '#e17055', '#6c5ce7', '#00cec9',
]

export function AvatarPicker({ currentUser, onColorChange }: AvatarPickerProps) {
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState(currentUser.avatar_color)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (selected === currentUser.avatar_color) { setShow(false); return }
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('chat_users').update({ avatar_color: selected }).eq('id', currentUser.id)
      onColorChange(selected)
      setShow(false)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShow(s => !s)}
        className="w-9 h-9 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer"
        style={{ backgroundColor: selected }}
        title="שנה צבע אווטר"
        aria-label="בחר צבע"
      >
        <Palette className="w-4 h-4 text-white/60 mx-auto" />
      </button>

      {show && (
        <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-900 border border-border/50 rounded-2xl shadow-2xl p-3 z-50 w-56 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">בחר צבע אווטר</span>
            <button onClick={() => setShow(false)} className="p-0.5 hover:bg-muted rounded-full">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {EXTENDED_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelected(color)}
                className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 relative"
                style={{ backgroundColor: color, borderColor: selected === color ? 'white' : 'transparent' }}
              >
                {selected === color && (
                  <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-xs bg-primary text-primary-foreground rounded-lg py-1.5 font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      )}
    </div>
  )
}

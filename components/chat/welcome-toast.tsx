"use client"

import { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { ChatUser } from '@/lib/chat-types'

interface WelcomeToastProps {
  user: ChatUser
}

export function WelcomeToast({ user }: WelcomeToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const key = `welcomed_${user.id}`
    if (!localStorage.getItem(key)) {
      setTimeout(() => setShow(true), 1500)
      localStorage.setItem(key, '1')
    }
  }, [user.id])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-500">
      <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 max-w-sm">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold">ברוך הבא, {user.name}! 🎉</p>
          <p className="text-sm text-white/80">שמחים שהצטרפת לקהילה!</p>
        </div>
        <button onClick={() => setShow(false)} className="p-1 hover:bg-white/20 rounded-full ml-auto shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

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
      const t = setTimeout(() => setShow(true), 1500)
      localStorage.setItem(key, '1')
      return () => clearTimeout(t)
    }
  }, [user.id])

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), 4000)
    return () => clearTimeout(t)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed bottom-20 right-3 z-[70] animate-in slide-in-from-bottom-4 duration-300 sm:bottom-auto sm:top-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2">
      <div className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[280px] sm:max-w-sm">
        <Sparkles className="w-4 h-4 shrink-0 sm:w-5 sm:h-5" />
        <div className="min-w-0">
          <p className="font-bold text-sm">ברוך הבא, {user.name}! 🎉</p>
          <p className="text-xs text-white/80 hidden sm:block">שמחים שהצטרפת לקהילה!</p>
        </div>
        <button onClick={() => setShow(false)} className="p-1 hover:bg-white/20 rounded-full shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

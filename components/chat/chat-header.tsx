"use client"

import { useEffect, useState } from 'react'
import { Users, LogOut, Settings, Search, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatUser } from '@/lib/chat-types'

interface ChatHeaderProps {
  currentUser: ChatUser | null
  onlineCount: number
  onLogout: () => void
  onAdminClick?: () => void
  adminClickCount?: number
  onToggleSearch?: () => void
}

export function ChatHeader({
  currentUser,
  onlineCount,
  onLogout,
  onAdminClick,
  adminClickCount = 0,
  onToggleSearch
}: ChatHeaderProps) {
  const [isDark, setIsDark] = useState(false)

  // On mount, apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    } else {
      document.documentElement.classList.remove('dark')
      setIsDark(false)
    }
  }, [])

  const toggleDarkMode = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <header className="glass border-b border-border/50 px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={onAdminClick}
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/vercel/share/v0-project/public/community-logo-v2-rWt6MTkHzsU1rzhKMX9iaY3puwHh2U.jpg"
              alt="חיבור וניתוק בקליק"
              className="w-12 h-12 rounded-xl shadow-lg"
            />
            {adminClickCount > 0 && adminClickCount < 5 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                {5 - adminClickCount}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">חיבור וניתוק בקליק</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              השוואת מחירים חכמה
              <span className="bg-gradient-to-r from-secondary to-primary text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">AI</span>
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Online count */}
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-online" />
            </div>
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{onlineCount}</span>
            <span className="text-xs text-muted-foreground">מחוברים</span>
          </div>

          {/* Search button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onToggleSearch}
            title="חיפוש הודעות"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleDarkMode}
            title={isDark ? "מצב בהיר" : "מצב כהה"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* User info & logout */}
          {currentUser && (
            <div className="flex items-center gap-2">
              {currentUser.user_type === 'admin' && (
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

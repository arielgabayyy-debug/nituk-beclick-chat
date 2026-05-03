"use client"

import { useEffect, useState } from 'react'
import { Users, LogOut, Search, Moon, Sun, Smile, LayoutDashboard, UserPlus, Palette, ChevronDown, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackgroundPicker } from './background-picker'
import { NotificationBell } from './notification-bell'
import { StreakBadge, useStreak } from './streak-badge'
import { UserStatusEditor, useUserStatus } from './user-status'
import { AvatarPicker } from './avatar-picker'
import { InviteModal } from './invite-modal'
import { ChatThemePicker, useChatTheme } from './chat-theme'
import { WhatsNew } from './whats-new'
import { ConnectionStatus } from './connection-status'
import type { ChatUser } from '@/lib/chat-types'

interface ChatHeaderProps {
  currentUser: ChatUser | null
  onlineCount: number
  onLogout: () => void
  onToggleSearch?: () => void
  onAvatarColorChange?: (color: string) => void
}

export function ChatHeader({ currentUser, onlineCount, onLogout, onToggleSearch, onAvatarColorChange }: ChatHeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [showStatusEditor, setShowStatusEditor] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const { themeId, setTheme } = useChatTheme()
  const [streakToast, setStreakToast] = useState<string | null>(null)
  const { streak, isNewDay } = useStreak()
  const { status } = useUserStatus(currentUser?.id || '')

  // Streak milestone celebrations
  useEffect(() => {
    if (!isNewDay) return
    const milestones: Record<number, string> = {
      7: '🔥 7 ימים רצופים! שבוע שלם בקהילה!',
      14: '💪 שבועיים רצופים! מדהים!',
      30: '🏆 חודש שלם! אתה אלוף!',
      50: '👑 50 ימים! מי כמוך?',
      100: '🌟 100 ימים! אגדה חיה!',
    }
    if (milestones[streak]) {
      setStreakToast(milestones[streak])
      setTimeout(() => setStreakToast(null), 5000)
    }
  }, [streak, isNewDay])

  useEffect(() => {
    const saved = localStorage.getItem('theme')

    // Auto-detect system preference if no saved preference
    if (!saved) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
        setIsDark(true)
      }
    } else if (saved === 'dark') {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    }

    // Listen for system preference changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.classList.toggle('dark', e.matches)
        setIsDark(e.matches)
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const toggleDarkMode = () => {
    const next = !isDark; setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <>
      {/* Skip to main content — accessibility */}
      <a href="#chat-messages" className="skip-link">דלג לצ'אט</a>

      <header className="glass border-b border-border/50 px-4 py-3 sticky top-0 z-10" role="banner">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/vercel/share/v0-project/public/community-logo-v2-rWt6MTkHzsU1rzhKMX9iaY3puwHh2U.jpg"
                alt="חיבור וניתוק בקליק"
                className="w-12 h-12 rounded-xl shadow-lg"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">חיבור וניתוק בקליק</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                השוואת מחירים חכמה
                <span className="bg-gradient-to-r from-secondary to-primary text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">AI</span>
              </p>
            </div>
            {/* Streak badge next to logo */}
            <StreakBadge streak={streak} compact />
            {/* Avatar color picker */}
            {currentUser && onAvatarColorChange && (
              <AvatarPicker currentUser={currentUser} onColorChange={onAvatarColorChange} />
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Connection status */}
            <ConnectionStatus />

            {/* Online count */}
            <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full ml-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-online" />
              <Users className="w-4 h-4 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium" aria-label={`${onlineCount} משתמשים מחוברים`}>{onlineCount}</span>
              <span className="text-xs text-muted-foreground hidden md:block">מחוברים</span>
            </div>

            {/* Search */}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleSearch} title="חיפוש הודעות (Ctrl+F)" aria-label="חיפוש">
              <Search className="w-4 h-4" />
            </Button>

            {/* Background picker */}
            <div className="relative">
              <BackgroundPicker />
            </div>

            {/* Notifications */}
            {currentUser && (
              <NotificationBell currentUserId={currentUser.id} currentUserName={currentUser.name} />
            )}

            {/* Dark mode */}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleDarkMode} title={isDark ? 'מצב בהיר' : 'מצב כהה'} aria-label={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Theme picker */}
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setShowThemePicker(true)} title="ערכת נושא">
              <Palette className="w-4 h-4" />
            </Button>

            {/* Invite friends */}
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setShowInvite(true)} title="הזמן חברים">
              <UserPlus className="w-4 h-4" />
            </Button>

            {/* Admin dashboard link */}
            {currentUser?.user_type === 'admin' && (
              <a href="/admin" className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded-lg transition text-muted-foreground hover:text-primary" title="פתח דשבורד ניהול">
                <LayoutDashboard className="w-4 h-4" />
              </a>
            )}

            {/* What's new */}
            <WhatsNew />

            {/* Status */}
            {currentUser && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${status ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setShowStatusEditor(true)}
                title={status ? `${status.emoji} ${status.text}` : 'הגדר סטטוס'}
                aria-label="הגדר סטטוס"
              >
                {status ? <span className="text-base leading-none">{status.emoji}</span> : <Smile className="w-4 h-4" />}
              </Button>
            )}

            {/* User avatar dropdown */}
            {currentUser && (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted transition"
                  title={`${currentUser.name} — לחץ לאפשרויות`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow ring-2 ring-primary/30"
                    style={{ backgroundColor: currentUser.avatar_color }}
                  >
                    {currentUser.avatar_url
                      ? <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full rounded-full object-cover" />
                      : currentUser.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                </button>

                {/* Dropdown */}
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-border/60 rounded-xl shadow-xl z-50 overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2.5 border-b border-border/30 bg-muted/20">
                    <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.points.toLocaleString()} נקודות · רמה {currentUser.level}</p>
                  </div>
                  <button onClick={() => setShowStatusEditor(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition text-right">
                    <Smile className="w-4 h-4 text-muted-foreground" /> עדכן סטטוס
                  </button>
                  <button onClick={() => setShowThemePicker(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition text-right">
                    <Palette className="w-4 h-4 text-muted-foreground" /> ערכת נושא
                  </button>
                  {currentUser.user_type === 'admin' && (
                    <a href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition">
                      <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> דשבורד ניהול
                    </a>
                  )}
                  <div className="border-t border-border/30" />
                  <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-destructive transition text-right">
                    <LogOut className="w-4 h-4" /> יציאה
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Invite modal */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showThemePicker && <ChatThemePicker currentThemeId={themeId} onSelect={setTheme} onClose={() => setShowThemePicker(false)} />}
      {/* Status editor modal */}
      {showStatusEditor && currentUser && (
        <UserStatusEditor userId={currentUser.id} onClose={() => setShowStatusEditor(false)} />
      )}
      {/* Streak milestone toast */}
      {streakToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-400">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl px-6 py-3 shadow-2xl font-bold text-sm flex items-center gap-2">
            <span className="text-xl">🔥</span>
            {streakToast}
          </div>
        </div>
      )}
    </>
  )
}

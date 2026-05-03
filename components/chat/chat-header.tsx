"use client"

import { useEffect, useState } from 'react'
import { Users, LogOut, Search, Moon, Sun, Smile, LayoutDashboard, UserPlus, Palette, ChevronDown, Settings, X, CheckSquare } from 'lucide-react'
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
  onShowOnboarding?: () => void
}

export function ChatHeader({ currentUser, onlineCount, onLogout, onToggleSearch, onAvatarColorChange, onShowOnboarding }: ChatHeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [showStatusEditor, setShowStatusEditor] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const { themeId, setTheme } = useChatTheme()
  const [streakToast, setStreakToast] = useState<string | null>(null)
  const { streak, isNewDay } = useStreak()
  const { status } = useUserStatus(currentUser?.id || '')
  const [showMobileSettings, setShowMobileSettings] = useState(false)

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
            <span className="hidden sm:block"><StreakBadge streak={streak} compact /></span>
            {/* Avatar color picker */}
            {currentUser && onAvatarColorChange && (
              <span className="hidden sm:block"><AvatarPicker currentUser={currentUser} onColorChange={onAvatarColorChange} /></span>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">

            {/* === Desktop: full controls === */}
            <div className="hidden sm:flex items-center gap-1">
              <ConnectionStatus />
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full ml-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-online" />
                <Users className="w-4 h-4 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium" aria-label={`${onlineCount} משתמשים מחוברים`}>{onlineCount}</span>
                <span className="text-xs text-muted-foreground hidden md:block">מחוברים</span>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleSearch} title="חיפוש הודעות (Ctrl+F)" aria-label="חיפוש">
                <Search className="w-4 h-4" />
              </Button>
              <div className="relative"><BackgroundPicker /></div>
              {currentUser && <NotificationBell currentUserId={currentUser.id} currentUserName={currentUser.name} />}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleDarkMode} title={isDark ? 'מצב בהיר' : 'מצב כהה'} aria-label={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setShowThemePicker(true)} title="ערכת נושא">
                <Palette className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setShowInvite(true)} title="הזמן חברים">
                <UserPlus className="w-4 h-4" />
              </Button>
              {currentUser?.user_type === 'admin' && (
                <a href="/admin" className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded-lg transition text-muted-foreground hover:text-primary" title="פתח דשבורד ניהול">
                  <LayoutDashboard className="w-4 h-4" />
                </a>
              )}
              <WhatsNew />
              {currentUser && (
                <Button variant="ghost" size="icon" className={`h-9 w-9 ${status ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setShowStatusEditor(true)} title={status ? `${status.emoji} ${status.text}` : 'הגדר סטטוס'} aria-label="הגדר סטטוס">
                  {status ? <span className="text-base leading-none">{status.emoji}</span> : <Smile className="w-4 h-4" />}
                </Button>
              )}
              {currentUser && (
                <div className="relative group">
                  <button className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted transition" title={`${currentUser.name} — לחץ לאפשרויות`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow ring-2 ring-primary/30" style={{ backgroundColor: currentUser.avatar_color }}>
                      {currentUser.avatar_url ? <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full rounded-full object-cover" /> : currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-border/60 rounded-xl shadow-xl z-50 overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2.5 border-b border-border/30 bg-muted/20">
                      <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                      <p className="text-xs text-muted-foreground">{currentUser.points.toLocaleString()} נקודות · רמה {currentUser.level}</p>
                    </div>
                    {onShowOnboarding && (
                      <button onClick={onShowOnboarding} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition text-right">
                        <CheckSquare className="w-4 h-4 text-primary" /> צעדים ראשונים
                      </button>
                    )}
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

            {/* === Mobile: minimal controls + settings sheet === */}
            <div className="flex sm:hidden items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleSearch} aria-label="חיפוש">
                <Search className="w-4 h-4" />
              </Button>
              {currentUser && <NotificationBell currentUserId={currentUser.id} currentUserName={currentUser.name} />}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowMobileSettings(true)} aria-label="הגדרות">
                <Settings className="w-4 h-4" />
              </Button>
              {currentUser && (
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow ring-2 ring-primary/30"
                  style={{ backgroundColor: currentUser.avatar_color }}
                  onClick={() => setShowMobileSettings(true)}
                  aria-label={currentUser.name}
                >
                  {currentUser.avatar_url ? <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full rounded-full object-cover" /> : currentUser.name.charAt(0).toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile settings sheet */}
      {showMobileSettings && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:hidden" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileSettings(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 pt-2 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">הגדרות</h3>
                <button onClick={() => setShowMobileSettings(false)} className="p-1.5 rounded-lg hover:bg-muted transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {currentUser && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shadow" style={{ backgroundColor: currentUser.avatar_color }}>
                    {currentUser.avatar_url ? <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full rounded-full object-cover" /> : currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.points.toLocaleString()} נקודות · רמה {currentUser.level}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    {onlineCount}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button onClick={toggleDarkMode} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  {isDark ? 'בהיר' : 'כהה'}
                </button>
                <button onClick={() => { setShowThemePicker(true); setShowMobileSettings(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  <Palette className="w-5 h-5" />
                  נושא
                </button>
                {currentUser && (
                  <button onClick={() => { setShowStatusEditor(true); setShowMobileSettings(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                    {status ? <span className="text-xl leading-none">{status.emoji}</span> : <Smile className="w-5 h-5" />}
                    סטטוס
                  </button>
                )}
                <button onClick={() => { setShowInvite(true); setShowMobileSettings(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  <UserPlus className="w-5 h-5" />
                  הזמן
                </button>
                {onShowOnboarding && (
                  <button onClick={() => { onShowOnboarding(); setShowMobileSettings(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition text-xs font-medium text-primary">
                    <CheckSquare className="w-5 h-5" />
                    מדריך
                  </button>
                )}
                {currentUser?.user_type === 'admin' && (
                  <a href="/admin" onClick={() => setShowMobileSettings(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition text-xs font-medium text-amber-600 dark:text-amber-400">
                    <LayoutDashboard className="w-5 h-5" />
                    ניהול
                  </a>
                )}
              </div>
              <div className="border-t border-border/30 my-3" />
              <button onClick={() => { onLogout(); setShowMobileSettings(false) }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition font-medium">
                <LogOut className="w-4 h-4" />
                יציאה מהצ׳אט
              </button>
            </div>
          </div>
        </div>
      )}

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

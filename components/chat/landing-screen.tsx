"use client"

import { useState } from 'react'
import { Users, MessageCircle, Crown, Mail, Sparkles, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CommunityLogo } from './community-logo'

interface LandingScreenProps {
  onSelectMode: (mode: 'guest' | 'subscriber' | 'newsletter') => void
  onlineCount: number
}

export function LandingScreen({ onSelectMode, onlineCount }: LandingScreenProps) {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [isLoadingFacebook, setIsLoadingFacebook] = useState(false)

  const getReturnUrl = () => {
    try {
      if (window !== window.top) {
        return window.top!.location.href
      }
    } catch { }
    return window.location.href
  }

  const handleGoogleLogin = () => {
    setIsLoadingGoogle(true)
    const returnUrl = getReturnUrl()
    const loginUrl = `https://nituk-beclick-chat.vercel.app/login?provider=google&return=${encodeURIComponent(returnUrl)}`
    if (window !== window.top) {
      window.top!.location.href = loginUrl
    } else {
      window.location.href = loginUrl
    }
  }

  const handleFacebookLogin = () => {
    setIsLoadingFacebook(true)
    const returnUrl = getReturnUrl()
    const loginUrl = `https://nituk-beclick-chat.vercel.app/login?provider=facebook&return=${encodeURIComponent(returnUrl)}`
    if (window !== window.top) {
      window.top!.location.href = loginUrl
    } else {
      window.location.href = loginUrl
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8 pb-10 relative overflow-y-auto overflow-x-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <CommunityLogo size={72} animated showText={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">ניתוק בקליק</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            השוואת מחירי סלולר חכמה
            <span className="bg-gradient-to-r from-secondary to-primary text-white px-2 py-0.5 rounded-full text-xs font-semibold">AI</span>
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full pulse-online" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{onlineCount}</span>
            <span className="text-xs text-muted-foreground">מחוברים</span>
          </div>
          <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1.5">
            <span className="text-xs">💬</span>
            <span className="text-xs text-muted-foreground">קהילה פעילה 24/7</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1.5">
            <span className="text-xs">🔒</span>
            <span className="text-xs text-muted-foreground">מוגן ובטוח</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoadingGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-[1.01] shadow-sm disabled:opacity-70"
          >
            {isLoadingGoogle ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            המשך עם Google
          </button>

          <button
            onClick={handleFacebookLogin}
            disabled={isLoadingFacebook}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] rounded-xl px-4 py-3 font-medium text-white hover:bg-[#166FE5] transition-all hover:scale-[1.01] shadow-sm disabled:opacity-70"
          >
            {isLoadingFacebook ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            המשך עם Facebook
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">או</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Mode selection */}
        <div className="space-y-3">
          {/* Guest */}
          <button
            onClick={() => onSelectMode('guest')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-all hover:scale-[1.02] group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-right flex-1">
              <h3 className="font-semibold mb-0.5">כניסה כאורח</h3>
              <p className="text-sm text-muted-foreground">הצטרפו לשיחה ללא הרשמה</p>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Subscriber */}
          <div>
            <button
              onClick={() => onSelectMode('subscriber')}
              className="w-full glass rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-all hover:scale-[1.02] group border border-primary/30"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold">כניסת מנויים</h3>
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">פרימיום</span>
                </div>
                <p className="text-sm text-muted-foreground">גישה מלאה עם תג מנוי מאומת</p>
                <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  מקבלים עדכון חודשי על כל החבילות והחברות
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-primary" />
            </button>
            <p className="text-center text-xs text-muted-foreground mt-1.5">
              אין לך מנוי?{' '}
              <button
                onClick={() => onSelectMode('newsletter')}
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium"
              >
                לחץ כאן להרשמה בחינם
              </button>
            </p>
          </div>

          {/* Newsletter */}
          <button
            onClick={() => onSelectMode('newsletter')}
            className="w-full rounded-xl p-4 flex items-center gap-4 transition-all hover:scale-[1.02] group border-2 border-dashed border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-right flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">הרשמה לניוזלטר</h3>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full font-medium shrink-0">חינם לגמרי</span>
              </div>
              <p className="text-sm text-muted-foreground">קבלו עדכוני חבילות + תג מיוחד בקהילה</p>
            </div>
            <Mail className="w-5 h-5 text-emerald-500 shrink-0" />
          </button>
        </div>

        {/* Feature highlights + Testimonials — collapsed by default */}
        {false && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { emoji: '🔥', label: 'עסקאות חמות' },
                { emoji: '🏆', label: 'דירוג שבועי' },
                { emoji: '🎤', label: 'הודעות קוליות' },
                { emoji: '🔖', label: 'שמירת הודעות' },
                { emoji: '📊', label: 'סקרים חיים' },
                { emoji: '🎯', label: 'הישגים' },
                { emoji: '💬', label: 'DM פרטי' },
                { emoji: '🌐', label: 'תרגום מיידי' },
                { emoji: '🔔', label: 'התראות חכמות' },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-1 bg-muted/20 rounded-xl py-2.5 px-1 text-center border border-border/20 hover:bg-primary/5 hover:border-primary/20 transition">
                  <span className="text-xl">{f.emoji}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wide mb-3">מה אומרים החברים?</p>
              {[
                { name: 'נועה ל.', avatar: '🟣', text: 'חסכתי 80₪ בחודש בעסקה שמצאתי כאן! ממליצה לכולם 🙏', stars: 5 },
                { name: 'דוד מ.', avatar: '🔵', text: 'הקהילה מדהימה, תמיד יש מי שיעזור במהירות ✨', stars: 5 },
                { name: 'שירה כ.', avatar: '🟢', text: 'עברתי ספק תוך 10 דקות בזכות הטיפ שקיבלתי כאן!', stars: 5 },
              ].map(t => (
                <div key={t.name} className="bg-muted/20 rounded-xl p-3 border border-border/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{t.avatar}</span>
                    <span className="text-xs font-semibold">{t.name}</span>
                    <span className="text-amber-400 text-xs">{'⭐'.repeat(t.stars)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Share button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              const url = 'https://nituk-beclick-chat.vercel.app'
              const text = 'הצטרף לקהילת חיבור וניתוק בקליק — השוואת מחירים חכמה!'
              if (navigator.share) {
                navigator.share({ title: 'חיבור וניתוק בקליק', text, url })
              } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
              }
            }}
            className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition font-medium"
          >
            📤 שתף עם חברים וקבל 50 נקודות בונוס!
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-3">
          בכניסה אתם מסכימים לתנאי השימוש ומדיניות הפרטיות
        </p>
      </div>
    </div>
  )
}

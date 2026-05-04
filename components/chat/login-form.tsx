"use client"

import { useState, useEffect } from 'react'
import { ArrowRight, User, Mail, Loader2, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { UserType } from '@/lib/chat-types'
import { getRandomAvatarColor, AVATAR_COLORS } from '@/lib/chat-types'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  mode: 'guest' | 'subscriber' | 'newsletter'
  onSubmit: (name: string, email: string | null, userType: UserType, avatarColor: string) => Promise<void>
  onBack: () => void
  isLoading: boolean
}

const MODE_CONFIG = {
  guest: {
    title: 'כניסה כאורח',
    subtitle: 'הזינו שם תצוגה להצטרפות לצ׳אט',
    requireEmail: false,
    userType: 'guest' as UserType,
  },
  subscriber: {
    title: 'כניסת מנויים',
    subtitle: 'היכנסו עם Google או קבלו קישור למייל',
    requireEmail: true,
    userType: 'subscriber' as UserType,
  },
  newsletter: {
    title: 'הרשמה לניוזלטר',
    subtitle: 'היכנסו עם Google או קבלו קישור למייל',
    requireEmail: true,
    userType: 'newsletter' as UserType,
  },
}

export function LoginForm({ mode, onSubmit, onBack, isLoading }: LoginFormProps) {
  const config = MODE_CONFIG[mode]
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedColor, setSelectedColor] = useState(getRandomAvatarColor())
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [step, setStep] = useState<'details' | 'sent'>('details')
  const [isSending, setIsSending] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [returningName, setReturningName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(`nituk_remember_${mode}`)
    if (saved) {
      try {
        const p = JSON.parse(saved)
        setName(p.name || '')
        setEmail(p.email || '')
        if (p.color) setSelectedColor(p.color)
        setRememberMe(true)
      } catch { /* ignore */ }
    }
  }, [mode])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  // ── Check if email belongs to existing subscriber ──────────────────────
  const checkExistingUser = async (emailToCheck: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_users')
        .select('id, name, user_type')
        .eq('email', emailToCheck.trim().toLowerCase())
        .limit(1)
      return data?.[0] ?? null
    } catch {
      return null
    }
  }

  // ── Google OAuth ───────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setError('')
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
    } catch {
      setError('שגיאה בכניסה עם Google')
      setIsGoogleLoading(false)
    }
  }

  // ── Magic link ─────────────────────────────────────────────────────────
  const sendMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) { setError('נא להזין אימייל תקין'); return }

    setIsSending(true)
    setError('')

    try {
      const supabase = createClient()
      const trimmedEmail = email.trim().toLowerCase()

      // ── Check if returning subscriber ──────────────────────────────
      const existingUser = await checkExistingUser(trimmedEmail)
      const isReturning = !!existingUser
      setIsReturningUser(isReturning)
      if (existingUser?.name) setReturningName(existingUser.name)

      const displayName = name.trim()
        || (isReturning ? existingUser!.name : trimmedEmail.split('@')[0])
      const intendedType = isReturning
        ? (existingUser!.user_type ?? config.userType)
        : config.userType

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
          data: {
            display_name: displayName,
            intended_type: intendedType,
            avatar_color: selectedColor,
          },
        },
      })

      if (otpError) {
        const msg = otpError.message?.toLowerCase() || ''
        if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('הגענו למגבלת מיילים. נסו כניסה עם Google 👆')
        } else if (msg.includes('smtp') || msg.includes('sending') || msg.includes('email')) {
          setError('שגיאה בשליחת המייל — נסו כניסה עם Google 👆')
        } else if (msg.includes('invalid') || msg.includes('not found')) {
          setError('כתובת מייל לא תקינה')
        } else {
          setError('שגיאה בשליחה, נסו שוב')
        }
        return
      }

      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({
          name: displayName, email: email.trim(), color: selectedColor
        }))
      }

      setStep('sent')
      setCountdown(60)
    } catch {
      setError('שגיאה בשליחה, נסה שוב')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!config.requireEmail) {
      if (!name.trim()) { setError('נא להזין שם'); return }
      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({ name: name.trim(), color: selectedColor }))
      }
      await onSubmit(name.trim(), null, config.userType, selectedColor)
      return
    }
    await sendMagicLink()
  }

  // ── "Magic link sent" step ─────────────────────────────────────────────
  if (step === 'sent') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" onClick={() => setStep('details')} className="mb-6 text-muted-foreground">
            <ArrowRight className="w-4 h-4 ml-2" /> שינוי אימייל
          </Button>
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>

            {isReturningUser && returningName ? (
              <div className="mb-3 flex items-center justify-center gap-1 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                ברוך הבא בחזרה, {returningName}!
              </div>
            ) : null}

            <h2 className="text-xl font-bold mb-2">בדקו את תיבת המייל</h2>
            <p className="text-sm text-muted-foreground mb-1">שלחנו קישור כניסה אל:</p>
            <p className="text-base font-semibold text-primary mb-4" dir="ltr">{email}</p>

            <div className="bg-muted/30 rounded-xl p-4 mb-5 text-right">
              <p className="text-sm font-medium mb-2">כיצד להיכנס:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>פתחו את תיבת המייל שלכם</li>
                <li>חפשו מייל מ-{'"'}ניתוק בקליק{'"'} (בדקו גם ספאם)</li>
                <li>לחצו על כפתור הכניסה בתוך המייל</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 justify-center mb-4">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
              <span className="text-xs text-muted-foreground mr-1">ממתין לאישור...</span>
            </div>

            {error && <p className="text-sm text-destructive mb-3">{error}</p>}
            {countdown > 0
              ? <p className="text-sm text-muted-foreground">שליחה חוזרת בעוד {countdown} שניות</p>
              : <Button variant="outline" size="sm" onClick={sendMagicLink} disabled={isSending} className="w-full">
                  {isSending ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" />שולח...</> : 'שלח קישור חדש'}
                </Button>
            }
          </div>
        </div>
      </div>
    )
  }

  // ── Details step ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Button variant="ghost" onClick={onBack} className="mb-6 text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4 ml-2" /> חזרה
        </Button>

        <div className="glass rounded-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>

          {/* Guest: name only */}
          {!config.requireEmail ? (
            <form onSubmit={handleSubmitDetails} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">שם תצוגה</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="הזינו את שמכם" className="pr-10" disabled={isLoading} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setRememberMe(!rememberMe)}
                  className={cn("w-5 h-5 rounded border-2 transition-all flex items-center justify-center shrink-0",
                    rememberMe ? "bg-primary border-primary" : "border-muted-foreground/50")}>
                  {rememberMe && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <label onClick={() => setRememberMe(!rememberMe)} className="text-sm cursor-pointer text-muted-foreground">
                  זכור אותי
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">צבע אווטאר</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setSelectedColor(color)}
                      className={cn("w-8 h-8 rounded-full transition-all",
                        selectedColor === color && "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110")}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                {isLoading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מתחבר...</> : 'הצטרפות לצ׳אט'}
              </Button>
            </form>
          ) : (
            /* Subscriber / Newsletter: Google first, then email */
            <div className="space-y-4">
              {/* Google — primary, no rate limits */}
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-70"
              >
                {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {isGoogleLoading ? 'מחבר...' : 'כניסה מהירה עם Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">או</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email magic link — secondary */}
              {!showEmailForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl px-4 py-3 hover:bg-muted/30 transition"
                >
                  <Mail className="w-4 h-4" />
                  כניסה עם קישור למייל
                </button>
              ) : (
                <form onSubmit={handleSubmitDetails} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" className="pr-10" dir="ltr"
                      disabled={isSending} autoFocus />
                  </div>
                  {error && (
                    <div className={cn("text-sm text-center p-2 rounded-lg",
                      error.includes('Google') ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-destructive")}>
                      {error}
                    </div>
                  )}
                  <Button type="submit" disabled={isSending}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                    {isSending
                      ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />בודק ושולח...</>
                      : <><Mail className="w-4 h-4 ml-2" />שלח קישור כניסה</>}
                  </Button>
                </form>
              )}

              {error && !showEmailForm && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

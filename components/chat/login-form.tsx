"use client"

import { useState, useEffect } from 'react'
import { ArrowRight, User, Mail, Loader2, Check, ExternalLink } from 'lucide-react'
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
    subtitle: 'הזינו את האימייל של המנוי שלכם',
    requireEmail: true,
    userType: 'subscriber' as UserType,
  },
  newsletter: {
    title: 'הרשמה לניוזלטר',
    subtitle: 'הזינו אימייל לקבלת עדכונים ותג מיוחד',
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
  const [countdown, setCountdown] = useState(0)

  // Load saved credentials
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

  // Countdown for resend
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const sendMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('נא להזין אימייל תקין')
      return
    }
    if (mode !== 'subscriber' && !name.trim()) {
      setError('נא להזין שם')
      return
    }

    setIsSending(true)
    setError('')

    try {
      const supabase = createClient()
      const trimmedEmail = email.trim().toLowerCase()

      // Store name + mode in metadata so auth/callback can use it
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: name.trim() || trimmedEmail.split('@')[0],
            intended_type: config.userType,
            avatar_color: selectedColor,
          },
        },
      })

      if (otpError) {
        if (otpError.message?.includes('rate limit')) {
          setError('נסו שוב בעוד מספר דקות')
        } else {
          setError(otpError.message || 'שגיאה בשליחת הקישור')
        }
        return
      }

      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({
          name: name.trim(), email: email.trim(), color: selectedColor
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

    // Guest mode — no email needed
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
            <ArrowRight className="w-4 h-4 ml-2" />
            שינוי אימייל
          </Button>

          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">בדקו את תיבת המייל</h2>
            <p className="text-sm text-muted-foreground mb-1">שלחנו קישור כניסה אל:</p>
            <p className="text-base font-semibold text-primary mb-4" dir="ltr">{email}</p>

            <div className="bg-muted/30 rounded-xl p-4 mb-5 text-right">
              <p className="text-sm font-medium mb-2">כיצד להיכנס:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>פתחו את תיבת המייל שלכם</li>
                <li>חפשו מייל מ-Supabase (בדקו גם ספאם)</li>
                <li>לחצו על הכפתור "Log In" בתוך המייל</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 justify-center mb-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה
        </Button>

        <div className="glass rounded-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>

          <form onSubmit={handleSubmitDetails} className="space-y-4">
            {/* Name — guest and newsletter modes */}
            {mode !== 'subscriber' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">שם תצוגה</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="הזינו את שמכם" className="pr-10"
                    disabled={isLoading || isSending} />
                </div>
              </div>
            )}

            {/* Email */}
            {config.requireEmail && (
              <div className="space-y-2">
                <label className="text-sm font-medium">אימייל</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com" className="pr-10" dir="ltr"
                    disabled={isLoading || isSending} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === 'subscriber' ? 'נשלח קישור כניסה לאימייל' : 'נשלח קישור אימות'}
                </p>
              </div>
            )}

            {/* Remember me */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setRememberMe(!rememberMe)}
                className={cn("w-5 h-5 rounded border-2 transition-all flex items-center justify-center shrink-0",
                  rememberMe ? "bg-primary border-primary" : "border-muted-foreground/50 hover:border-primary")}>
                {rememberMe && <Check className="w-3 h-3 text-primary-foreground" />}
              </button>
              <label onClick={() => setRememberMe(!rememberMe)}
                className="text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                זכור אותי בפעם הבאה
              </label>
            </div>

            {/* Avatar color — guest and newsletter */}
            {mode !== 'subscriber' && (
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
            )}

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button type="submit" disabled={isLoading || isSending}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              {isSending
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />שולח קישור...</>
                : isLoading
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מתחבר...</>
                : config.requireEmail
                ? <><Mail className="w-4 h-4 ml-2" />שלח קישור כניסה</>
                : 'הצטרפות לצ׳אט'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

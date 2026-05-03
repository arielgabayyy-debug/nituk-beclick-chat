"use client"

import { useState, useEffect } from 'react'
import { ArrowRight, User, Mail, Loader2, Check, ShieldCheck, RefreshCw, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { UserType } from '@/lib/chat-types'
import { getRandomAvatarColor, AVATAR_COLORS } from '@/lib/chat-types'

// Admin email - this email will automatically become admin
const ADMIN_EMAIL = 'nitukbeclick@gmail.com'

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
    requireVerification: false,
    userType: 'guest' as UserType
  },
  subscriber: {
    title: 'כניסת מנויים',
    subtitle: 'הזינו את פרטי המנוי שלכם',
    requireEmail: true,
    requireVerification: true,
    userType: 'subscriber' as UserType
  },
  newsletter: {
    title: 'הרשמה לניוזלטר',
    subtitle: 'הזינו אימייל לקבלת עדכונים ותג מיוחד',
    requireEmail: true,
    requireVerification: true,
    userType: 'newsletter' as UserType
  }
}

export function LoginForm({ mode, onSubmit, onBack, isLoading }: LoginFormProps) {
  const config = MODE_CONFIG[mode]
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedColor, setSelectedColor] = useState(getRandomAvatarColor())
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Magic link flow states
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)

  // Load saved credentials on mount
  useEffect(() => {
    const savedData = localStorage.getItem(`nituk_remember_${mode}`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setName(parsed.name || '')
        setEmail(parsed.email || '')
        if (parsed.color) setSelectedColor(parsed.color)
        setRememberMe(true)
      } catch {
        // Invalid data, ignore
      }
    }
  }, [mode])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // ── Auto-detect when user clicks the magic link in their email ──────────
  // Supabase fires onAuthStateChange in ALL open tabs of the same origin,
  // so clicking the link in any tab/window triggers login here automatically.
  useEffect(() => {
    if (step !== 'verify') return

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && !isVerified) {
          setIsVerified(true)

          if (rememberMe) {
            localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              color: selectedColor
            }))
          } else {
            localStorage.removeItem(`nituk_remember_${mode}`)
          }

          const verifiedEmail = session.user.email || email.trim()
          const isAdminEmail = verifiedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          const finalUserType: UserType = isAdminEmail ? 'admin' : config.userType

          await onSubmit(name.trim(), verifiedEmail, finalUserType, selectedColor)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [step, name, email, selectedColor, config.userType, mode, rememberMe, isVerified, onSubmit])
  // ─────────────────────────────────────────────────────────────────────────

  const handleSendLink = async () => {
    setError('')

    if (!name.trim()) { setError('נא להזין שם'); return }
    if (!email.trim() || !email.includes('@')) { setError('נא להזין אימייל תקין'); return }

    setIsSendingOtp(true)

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בשליחת הקוד')
        return
      }

      setStep('verify')
      setCountdown(60)
    } catch {
      setError('שגיאה בשליחת הקוד')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('נא להזין שם'); return }
    if (config.requireEmail && !email.trim()) { setError('נא להזין אימייל'); return }
    if (config.requireEmail && !email.includes('@')) { setError('נא להזין אימייל תקין'); return }

    if (config.requireVerification) {
      await handleSendLink()
    } else {
      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({
          name: name.trim(), email: email.trim(), color: selectedColor
        }))
      } else {
        localStorage.removeItem(`nituk_remember_${mode}`)
      }
      await onSubmit(name.trim(), config.requireEmail ? email.trim() : null, config.userType, selectedColor)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={step === 'verify' ? () => { setStep('details'); setIsVerified(false) } : onBack}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          {step === 'verify' ? 'שינוי אימייל' : 'חזרה'}
        </Button>

        {/* Form card */}
        <div className="glass rounded-2xl p-6">
          {step === 'details' ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-1">{config.title}</h2>
                <p className="text-sm text-muted-foreground">{config.subtitle}</p>
              </div>

              <form onSubmit={handleSubmitDetails} className="space-y-4">
                {/* Name input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">שם תצוגה</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="הזינו את שמכם"
                      className="pr-10"
                      disabled={isLoading || isSendingOtp}
                    />
                  </div>
                </div>

                {/* Email input */}
                {config.requireEmail && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">אימייל</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pr-10"
                        dir="ltr"
                        disabled={isLoading || isSendingOtp}
                      />
                    </div>
                    {config.requireVerification && (
                      <p className="text-xs text-muted-foreground">
                        נשלח אליכם קישור כניסה לאימייל
                      </p>
                    )}
                  </div>
                )}

                {/* Remember me */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={cn(
                      "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                      rememberMe ? "bg-primary border-primary" : "border-muted-foreground/50 hover:border-primary"
                    )}
                  >
                    {rememberMe && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <label
                    onClick={() => setRememberMe(!rememberMe)}
                    className="text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  >
                    זכור אותי בפעם הבאה
                  </label>
                </div>

                {/* Avatar color picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">צבע אווטאר</label>
                  <div className="flex gap-2 flex-wrap">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          selectedColor === color && "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-destructive text-center">{error}</p>}

                <Button
                  type="submit"
                  disabled={isLoading || isSendingOtp}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {isSendingOtp ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" />שולח קישור...</>
                  ) : isLoading ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מתחבר...</>
                  ) : config.requireVerification ? (
                    <><Mail className="w-4 h-4 ml-2" />שליחת קישור כניסה</>
                  ) : (
                    'הצטרפות לצ׳אט'
                  )}
                </Button>
              </form>
            </>
          ) : (
            // ── Magic link waiting screen ────────────────────────────────
            <>
              <div className="text-center py-4">
                {/* Animated envelope icon */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    {isVerified
                      ? <ShieldCheck className="w-12 h-12 text-emerald-500" />
                      : <MailCheck className="w-12 h-12 text-primary" />
                    }
                  </div>
                </div>

                {isVerified ? (
                  <>
                    <h2 className="text-xl font-bold mb-2 text-emerald-600">אומת בהצלחה! ✓</h2>
                    <p className="text-sm text-muted-foreground">מתחבר לצ׳אט...</p>
                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-4" />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold mb-2">בדקו את תיבת הדואר</h2>
                    <p className="text-sm text-muted-foreground mb-1">
                      שלחנו קישור כניסה אל:
                    </p>
                    <p className="text-sm font-semibold text-primary mb-4" dir="ltr">{email}</p>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-right mb-4">
                      <p className="text-sm text-blue-800 font-medium mb-1">איך זה עובד?</p>
                      <ol className="text-xs text-blue-700 space-y-1 list-none">
                        <li>📧 פתחו את המייל שקיבלתם</li>
                        <li>🔗 לחצו על &quot;Log In&quot; או הקישור שבו</li>
                        <li>✅ תיכנסו אוטומטית לצ׳אט!</li>
                      </ol>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">
                      לא מצאתם? בדקו ספאם/קידומי מכירות
                    </p>

                    {/* Resend */}
                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          שליחה חוזרת אפשרית בעוד {countdown} שניות
                        </p>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSendLink}
                          disabled={isSendingOtp}
                          className="text-xs"
                        >
                          {isSendingOtp
                            ? <><Loader2 className="w-3 h-3 ml-1 animate-spin" />שולח...</>
                            : <><RefreshCw className="w-3 h-3 ml-1" />שלח שוב</>
                          }
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, User, Mail, Loader2, Check, ShieldCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { UserType } from '@/lib/chat-types'
import { getRandomAvatarColor, AVATAR_COLORS } from '@/lib/chat-types'

const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com']

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
    userType: 'guest' as UserType,
  },
  subscriber: {
    title: 'כניסת מנויים',
    subtitle: 'הזינו את האימייל של המנוי שלכם',
    requireEmail: true,
    requireVerification: true,
    userType: 'subscriber' as UserType,
  },
  newsletter: {
    title: 'הרשמה לניוזלטר',
    subtitle: 'הזינו אימייל לקבלת עדכונים ותג מיוחד',
    requireEmail: true,
    requireVerification: true,
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

  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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

  // Countdown
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  // Focus first OTP input on step change
  useEffect(() => {
    if (step === 'verify') setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }, [step])

  const handleSendOtp = async () => {
    setError('')
    if (mode !== 'subscriber' && !name.trim()) { setError('נא להזין שם'); return }
    if (!email.trim() || !email.includes('@')) { setError('נא להזין אימייל תקין'); return }

    setIsSendingOtp(true)
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'שגיאה בשליחת הקוד'); return }

      setStep('verify')
      setCountdown(60)
      setOtpCode(['', '', '', '', '', ''])
    } catch {
      setError('שגיאה בשליחת הקוד')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    const code = otpCode.join('')
    if (code.length !== 6) { setError('נא להזין קוד בן 6 ספרות'); return }

    setIsVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'קוד שגוי')
        setOtpCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({ name: name.trim(), email: email.trim(), color: selectedColor }))
      } else {
        localStorage.removeItem(`nituk_remember_${mode}`)
      }

      const isAdmin = ADMIN_EMAILS.includes(email.trim().toLowerCase())
      // For subscriber mode without a name field, derive name from email prefix
      const resolvedName = name.trim() || email.trim().split('@')[0]
      await onSubmit(resolvedName, email.trim(), isAdmin ? 'admin' : config.userType, selectedColor)
    } catch {
      setError('שגיאה באימות הקוד')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otpCode]
    newOtp[index] = value
    setOtpCode(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      setTimeout(() => handleVerifyOtp(), 50)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (digits.length === 6) {
      setOtpCode(digits.split(''))
      inputRefs.current[5]?.focus()
      setTimeout(() => handleVerifyOtp(), 50)
    }
  }

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode !== 'subscriber' && !name.trim()) { setError('נא להזין שם'); return }
    if (config.requireEmail && !email.trim()) { setError('נא להזין אימייל'); return }
    if (config.requireEmail && !email.includes('@')) { setError('נא להזין אימייל תקין'); return }

    if (config.requireVerification) {
      await handleSendOtp()
    } else {
      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({ name: name.trim(), email: email.trim(), color: selectedColor }))
      } else {
        localStorage.removeItem(`nituk_remember_${mode}`)
      }
      await onSubmit(name.trim(), config.requireEmail ? email.trim() : null, config.userType, selectedColor)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Button
          variant="ghost"
          onClick={step === 'verify' ? () => setStep('details') : onBack}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          {step === 'verify' ? 'שינוי אימייל' : 'חזרה'}
        </Button>

        <div className="glass rounded-2xl p-6">
          {step === 'details' ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-1">{config.title}</h2>
                <p className="text-sm text-muted-foreground">{config.subtitle}</p>
              </div>

              <form onSubmit={handleSubmitDetails} className="space-y-4">
                {mode !== 'subscriber' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">שם תצוגה</label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={name} onChange={e => setName(e.target.value)}
                        placeholder="הזינו את שמכם" className="pr-10"
                        disabled={isLoading || isSendingOtp} />
                    </div>
                  </div>
                )}

                {config.requireEmail && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">אימייל</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com" className="pr-10" dir="ltr"
                        disabled={isLoading || isSendingOtp} />
                    </div>
                    <p className="text-xs text-muted-foreground">נשלח קוד אימות בן 6 ספרות לאימייל</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setRememberMe(!rememberMe)}
                    className={cn("w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                      rememberMe ? "bg-primary border-primary" : "border-muted-foreground/50 hover:border-primary")}>
                    {rememberMe && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <label onClick={() => setRememberMe(!rememberMe)}
                    className="text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                    זכור אותי בפעם הבאה
                  </label>
                </div>

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

                <Button type="submit" disabled={isLoading || isSendingOtp}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  {isSendingOtp ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />שולח קוד...</>
                    : isLoading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מתחבר...</>
                    : config.requireVerification ? <><Mail className="w-4 h-4 ml-2" />שליחת קוד אימות</>
                    : 'הצטרפות לצ׳אט'}
                </Button>
              </form>
            </>
          ) : (
            // ── OTP step ─────────────────────────────────────────────────
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-1">אימות אימייל</h2>
                <p className="text-sm text-muted-foreground">שלחנו קוד בן 6 ספרות אל:</p>
                <p className="text-sm font-semibold text-primary mt-1" dir="ltr">{email}</p>
                <p className="text-xs text-muted-foreground mt-1">בדקו גם ספאם / קידומי מכירות</p>
              </div>

              <div className="space-y-5">
                {/* OTP inputs */}
                <div className="flex justify-center gap-2" dir="ltr">
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      disabled={isVerifying}
                      className={cn(
                        "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all",
                        "bg-muted/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                        digit ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                {error && <p className="text-sm text-destructive text-center">{error}</p>}

                <Button onClick={handleVerifyOtp}
                  disabled={isVerifying || otpCode.some(d => !d)}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  {isVerifying
                    ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מאמת...</>
                    : <><ShieldCheck className="w-4 h-4 ml-2" />אימות והצטרפות</>}
                </Button>

                <div className="text-center">
                  {countdown > 0
                    ? <p className="text-sm text-muted-foreground">שליחה חוזרת בעוד {countdown} שניות</p>
                    : <Button variant="ghost" size="sm" onClick={handleSendOtp} disabled={isSendingOtp}>
                        {isSendingOtp
                          ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" />שולח...</>
                          : <><RefreshCw className="w-4 h-4 ml-1" />שלח קוד חדש</>}
                      </Button>
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

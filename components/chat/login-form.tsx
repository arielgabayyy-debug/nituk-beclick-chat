"use client"

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, User, Mail, Loader2, Check, ShieldCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
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
  
  // OTP verification states
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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

  const handleSendOtp = async () => {
    setError('')
    
    if (!name.trim()) {
      setError('נא להזין שם')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('נא להזין אימייל תקין')
      return
    }

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
      setCountdown(60) // Can resend after 60 seconds
      setOtpCode(['', '', '', '', '', ''])
      
      // Focus first input after transition
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch {
      setError('שגיאה בשליחת הקוד')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    const code = otpCode.join('')
    
    if (code.length !== 6) {
      setError('נא להזין קוד בן 6 ספרות')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'קוד שגוי')
        setOtpCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          color: selectedColor
        }))
      } else {
        localStorage.removeItem(`nituk_remember_${mode}`)
      }

      // Check if this is the admin email
      const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
      const finalUserType: UserType = isAdminEmail ? 'admin' : config.userType

      // Proceed with login
      await onSubmit(
        name.trim(),
        email.trim(),
        finalUserType,
        selectedColor
      )
    } catch {
      setError('שגיאה באימות הקוד')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otpCode]
    newOtp[index] = value
    setOtpCode(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      handleVerifyOtp()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtpCode(newOtp)
      inputRefs.current[5]?.focus()
      
      // Auto-verify after paste
      setTimeout(() => handleVerifyOtp(), 100)
    }
  }

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('נא להזין שם')
      return
    }

    if (config.requireEmail && !email.trim()) {
      setError('נא להזין אימייל')
      return
    }

    if (config.requireEmail && email && !email.includes('@')) {
      setError('נא להזין אימייל תקין')
      return
    }

    // If verification is required, send OTP
    if (config.requireVerification) {
      await handleSendOtp()
    } else {
      // For guests, proceed directly
      if (rememberMe) {
        localStorage.setItem(`nituk_remember_${mode}`, JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          color: selectedColor
        }))
      } else {
        localStorage.removeItem(`nituk_remember_${mode}`)
      }

      await onSubmit(
        name.trim(), 
        config.requireEmail ? email.trim() : null, 
        config.userType,
        selectedColor
      )
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
          onClick={step === 'verify' ? () => setStep('details') : onBack}
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

                {/* Email input (if required) */}
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
                        נשלח אליכם קוד אימות בן 6 ספרות
                      </p>
                    )}
                  </div>
                )}

                {/* Remember me checkbox */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={cn(
                      "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                      rememberMe 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground/50 hover:border-primary"
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

                {/* Error message */}
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading || isSendingOtp}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      שולח קוד אימות...
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מתחבר...
                    </>
                  ) : config.requireVerification ? (
                    <>
                      <Mail className="w-4 h-4 ml-2" />
                      שליחת קוד אימות
                    </>
                  ) : (
                    'הצטרפות לצ׳אט'
                  )}
                </Button>
              </form>
            </>
          ) : (
            // OTP Verification Step
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-1">אימות אימייל</h2>
                <p className="text-sm text-muted-foreground">
                  שלחנו קוד בן 6 ספרות ל-
                </p>
                <p className="text-sm font-medium text-primary" dir="ltr">
                  {email}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  בדקו את תיבת הדואר הנכנס (ואולי ספאם)
                </p>
              </div>

              <div className="space-y-6">
                {/* OTP Input */}
                <div className="flex justify-center gap-2" dir="ltr">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={cn(
                        "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all",
                        "bg-muted/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                        digit ? "border-primary" : "border-muted-foreground/30"
                      )}
                      disabled={isVerifying}
                    />
                  ))}
                </div>

                {/* Error message */}
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                {/* Verify button */}
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otpCode.some(d => !d)}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ��אמת...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 ml-2" />
                      אימות והצטרפות
                    </>
                  )}
                </Button>

                {/* Resend button */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ניתן לשלוח שוב בעוד {countdown} שניות
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="text-sm"
                    >
                      {isSendingOtp ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 ml-2" />
                      )}
                      שליחת קוד חדש
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

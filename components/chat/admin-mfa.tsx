"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Smartphone, KeyRound, CheckCircle, Loader2, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react'
import { CommunityLogo } from './community-logo'

const ADMIN_EMAILS = [
  'nitukbeclick@gmail.com',
  'arielgabayyy@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

interface AdminMFAProps {
  userEmail: string
  onVerified: () => void
  onLogout: () => void
}

type MFAStep = 'checking' | 'enroll' | 'verify' | 'done'

export function AdminMFA({ userEmail, onVerified, onLogout }: AdminMFAProps) {
  const supabase = createClient()

  const [step, setStep]           = useState<MFAStep>('checking')
  const [qrCode, setQrCode]       = useState('')
  const [secret, setSecret]       = useState('')
  const [factorId, setFactorId]   = useState('')
  const [code, setCode]           = useState(['', '', '', '', '', ''])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── On mount: check current AAL and enrolled factors ────────────────────
  useEffect(() => {
    checkMFAStatus()
  }, [])

  async function checkMFAStatus() {
    setStep('checking')
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      // Already at aal2 — fully verified
      if (aal?.currentLevel === 'aal2') {
        setStep('done')
        onVerified()
        return
      }

      // Check if user has any TOTP factors enrolled
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactors = factors?.totp || []

      if (totpFactors.length > 0) {
        // Has factor, needs to verify
        setFactorId(totpFactors[0].id)
        setStep('verify')
      } else {
        // No factor — needs to enroll
        await startEnrollment()
      }
    } catch (err) {
      console.error('MFA check error:', err)
      setStep('enroll')
      await startEnrollment()
    }
  }

  async function startEnrollment() {
    setLoading(true)
    setError('')
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Admin — ${userEmail}`,
      })
      if (enrollError) throw enrollError

      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('enroll')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהגדרת MFA')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode(codeString: string) {
    if (codeString.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeErr) throw challengeErr

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: codeString,
      })
      if (verifyErr) throw verifyErr

      setStep('done')
      onVerified()
    } catch (err: unknown) {
      setError('קוד שגוי — נסה שוב')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ── OTP Input Handling ───────────────────────────────────────────────────
  function handleDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    const full = newCode.join('')
    if (full.length === 6) verifyCode(full)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const full = code.join('')
      if (full.length === 6) verifyCode(full)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      verifyCode(pasted)
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading / Done ───────────────────────────────────────────────────────
  if (step === 'checking' || step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          <p className="text-slate-400 text-sm">בודק הרשאות מנהל...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CommunityLogo size={64} showText={false} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                <Shield className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">אימות דו-שלבי</h1>
          <p className="text-slate-400 text-sm">גישת מנהל מאובטחת — {userEmail}</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

          {/* ── ENROLL STEP ──────────────────────────────────────────── */}
          {step === 'enroll' && (
            <>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700/50">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">הגדרת Google Authenticator</h2>
                  <p className="text-slate-400 text-xs">סרוק פעם אחת, הגן לתמיד</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : qrCode ? (
                <>
                  {/* Steps */}
                  <div className="space-y-2 mb-5 text-sm text-slate-300">
                    {[
                      'הורד Google Authenticator מ-App Store / Play Store',
                      'לחץ "+" ובחר "סרוק קוד QR"',
                      'סרוק את הקוד למטה',
                      'הכנס את הקוד בן 6 ספרות שמוצג',
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>

                  {/* QR Code — Supabase returns SVG string */}
                  <div className="flex justify-center mb-4">
                    <div
                      className="bg-white p-3 rounded-xl w-48 h-48 flex items-center justify-center"
                      dangerouslySetInnerHTML={{
                        __html: qrCode.startsWith('<svg')
                          ? qrCode.replace('<svg ', '<svg width="168" height="168" ')
                          : `<img src="${qrCode}" width="168" height="168" />`
                      }}
                    />
                  </div>

                  {/* Manual secret */}
                  <div className="mb-5">
                    <p className="text-xs text-slate-500 mb-1 text-center">לא יכול לסרוק? הכנס ידנית:</p>
                    <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/50">
                      <code className="flex-1 text-xs text-purple-300 font-mono tracking-wider">
                        {showSecret ? secret : '•'.repeat(secret.length)}
                      </code>
                      <button onClick={() => setShowSecret(v => !v)} className="text-slate-500 hover:text-slate-300 transition">
                        {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={copySecret} className="text-slate-500 hover:text-purple-400 transition">
                        {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Code input after enrollment */}
                  <p className="text-center text-sm text-slate-300 mb-3 font-medium">הכנס את הקוד מהאפליקציה לאימות:</p>
                  <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        className="w-11 h-12 text-center text-lg font-bold bg-slate-900/60 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition"
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* ── VERIFY STEP ──────────────────────────────────────────── */}
          {step === 'verify' && (
            <>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">אימות זהות מנהל</h2>
                  <p className="text-slate-400 text-xs">פתח את Google Authenticator</p>
                </div>
              </div>

              <p className="text-center text-slate-300 text-sm mb-5">
                הכנס את הקוד בן 6 הספרות מ-<span className="text-purple-400 font-medium">Google Authenticator</span>
              </p>

              <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-slate-900/60 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition"
                  />
                ))}
              </div>

              <p className="text-center text-xs text-slate-500">הקוד מתחלף כל 30 שניות</p>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading overlay */}
          {loading && step === 'verify' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>מאמת...</span>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="text-center mt-4">
          <button
            onClick={onLogout}
            className="text-xs text-slate-600 hover:text-slate-400 transition"
          >
            יציאה מהחשבון
          </button>
        </div>
      </div>
    </div>
  )
}

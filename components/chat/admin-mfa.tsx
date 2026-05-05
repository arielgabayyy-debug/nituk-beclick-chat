"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Smartphone, KeyRound, CheckCircle, Loader2, AlertCircle, Copy } from 'lucide-react'
import { CommunityLogo } from './community-logo'

interface AdminMFAProps {
  userEmail: string
  onVerified: () => void
  onLogout: () => void
}

type MFAStep = 'loading' | 'enroll' | 'verify' | 'success'

export function AdminMFA({ userEmail, onVerified, onLogout }: AdminMFAProps) {
  const supabase = createClient()

  const [step, setStep]           = useState<MFAStep>('loading')
  const [factorId, setFactorId]   = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [qrUrl, setQrUrl]         = useState('')   // blob URL from SVG
  const [secret, setSecret]       = useState('')
  const [digits, setDigits]       = useState(['', '', '', '', '', ''])
  const [error, setError]         = useState('')
  const [busy, setBusy]           = useState(false)
  const [copied, setCopied]       = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Convert an SVG string to a blob URL safe for <img src> */
  function svgToUrl(svg: string): string {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    } catch {
      // Fallback: data URI
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    }
  }

  /** Create a challenge for an existing verified factor */
  const createChallenge = useCallback(async (fid: string) => {
    const { data, error: err } = await supabase.auth.mfa.challenge({ factorId: fid })
    if (err) throw err
    setChallengeId(data.id)
  }, [supabase])

  // ── Mount: determine what the user needs to do ───────────────────────────
  useEffect(() => {
    let revoked = false

    async function init() {
      try {
        // 1. Check current AAL — if already aal2, we're done
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (revoked) return
        if (aal?.currentLevel === 'aal2') {
          setStep('success')
          onVerified()
          return
        }

        // 2. List factors — only use verified ones
        const { data: factors } = await supabase.auth.mfa.listFactors()
        if (revoked) return
        const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') ?? []

        if (verifiedFactors.length > 0) {
          // Has a verified factor — show verify screen
          const fid = verifiedFactors[0].id
          setFactorId(fid)
          await createChallenge(fid)
          if (revoked) return
          setStep('verify')
          // Auto-focus handled by autoFocus prop
        } else {
          // No verified factor — start enrollment
          // Clean up any pending (unverified) factors first
          const pendingFactors = factors?.totp?.filter(f => f.status !== 'verified') ?? []
          for (const pf of pendingFactors) {
            await supabase.auth.mfa.unenroll({ factorId: pf.id }).catch(() => {/* ignore */})
          }
          if (revoked) return
          await startEnrollment()
        }
      } catch (err) {
        if (revoked) return
        console.error('MFA init error:', err)
        setError(err instanceof Error ? err.message : 'שגיאת MFA — נסה לרענן')
        setStep('enroll')
      }
    }

    init()
    return () => { revoked = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Enrollment ───────────────────────────────────────────────────────────
  async function startEnrollment() {
    setBusy(true)
    setError('')
    try {
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Admin — ${userEmail}`,
      })
      if (enrollErr) throw enrollErr

      const url = data.totp.qr_code.startsWith('<svg')
        ? svgToUrl(data.totp.qr_code)
        : data.totp.qr_code

      setQrUrl(url)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('enroll')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהגדרת MFA'
      // If factor already exists but wasn't caught above, surface a useful message
      setError(msg.includes('already') ? 'יש כבר גורם MFA פעיל — נסה לרענן את הדף' : msg)
      setStep('enroll')
    } finally {
      setBusy(false)
    }
  }

  // ── Verification ─────────────────────────────────────────────────────────
  async function verifyCode(codeString: string) {
    if (codeString.length !== 6 || busy) return
    setBusy(true)
    setError('')
    try {
      // For enroll step we already have factorId but no challengeId yet
      let cid = challengeId
      if (!cid) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
        if (chErr) throw chErr
        cid = ch.id
        setChallengeId(cid)
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: cid,
        code: codeString,
      })
      if (verifyErr) throw verifyErr

      setStep('success')
      onVerified()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('expired') || msg.includes('challenge')) {
        // Challenge expired — create a new one
        setError('הקוד פג תוקף — נסה שוב')
        try {
          await createChallenge(factorId)
        } catch {/* ignore */}
      } else {
        setError('קוד שגוי — נסה שוב')
      }
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setBusy(false)
    }
  }

  // ── OTP Input ────────────────────────────────────────────────────────────
  function handleDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    setError('')

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    const full = next.join('')
    if (full.length === 6) verifyCode(full)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const full = digits.join('')
      if (full.length === 6) verifyCode(full)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...'000000'].map((_, i) => pasted[i] ?? '')
    setDigits(next)
    setError('')
    if (pasted.length === 6) {
      verifyCode(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── OTP digit grid (shared between enroll & verify steps) ────────────────
  function DigitGrid({ autoFocusFirst = false }: { autoFocusFirst?: boolean }) {
    return (
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            autoFocus={autoFocusFirst && i === 0}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            disabled={busy}
            className="w-11 h-13 text-center text-lg font-bold bg-slate-900/60 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition disabled:opacity-50"
          />
        ))}
      </div>
    )
  }

  // ── Loading / Success screens ────────────────────────────────────────────
  if (step === 'loading' || step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          <p className="text-slate-400 text-sm">בודק הרשאות מנהל...</p>
        </div>
      </div>
    )
  }

  // ── Main card ────────────────────────────────────────────────────────────
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

              {busy ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : qrUrl ? (
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

                  {/* QR Code — rendered via blob URL into <img> */}
                  <div className="flex justify-center mb-5">
                    <div className="bg-white p-4 rounded-2xl shadow-lg" style={{ width: 200, height: 200 }}>
                      <img src={qrUrl} width={168} height={168} alt="QR Code" style={{ display: 'block' }} />
                    </div>
                  </div>

                  {/* Manual entry */}
                  <div className="mb-5 bg-slate-900/80 rounded-2xl p-4 border border-purple-500/30">
                    <p className="text-xs text-purple-400 font-semibold mb-3 text-center uppercase tracking-wide">
                      או הכנס ידנית ב-Google Authenticator
                    </p>

                    {/* Account name */}
                    <div className="mb-3">
                      <p className="text-[11px] text-slate-500 mb-1">שם חשבון</p>
                      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
                        <span className="flex-1 text-sm text-white font-medium">ניתוק בקליק Admin</span>
                        <button
                          onClick={() => navigator.clipboard.writeText('ניתוק בקליק Admin')}
                          className="text-slate-400 hover:text-purple-400 transition shrink-0"
                          type="button"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Secret key */}
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">מפתח סודי (Secret Key)</p>
                      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
                        <code className="flex-1 text-sm text-purple-300 font-mono tracking-widest break-all">
                          {secret}
                        </code>
                        <button onClick={copySecret} className="text-slate-400 hover:text-purple-400 transition shrink-0" type="button">
                          {copied
                            ? <CheckCircle className="w-4 h-4 text-green-400" />
                            : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {copied && <p className="text-xs text-green-400 text-center mt-1">הועתק!</p>}
                    </div>
                  </div>

                  {/* Code input for enrollment verification */}
                  <p className="text-center text-sm text-slate-300 mb-3 font-medium">הכנס את הקוד מהאפליקציה לאימות:</p>
                  <DigitGrid autoFocusFirst />
                </>
              ) : (
                /* Error state with retry */
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">לא ניתן לטעון קוד QR</p>
                  <button
                    onClick={startEnrollment}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl transition"
                    type="button"
                  >
                    נסה שוב
                  </button>
                </div>
              )}
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

              <DigitGrid autoFocusFirst />

              <p className="text-center text-xs text-slate-500 mt-3">הקוד מתחלף כל 30 שניות</p>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading overlay for verify */}
          {busy && (step === 'verify' || step === 'enroll') && (
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
            type="button"
            className="text-xs text-slate-600 hover:text-slate-400 transition"
          >
            יציאה מהחשבון
          </button>
        </div>
      </div>
    </div>
  )
}

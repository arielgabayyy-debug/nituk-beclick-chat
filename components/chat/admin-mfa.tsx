"use client"

import { useState, useEffect, useRef } from 'react'
import { Shield, KeyRound, CheckCircle, Loader2, AlertCircle, Copy, Smartphone, QrCode } from 'lucide-react'
import { CommunityLogo } from './community-logo'

interface AdminMFAProps {
  userEmail: string
  onVerified: () => void
  onLogout: () => void
}

type Step = 'loading' | 'verify' | 'done' | 'error'

export function AdminMFA({ userEmail, onVerified, onLogout }: AdminMFAProps) {
  const [step, setStep]     = useState<Step>('loading')
  const [qrUrl, setQrUrl]   = useState('')
  const [secret, setSecret] = useState('')
  const [digits, setDigits] = useState(['','','','','',''])
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')
  const inputRefs = useRef<(HTMLInputElement|null)[]>([])

  // ── Load QR from server (uses app session cookie, returns proper dataURL) ──
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/admin/mfa-qr')
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || `שגיאה ${res.status}`)
        }
        const data = await res.json()
        setQrUrl(data.qr)       // PNG/WebP data-url from qrcode npm library
        setSecret(data.secret)
        setStep('verify')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setErrorDetail(msg)
        setError('שגיאה בטעינת QR')
        setStep('error')
      }
    }
    init()
  }, [])

  // ── Verify TOTP code via server ────────────────────────────────────────────
  async function verifyCode(code: string) {
    if (code.length !== 6 || busy) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/admin/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'קוד שגוי')
      setStep('done')
      onVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'קוד שגוי — נסה שוב')
      setDigits(['','','','','',''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally { setBusy(false) }
  }

  // ── Digit input ────────────────────────────────────────────────────────────
  function handleDigit(i: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const next = [...digits]; next[i] = val.slice(-1); setDigits(next); setError('')
    if (val && i < 5) inputRefs.current[i+1]?.focus()
    const full = next.join('')
    if (full.length === 6) verifyCode(full)
  }
  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i-1]?.focus()
    if (e.key === 'Enter') { const f = digits.join(''); if (f.length === 6) verifyCode(f) }
  }
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (!p) return
    const next = Array(6).fill('').map((_,i) => p[i]||'')
    setDigits(next); setError('')
    if (p.length === 6) verifyCode(p)
    else inputRefs.current[p.length]?.focus()
  }
  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'loading') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">טוען אימות דו-שלבי...</p>
      </div>
    </div>
  )

  if (step === 'done') return null

  if (step === 'error') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-white font-bold text-lg">שגיאה בטעינה</h2>
        <p className="text-slate-400 text-sm">{error}</p>
        {errorDetail && (
          <pre className="bg-slate-900 rounded-lg p-3 text-xs text-red-300 text-left overflow-auto max-h-32 whitespace-pre-wrap">{errorDetail}</pre>
        )}
        <button onClick={onLogout} className="text-sm text-slate-400 hover:text-white transition">יציאה מהחשבון</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
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
          <p className="text-slate-400 text-sm">{userEmail}</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

          {/* Code input */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700/50">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">הכנס קוד מ-Google Authenticator</h2>
              <p className="text-slate-400 text-xs">קוד 6 ספרות שמתחלף כל 30 שניות</p>
            </div>
          </div>

          <p className="text-center text-slate-300 text-sm mb-5">
            פתח את <span className="text-purple-400 font-semibold">Google Authenticator</span> והכנס את הקוד
          </p>

          <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text" inputMode="numeric" maxLength={1} value={d}
                autoFocus={i === 0}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                className="w-11 h-14 text-center text-xl font-bold bg-slate-900/60 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition"
              />
            ))}
          </div>

          {busy && <div className="flex justify-center mb-3"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>}
          {error && (
            <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <p className="text-center text-xs text-slate-500 mb-4">הקוד מתחלף כל 30 שניות</p>

          {/* Setup toggle */}
          <div className="border-t border-slate-700/50 pt-4">
            <button
              onClick={() => setShowSetup(v => !v)}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              {showSetup ? 'הסתר הגדרה' : 'לא הגדרת עדיין? לחץ כאן'}
            </button>

            {showSetup && (
              <div className="mt-4 space-y-4">
                <div className="text-sm text-slate-300 space-y-2">
                  <p className="font-medium text-white">הגדרה ראשונה:</p>
                  {[
                    'הורד Google Authenticator (App Store / Play Store)',
                    'לחץ "+" ← "סרוק קוד QR" ← סרוק את הקוד למטה',
                    'או: "+" ← "הזן מפתח הגדרה" ← הכנס את המפתח ידנית',
                  ].map((s,i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold">{i+1}</span>
                      <span className="text-slate-300 text-xs">{s}</span>
                    </div>
                  ))}
                </div>

                {/* QR Code — proper PNG from qrcode npm library */}
                {qrUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-slate-400">סרוק QR:</p>
                    <div className="bg-white p-3 rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="QR Code" width={192} height={192} />
                    </div>
                  </div>
                )}

                {/* Secret key */}
                {secret && (
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-purple-500/20">
                    <p className="text-[11px] text-slate-500 mb-1">שם חשבון: <span className="text-slate-300">ניתוק בקליק Admin</span></p>
                    <p className="text-[11px] text-slate-500 mb-1">מפתח סודי</p>
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                      <code className="flex-1 text-sm text-purple-300 font-mono tracking-widest break-all">{secret}</code>
                      <button onClick={copySecret} className="text-slate-400 hover:text-purple-400 transition shrink-0">
                        {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    {copied && <p className="text-xs text-green-400 text-center mt-1">✓ הועתק!</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-4">
          <button onClick={onLogout} className="text-xs text-slate-600 hover:text-slate-400 transition flex items-center gap-1 mx-auto">
            <Smartphone className="w-3 h-3" />
            יציאה מהחשבון
          </button>
        </div>
      </div>
    </div>
  )
}

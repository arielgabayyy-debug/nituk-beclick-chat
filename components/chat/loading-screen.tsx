"use client"

import { useState, useEffect } from 'react'
import { CommunityLogo } from './community-logo'

// ── Loading tips ─────────────────────────────────────────────────────────────
const TIPS = [
  '💡 בדוק תמיד 3 מחירים לפני שאתה עובר חברה',
  '🔥 שתף עסקאות וצבור נקודות בלידרבורד',
  '⭐ כל הודעה שאתה שולח שווה לך נקודות',
  '📊 הצביעו בסקרים ועצבו את הקהילה יחד',
  '🤝 בקהילה שלנו כולם מנתקים חכם יותר',
  '🏆 השתתפות פעילה = עלייה בדירוג המובילים',
  '📱 הצ׳אט עובד מהמובייל ומהדסקטופ',
  '💰 חסכנו לאלפי משתמשים מאות שקלים בחודש',
]

// ── Israeli telecom company brand colors ─────────────────────────────────────
const SMOKE_WISPS = [
  // Partner
  { color: '#E31837', x: 12,  delay: 0,    dur: 9,  size: 90,  opacity: 0.55 },
  { color: '#E31837', x: 20,  delay: 2.5,  dur: 11, size: 60,  opacity: 0.35 },
  // Cellcom
  { color: '#0055B3', x: 35,  delay: 1,    dur: 10, size: 110, opacity: 0.5  },
  { color: '#0055B3', x: 28,  delay: 3.5,  dur: 8,  size: 70,  opacity: 0.3  },
  // Pelephone
  { color: '#00A551', x: 55,  delay: 0.5,  dur: 12, size: 95,  opacity: 0.5  },
  { color: '#00A551', x: 62,  delay: 4,    dur: 9,  size: 55,  opacity: 0.3  },
  // Hot Mobile
  { color: '#FF6400', x: 75,  delay: 1.5,  dur: 10, size: 80,  opacity: 0.5  },
  { color: '#FF6400', x: 82,  delay: 3,    dur: 7,  size: 50,  opacity: 0.3  },
  // Golan Telecom
  { color: '#FFC200', x: 90,  delay: 2,    dur: 11, size: 75,  opacity: 0.45 },
  { color: '#FFC200', x: 95,  delay: 5,    dur: 8,  size: 45,  opacity: 0.28 },
  // Rami Levy
  { color: '#82248C', x: 48,  delay: 0.8,  dur: 13, size: 100, opacity: 0.45 },
  { color: '#82248C', x: 42,  delay: 6,    dur: 9,  size: 60,  opacity: 0.28 },
  // 019 / Bezeq
  { color: '#1BAADD', x: 7,   delay: 3,    dur: 11, size: 65,  opacity: 0.4  },
  { color: '#1BAADD', x: 68,  delay: 5.5,  dur: 10, size: 80,  opacity: 0.4  },
]

export function LoadingScreen({ message = "הצ׳אט הקהילתי טוען..." }: { message?: string }) {
  const [tip, setTip] = useState(Math.floor(Math.random() * TIPS.length))
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const tipTimer = setInterval(() => setTip(i => (i + 1) % TIPS.length), 2800)
    return () => clearInterval(tipTimer)
  }, [])

  useEffect(() => {
    // Simulate load progress 0→85 quickly, then wait for real content
    const steps = [10, 25, 40, 58, 72, 83, 90, 95]
    let i = 0
    const iv = setInterval(() => {
      if (i < steps.length) { setProgress(steps[i]); i++ }
      else clearInterval(iv)
    }, 280)
    return () => clearInterval(iv)
  }, [])

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ background: '#ffffff' }}
    >
      {/* ── CSS keyframes (injected inline) ─────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes wisp-rise {
          0%   { transform: translateY(0)   scaleX(1)   rotate(0deg);   opacity: 0; }
          8%   { opacity: 1; }
          50%  { transform: translateY(-45vh) scaleX(1.2) rotate(4deg); }
          85%  { opacity: 0.6; }
          100% { transform: translateY(-95vh) scaleX(0.5) rotate(-3deg); opacity: 0; }
        }
        @keyframes wisp-sway {
          0%,100% { margin-left: 0px; }
          25%     { margin-left: 18px; }
          75%     { margin-left: -14px; }
        }
        @keyframes logo-float {
          0%,100% { transform: translateY(0px) scale(1); }
          50%     { transform: translateY(-8px) scale(1.03); }
        }
        @keyframes logo-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bar-fill {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes dot-bounce {
          0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
          40%         { transform: scale(1.3); opacity: 1; }
        }
        @keyframes tip-fade {
          0%   { opacity: 0; transform: translateY(6px); }
          15%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes sparkle-pop {
          0%,100% { transform: scale(0); opacity: 0; }
          50%     { transform: scale(1); opacity: 1; }
        }
      ` }} />

      {/* ── Smoke wisps layer ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ zIndex: 1 }}
      >
        {SMOKE_WISPS.map((w, i) => (
          <div
            key={i}
            style={{
              position:  'absolute',
              bottom:    '-30px',
              left:      `${w.x}%`,
              width:     `${w.size}px`,
              height:    `${w.size * 1.8}px`,
              borderRadius: '50% 50% 40% 40%',
              background: w.color,
              opacity:    0,
              filter:     `blur(${w.size * 0.38}px)`,
              animation: [
                `wisp-rise ${w.dur}s ease-in-out ${w.delay}s infinite`,
                `wisp-sway ${w.dur * 0.7}s ease-in-out ${w.delay}s infinite`,
              ].join(', '),
            }}
          />
        ))}
      </div>

      {/* ── Subtle grid pattern ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          zIndex: 2,
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center gap-7 text-center px-6"
        style={{ zIndex: 10 }}
      >

        {/* ── Logo area ────────────────────────────────────────────────────── */}
        <div className="relative" style={{ animation: 'logo-float 3.2s ease-in-out infinite' }}>
          {/* Pulse rings */}
          {[0, 0.55, 1.1].map((delay, i) => (
            <div
              key={i}
              className="absolute rounded-3xl border-2"
              style={{
                inset:       '-14px',
                borderColor: i === 0 ? 'rgba(6,182,212,0.5)'
                           : i === 1 ? 'rgba(139,92,246,0.35)'
                           :           'rgba(236,72,153,0.25)',
                animation:   `logo-pulse-ring 2.2s ease-out ${delay}s infinite`,
              }}
            />
          ))}

          {/* The logo itself */}
          <CommunityLogo size={88} animated={false} />

          {/* Spinning orbit ring */}
          <div
            className="absolute rounded-full border border-dashed"
            style={{
              inset: '-22px',
              borderColor: 'rgba(139,92,246,0.2)',
              animation: 'spin-slow 12s linear infinite',
            }}
          >
            {/* Orbit dot */}
            <div
              className="absolute w-2 h-2 rounded-full top-0 left-1/2 -translate-x-1/2 -translate-y-1"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' }}
            />
          </div>
        </div>

        {/* ── Brand name ───────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <h1
            className="text-3xl font-extrabold leading-tight tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ניתוק בקליק
          </h1>
          <p className="text-sm text-gray-400 font-medium">הקהילה הכי חוסכת בישראל 🇮🇱</p>

          {/* Company logos row — small colored pills */}
          <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
            {[
              { name: 'פרטנר',  bg: '#E31837' },
              { name: 'סלקום',  bg: '#0055B3' },
              { name: 'פלאפון', bg: '#00A551' },
              { name: 'הוט',    bg: '#FF6400' },
              { name: 'גולן',   bg: '#FFC200', text: '#333' },
              { name: 'רמי לוי',bg: '#82248C' },
            ].map(co => (
              <span
                key={co.name}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: co.bg, color: co.text || '#fff', opacity: 0.85 }}
              >
                {co.name}
              </span>
            ))}
          </div>
        </div>

        {/* ── Status pill ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 bg-white border border-gray-100 px-5 py-2.5 rounded-full shadow-md shadow-gray-100/60 text-sm text-gray-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-medium">{message}</span>
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <div className="w-56 space-y-1.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>
          <p className="text-[10px] text-gray-300 font-mono">{progress}%</p>
        </div>

        {/* ── Tip text ─────────────────────────────────────────────────────── */}
        <p
          key={tip}
          className="text-xs text-gray-400 max-w-[260px] leading-relaxed"
          style={{ animation: 'tip-fade 2.8s ease-in-out forwards' }}
        >
          {TIPS[tip]}
        </p>

        {/* ── Bounce dots ──────────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {[0, 0.18, 0.36].map((delay, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: i === 0 ? '#06b6d4' : i === 1 ? '#8b5cf6' : '#ec4899',
                animation:  `dot-bounce 1.5s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Sparkle decorations ───────────────────────────────────────────── */}
      {[
        { top: '12%', left: '8%',  d: 1.6, c: '#06b6d4' },
        { top: '20%', right: '6%', d: 2.2, c: '#8b5cf6' },
        { top: '72%', left: '5%',  d: 1.8, c: '#E31837' },
        { top: '80%', right: '8%', d: 2.4, c: '#00A551' },
        { top: '40%', left: '4%',  d: 3.0, c: '#FFC200' },
        { top: '55%', right: '4%', d: 1.2, c: '#FF6400' },
      ].map((s, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position:  'absolute',
            top:       s.top,
            left:      'left'  in s ? s.left  : undefined,
            right:     'right' in s ? s.right : undefined,
            width:     '8px',
            height:    '8px',
            zIndex:    5,
            animation: `sparkle-pop 3s ease-in-out ${s.d}s infinite`,
          }}
        >
          <svg viewBox="0 0 24 24" fill={s.c} width="100%" height="100%">
            <path d="M12 2l1.5 7.5L21 12l-7.5 1.5L12 21l-1.5-7.5L3 12l7.5-1.5z" />
          </svg>
        </div>
      ))}
    </div>
  )
}

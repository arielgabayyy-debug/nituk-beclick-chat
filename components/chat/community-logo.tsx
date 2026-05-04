"use client"

// ── CommunityLogo ─────────────────────────────────────────────────────────
// Inline SVG logo for "ניתוק בקליק" — no external image dependency.
// The icon shows a phone with a stylised "cut / disconnect" lightning bolt.
// Uses brand gradient: cyan → purple.

interface CommunityLogoProps {
  size?: number
  className?: string
  /** show text underneath */
  showText?: boolean
  animated?: boolean
}

export function CommunityLogo({
  size = 72,
  className = '',
  showText = false,
  animated = false,
}: CommunityLogoProps) {
  const r = size / 2

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} style={{ direction: 'rtl' }}>
      {/* ── SVG Icon ──────────────────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={animated ? { animation: 'logo-float 3s ease-in-out infinite' } : {}}
      >
        <defs>
          {/* Main brand gradient */}
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#06b6d4" />
            <stop offset="50%"  stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          {/* Shine overlay */}
          <linearGradient id="shineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ── Background rounded square ─────────────────────────────────── */}
        <rect x="4" y="4" width="92" height="92" rx="24" fill="url(#logoGrad)" filter="url(#shadow)" />

        {/* Shine on top half */}
        <rect x="4" y="4" width="92" height="46" rx="24" fill="url(#shineGrad)" />

        {/* ── Phone outline ─────────────────────────────────────────────── */}
        {/* Phone body */}
        <rect x="30" y="18" width="40" height="64" rx="7" stroke="white" strokeWidth="3.5" fill="none" opacity="0.9" />
        {/* Screen area */}
        <rect x="35" y="25" width="30" height="42" rx="3" fill="white" opacity="0.15" />
        {/* Home bar */}
        <rect x="42" y="74" width="16" height="3" rx="1.5" fill="white" opacity="0.7" />
        {/* Camera */}
        <circle cx="50" cy="22" r="2" fill="white" opacity="0.6" />

        {/* ── Lightning bolt / disconnect ───────────────────────────────── */}
        {/* Bolt drawn over the screen — represents "ניתוק" */}
        <path
          d="M54 29 L46 46 L52 46 L46 62 L58 43 L51.5 43 Z"
          fill="white"
          opacity="0.95"
          filter="url(#logoGlow)"
        />

        {/* ── Sparkle dots ──────────────────────────────────────────────── */}
        <circle cx="21" cy="32" r="2.5" fill="white" opacity="0.5" />
        <circle cx="79" cy="32" r="2" fill="white" opacity="0.4" />
        <circle cx="17" cy="50" r="1.5" fill="white" opacity="0.3" />
        <circle cx="83" cy="56" r="2" fill="white" opacity="0.35" />
        <circle cx="24" cy="68" r="1.5" fill="white" opacity="0.25" />
      </svg>

      {/* ── Text ──────────────────────────────────────────────────────────── */}
      {showText && (
        <div className="text-center">
          <p className="font-extrabold text-base leading-tight" style={{
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ניתוק בקליק
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">הקהילה הכי חוסכת בישראל 🇮🇱</p>
        </div>
      )}
    </div>
  )
}

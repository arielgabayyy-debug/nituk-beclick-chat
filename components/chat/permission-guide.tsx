"use client"

import { useState, useEffect } from 'react'
import { Mic, Video, X, Shield, ExternalLink } from 'lucide-react'

interface PermissionGuideProps {
  type: 'microphone' | 'camera' | 'both'
  onClose: () => void
}

function getBrowser(): 'chrome' | 'safari' | 'firefox' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return 'chrome'
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari'
  if (/Firefox/.test(ua)) return 'firefox'
  return 'other'
}

function isIOS() {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function PermissionGuide({ type, onClose }: PermissionGuideProps) {
  const browser = getBrowser()
  const ios = isIOS()
  const icon = type === 'microphone' ? Mic : type === 'camera' ? Video : Mic

  const steps = ios
    ? [
        '1. פתח את ⚙️ הגדרות של iPhone',
        '2. גלול למטה → לחץ על Safari',
        '3. לחץ "מיקרופון" או "מצלמה"',
        '4. בחר "אפשר" ← חזור לאתר ונסה שוב',
      ]
    : browser === 'chrome'
    ? [
        '1. לחץ על 🔒 בשורת הכתובת (שמאל לURL)',
        '2. לחץ "הגדרות אתר" (Site settings)',
        '3. מצא "מיקרופון" / "מצלמה"',
        '4. שנה מ-"חסום" ל-"אפשר"',
        '5. רענן את הדף ולחץ שוב',
      ]
    : browser === 'safari'
    ? [
        '1. בשורת התפריטים: Safari → הגדרות לאתר זה',
        '2. שנה מיקרופון/מצלמה ל"אפשר"',
        '3. רענן את הדף',
      ]
    : browser === 'firefox'
    ? [
        '1. לחץ על הצלמית 🎤 בשורת הכתובת',
        '2. לחץ "ניקוי חסימות זמניות"',
        '3. בחר "אפשר" ← רענן דף',
      ]
    : [
        '1. מצא את הגדרות האתר בדפדפן שלך',
        '2. אפשר גישה למיקרופון/מצלמה',
        '3. רענן את הדף',
      ]

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">איך לאפשר הרשאות</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {steps.map((step, i) => (
            <p key={i} className="text-sm text-muted-foreground">{step}</p>
          ))}
        </div>

        <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          💡 <strong>חשוב:</strong> ההרשאות נדרשות כדי לשלוח הודעות קוליות ווידאו. הנתונים לא נשמרים ללא אישורך.
        </p>
      </div>
    </div>
  )
}

// ── Hook: request permission proactively ──────────────────────────────────
export function useMediaPermissions() {
  const [micGranted, setMicGranted] = useState<boolean | null>(null)
  const [camGranted, setCamGranted] = useState<boolean | null>(null)

  useEffect(() => {
    // Check permissions passively (no prompt)
    const check = async () => {
      try {
        if (!navigator.permissions?.query) return
        const [mic, cam] = await Promise.all([
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
          navigator.permissions.query({ name: 'camera' as PermissionName }),
        ])
        setMicGranted(mic.state === 'granted')
        setCamGranted(cam.state === 'granted')
        mic.onchange = () => setMicGranted(mic.state === 'granted')
        cam.onchange = () => setCamGranted(cam.state === 'granted')
      } catch {
        // Permissions API not supported
      }
    }
    check()
  }, [])

  return { micGranted, camGranted }
}

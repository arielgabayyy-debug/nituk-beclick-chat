"use client"

import { useState, useEffect } from 'react'
import { Accessibility, X, ZoomIn, ZoomOut, Sun, Activity, RotateCcw, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

function Toggle({ label, description, icon, checked, onChange }: {
  label: string; description: string; icon: React.ReactNode; checked: boolean; onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={cn("relative w-10 h-6 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-gray-300")}
      >
        <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform", checked ? "right-1" : "left-1")} />
      </button>
    </div>
  )
}

export function AccessibilityPanel() {
  const [open, setOpen] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [highContrast, setHighContrast] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [dyslexicFont, setDyslexicFont] = useState(false)
  const [lineSpacing, setLineSpacing] = useState(false)

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('a11y_settings') || '{}')
      if (s.fontSize) { setFontSize(s.fontSize); document.documentElement.style.fontSize = s.fontSize + '%' }
      if (s.highContrast) { setHighContrast(true); document.documentElement.classList.add('a11y-contrast') }
      if (s.reduceMotion) { setReduceMotion(true); document.documentElement.classList.add('a11y-motion') }
      if (s.dyslexicFont) { setDyslexicFont(true); document.documentElement.classList.add('a11y-dyslexic') }
      if (s.lineSpacing) { setLineSpacing(true); document.documentElement.classList.add('a11y-spacing') }
    } catch { /* ignore */ }
  }, [])

  const save = (patch: object) => {
    const cur = JSON.parse(localStorage.getItem('a11y_settings') || '{}')
    localStorage.setItem('a11y_settings', JSON.stringify({ ...cur, ...patch }))
  }

  const changeFontSize = (d: number) => {
    const next = Math.max(80, Math.min(160, fontSize + d))
    setFontSize(next)
    document.documentElement.style.fontSize = next + '%'
    save({ fontSize: next })
  }

  const toggle = (key: string, state: boolean, setter: (v: boolean) => void, cls: string) => {
    const next = !state; setter(next)
    document.documentElement.classList.toggle(cls, next)
    save({ [key]: next })
  }

  const reset = () => {
    setFontSize(100); setHighContrast(false); setReduceMotion(false); setDyslexicFont(false); setLineSpacing(false)
    document.documentElement.style.fontSize = ''
    document.documentElement.classList.remove('a11y-contrast', 'a11y-motion', 'a11y-dyslexic', 'a11y-spacing')
    localStorage.removeItem('a11y_settings')
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 left-6 z-[60] w-13 h-13 w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 hover:scale-110 transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="אפשרויות נגישות"
        title="נגישות"
      >
        <Accessibility className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-20 left-6 z-[60] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 w-80 animate-in slide-in-from-bottom-4 duration-200"
            dir="rtl"
            role="dialog"
            aria-label="הגדרות נגישות"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Accessibility className="w-5 h-5 text-blue-600" />
                נגישות
              </h3>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Font size */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">גודל טקסט</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">{fontSize}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => changeFontSize(-10)} aria-label="הקטן טקסט" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition-colors">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((fontSize - 80) / 80) * 100}%` }} />
                </div>
                <button onClick={() => changeFontSize(10)} aria-label="הגדל טקסט" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Toggle label="ניגודיות גבוהה" description="צבעים חדים לקריאה טובה יותר" icon={<Sun className="w-4 h-4" />} checked={highContrast} onChange={() => toggle('highContrast', highContrast, setHighContrast, 'a11y-contrast')} />
              <Toggle label="הפחת תנועה" description="ביטול אנימציות ואפקטים" icon={<Activity className="w-4 h-4" />} checked={reduceMotion} onChange={() => toggle('reduceMotion', reduceMotion, setReduceMotion, 'a11y-motion')} />
              <Toggle label="גופן דיסלקציה" description="גופן ידידותי לדיסלקציה" icon={<Eye className="w-4 h-4" />} checked={dyslexicFont} onChange={() => toggle('dyslexicFont', dyslexicFont, setDyslexicFont, 'a11y-dyslexic')} />
              <Toggle label="ריווח שורות" description="מרווח גדול בין שורות" icon={<Eye className="w-4 h-4" />} checked={lineSpacing} onChange={() => toggle('lineSpacing', lineSpacing, setLineSpacing, 'a11y-spacing')} />
            </div>

            <button onClick={reset} className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors py-2 hover:bg-gray-50 rounded-lg">
              <RotateCcw className="w-3 h-3" />
              אפס הכל לברירת מחדל
            </button>
          </div>
        </>
      )}
    </>
  )
}

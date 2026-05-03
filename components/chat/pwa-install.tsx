"use client"

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa_install_dismissed'

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    if (localStorage.getItem(DISMISS_KEY)) return

    // iOS detection
    const ua = navigator.userAgent
    const ios = /ipad|iphone|ipod/i.test(ua) && !(window as unknown as { MSStream: unknown }).MSStream
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after 10s
      const t = setTimeout(() => setShow(true), 10000)
      return () => clearTimeout(t)
    }

    // Android/Desktop: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  if (!show || installed) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 max-w-xs">
      <div className="bg-white dark:bg-gray-900 border border-border/60 rounded-2xl shadow-2xl p-4">
        <button onClick={handleDismiss} className="absolute top-2 left-2 p-1 hover:bg-muted rounded-full transition">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">התקן את האפליקציה</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {isIOS
                ? 'לחץ על כפתור השיתוף ▾ ואז "הוסף למסך הבית"'
                : 'התקן את האפליקציה לגישה מהירה וחוויה טובה יותר'
              }
            </p>
          </div>
        </div>

        {!isIOS && (
          <button
            onClick={handleInstall}
            className="w-full mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            <Download className="w-4 h-4" />
            התקן עכשיו — בחינם
          </button>
        )}

        {isIOS && (
          <div className="mt-3 flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
            <Share className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">לחץ <strong>שתף</strong> → <strong>הוסף למסך הבית</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline install button for settings / header
export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setInstalled(true); return }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (installed || !deferredPrompt) return null

  return (
    <button
      onClick={async () => {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setInstalled(true)
        setDeferredPrompt(null)
      }}
      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
      title="התקן כאפליקציה"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">התקן אפליקציה</span>
    </button>
  )
}

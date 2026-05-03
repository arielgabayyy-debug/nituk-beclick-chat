"use client"

import { Users, MessageCircle, Crown, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LandingScreenProps {
  onSelectMode: (mode: 'guest' | 'subscriber' | 'newsletter') => void
  onlineCount: number
}

export function LandingScreen({ onSelectMode, onlineCount }: LandingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/vercel/share/v0-project/public/community-logo-v2-rWt6MTkHzsU1rzhKMX9iaY3puwHh2U.jpg" 
            alt="חיבור וניתוק בקליק" 
            className="w-24 h-24 rounded-2xl mx-auto mb-4 shadow-xl"
          />
          <h1 className="text-3xl font-bold gradient-text mb-2">חיבור וניתוק בקליק</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            השוואת מחירים חכמה
            <span className="bg-gradient-to-r from-secondary to-primary text-white px-2 py-0.5 rounded-full text-xs font-semibold">AI</span>
          </p>
        </div>

        {/* Online counter */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-online" />
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{onlineCount}</span> משתמשים מחוברים עכשיו
          </span>
        </div>

        {/* Mode selection */}
        <div className="space-y-3">
          {/* Guest */}
          <button
            onClick={() => onSelectMode('guest')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-all hover:scale-[1.02] group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-right flex-1">
              <h3 className="font-semibold mb-0.5">כניסה כאורח</h3>
              <p className="text-sm text-muted-foreground">הצטרפו לשיחה ללא הרשמה</p>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Subscriber */}
          <button
            onClick={() => onSelectMode('subscriber')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-all hover:scale-[1.02] group border border-primary/30"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div className="text-right flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold">כניסת מנויים</h3>
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">פרימיום</span>
              </div>
              <p className="text-sm text-muted-foreground">גישה מלאה עם תג מנוי מאומת</p>
              <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                מקבלים עדכון חודשי על כל החבילות והחברות
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-primary" />
          </button>

          {/* Newsletter */}
          <button
            onClick={() => onSelectMode('newsletter')}
            className="w-full glass rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-all hover:scale-[1.02] group border border-accent/30"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-accent" />
            </div>
            <div className="text-right flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold">מנוי ניוזלטר</h3>
                <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full">חינם</span>
              </div>
              <p className="text-sm text-muted-foreground">הירשמו וקבלו עדכונים + תג מיוחד</p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          בכניסה אתם מסכימים לתנאי השימוש ומדיניות הפרטיות
        </p>
      </div>
    </div>
  )
}

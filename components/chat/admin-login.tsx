"use client"

import { useState } from 'react'
import { Shield, ArrowRight, Loader2, Eye, EyeOff, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AdminLoginProps {
  onSubmit: (name: string, email: string, color: string, userType: string) => void
  onBack: () => void
}

export function AdminLogin({ onSubmit, onBack }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Setup mode for first time
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [setupKey, setSetupKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      setError('נא להזין שם משתמש וסיסמה')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בהתחברות')
        return
      }

      // Save admin session
      localStorage.setItem('nituk_admin_token', data.token)
      
      // Success - enter as admin
      onSubmit('מנהל', 'admin@nituk.co.il', '#ef4444', 'admin')
    } catch {
      setError('שגיאה בהתחברות, נסה שוב')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!setupKey.trim()) {
      setError('נא להזין מפתח הגדרה')
      return
    }
    
    if (!username.trim() || !newPassword.trim()) {
      setError('נא להזין שם משתמש וסיסמה')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות לא תואמות')
      return
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          setupKey, 
          username, 
          password: newPassword 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בהגדרה')
        return
      }

      // Success - switch to login mode
      setIsSetupMode(false)
      setPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSetupKey('')
      setError('')
      alert('המנהל נוצר בהצלחה! עכשיו תוכל להתחבר עם הפרטים החדשים.')
    } catch {
      setError('שגיאה בהגדרה, נסה שוב')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה
        </Button>

        {/* Form card */}
        <div className="glass rounded-2xl p-6 border border-secondary/30 glow-purple">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-secondary/20 mb-4">
              <Shield className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="text-xl font-bold mb-1">
              {isSetupMode ? 'הגדרת מנהל חדש' : 'כניסת מנהל'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSetupMode ? 'צור סיסמה חדשה מאובטחת' : 'הזן את פרטי ההתחברות'}
            </p>
          </div>

          <form onSubmit={isSetupMode ? handleSetup : handleLogin} className="space-y-4">
            {/* Setup key - only in setup mode */}
            {isSetupMode && (
              <div className="space-y-2">
                <label className="text-sm font-medium">מפתח הגדרה</label>
                <Input
                  type="password"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  placeholder="מפתח סודי"
                  dir="ltr"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">המפתח הוא: nituk-setup-2024</p>
              </div>
            )}

            {/* Username input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">שם משתמש</label>
              <div className="relative">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="pl-10"
                  dir="ltr"
                  disabled={isLoading}
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isSetupMode ? 'סיסמה חדשה' : 'סיסמה'}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={isSetupMode ? newPassword : password}
                  onChange={(e) => isSetupMode ? setNewPassword(e.target.value) : setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  dir="ltr"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password - only in setup mode */}
            {isSetupMode && (
              <div className="space-y-2">
                <label className="text-sm font-medium">אימות סיסמה</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הזן סיסמה שוב"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-secondary to-primary hover:opacity-90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {isSetupMode ? 'יוצר מנהל...' : 'מתחבר...'}
                </>
              ) : (
                isSetupMode ? 'צור מנהל חדש' : 'כניסה לפאנל הניהול'
              )}
            </Button>
          </form>

          {/* Setup mode toggle */}
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => {
                setIsSetupMode(!isSetupMode)
                setError('')
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              {isSetupMode ? 'חזור להתחברות רגילה' : 'הגדרת סיסמה חדשה'}
            </button>
          </div>

          {/* Security note */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            הסיסמה מוצפנת עם bcrypt להגנה מקסימלית
          </p>
        </div>
      </div>
    </div>
  )
}

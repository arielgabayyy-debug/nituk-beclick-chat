"use client"

import { useState, useEffect } from 'react'
import { LandingScreen } from '@/components/chat/landing-screen'
import { LoginForm } from '@/components/chat/login-form'
import { ChatRoom } from '@/components/chat/chat-room'
import { LoadingScreen } from '@/components/chat/loading-screen'
import { AccessibilityPanel } from '@/components/chat/accessibility-panel'
import { ChatErrorBoundary } from '@/components/chat/error-boundary'
import { useChatUser } from '@/hooks/use-chat'
import { createClient } from '@/lib/supabase/client'
import type { UserType, ChatUser } from '@/lib/chat-types'

type Screen = 'loading' | 'landing' | 'login' | 'chat'
type LoginMode = 'guest' | 'subscriber' | 'newsletter'

const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com']

export default function ChatApp() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [onlineCount, setOnlineCount] = useState(0)
  const [oauthUser, setOauthUser] = useState<ChatUser | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('הצ׳אט הקהילתי טוען...')
  const { currentUser, isLoading, registerUser, logout } = useChatUser()

  // Handle OAuth auth state changes
  useEffect(() => {
    const supabase = createClient()

    // Skip email/magic-link logins — handled by LoginForm
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const provider = session.user.app_metadata?.provider
        if (provider === 'email') return
        setLoadingMessage('מתחבר עם הפרופיל שלך...')
        await syncOAuthUser(session.user)
      }
    })

    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('oauth') === 'success') {
        window.history.replaceState({}, '', '/')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const email = session.user.email || ''
        // Admin with active session → go straight to dashboard
        if (ADMIN_EMAILS.includes(email.toLowerCase())) {
          window.location.replace('/admin')
          return
        }
        setLoadingMessage('מתחבר עם הפרופיל שלך...')
        await syncOAuthUser(session.user)
      } else if (!currentUser) {
        setTimeout(() => setScreen('landing'), 800)
      }
    }

    checkSession()
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (currentUser && !oauthUser) setScreen('chat')
  }, [currentUser, oauthUser])

  const syncOAuthUser = async (authUser: { email?: string; user_metadata?: Record<string, string> }) => {
    const email = authUser.email
    if (!email) { setScreen('landing'); return }

    // ── Admin: immediate redirect — no waiting, no DB ops needed ─────────
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      window.location.replace('/admin')
      return
    }
    // ─────────────────────────────────────────────────────────────────────

    const supabase = createClient()
    const name = authUser.user_metadata?.full_name ||
                 authUser.user_metadata?.name ||
                 email.split('@')[0] || 'משתמש'
    const avatarUrl = authUser.user_metadata?.avatar_url ||
                      authUser.user_metadata?.picture || null

    try {
      const { data: existingUser } = await supabase
        .from('chat_users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (existingUser) {
        await supabase.from('chat_users').update({
          is_online: true,
          avatar_url: avatarUrl,
          last_seen: new Date().toISOString()
        }).eq('id', existingUser.id)

        localStorage.setItem('chat_user_id', existingUser.id)
        setOauthUser({ ...existingUser, is_online: true, avatar_url: avatarUrl })
      } else {
        const { data: newUser } = await supabase
          .from('chat_users')
          .insert({
            name, email,
            user_type: 'subscriber',
            avatar_color: '#06b6d4',
            avatar_url: avatarUrl,
            is_online: true,
          })
          .select()
          .single()

        if (newUser) {
          localStorage.setItem('chat_user_id', newUser.id)
          setOauthUser(newUser)
        }
      }
      setScreen('chat')
    } catch {
      setScreen('landing')
    }
  }

  // Fetch online count
  useEffect(() => {
    const fetchOnlineCount = async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from('chat_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)
      setOnlineCount(count || 0)
    }
    fetchOnlineCount()
    const interval = setInterval(fetchOnlineCount, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSelectMode = (mode: LoginMode) => {
    setLoginMode(mode)
    setScreen('login')
  }

  const handleLogin = async (name: string, email: string | null, userType: UserType, avatarColor: string) => {
    // Admin email detected via OTP → redirect to dashboard
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      window.location.href = '/admin'
      return
    }
    const user = await registerUser(name, email, userType, avatarColor)
    if (user) setScreen('chat')
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOauthUser(null)
    await logout()
    setScreen('landing')
  }

  const activeUser = oauthUser || currentUser

  if (screen === 'loading') return <LoadingScreen message={loadingMessage} />
  if (screen === 'landing') return <><LandingScreen onSelectMode={handleSelectMode} onlineCount={onlineCount} /><AccessibilityPanel /></>
  if (screen === 'login') return <><LoginForm mode={loginMode} onSubmit={handleLogin} onBack={() => setScreen('landing')} isLoading={isLoading} /><AccessibilityPanel /></>
  if (screen === 'chat' && activeUser) return <><ChatErrorBoundary><ChatRoom currentUser={activeUser} onLogout={handleLogout} /></ChatErrorBoundary><AccessibilityPanel /></>

  return <LoadingScreen />
}

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

export default function ChatApp() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [onlineCount, setOnlineCount] = useState(0)
  const [oauthUser, setOauthUser] = useState<ChatUser | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('הצ׳אט הקהילתי טוען...')
  const { currentUser, isLoading, registerUser, logout } = useChatUser()

  useEffect(() => {
    const supabase = createClient()

    // Handle all Supabase Auth sign-ins (magic link + Google + Facebook)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoadingMessage('מתחבר...')
        await syncAuthUser(session.user)
      }
      if (event === 'SIGNED_OUT') {
        setOauthUser(null)
        setScreen('landing')
      }
    })

    // Check existing session on load
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('oauth') === 'success') {
        window.history.replaceState({}, '', '/')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setLoadingMessage('מתחבר...')
        await syncAuthUser(session.user)
      } else if (!currentUser) {
        setTimeout(() => setScreen('landing'), 600)
      }
    }

    checkSession()
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (currentUser && !oauthUser) setScreen('chat')
  }, [currentUser, oauthUser])

  // Sync Supabase Auth user → chat_users table
  const syncAuthUser = async (authUser: { email?: string; user_metadata?: Record<string, string> }) => {
    const email = authUser.email?.toLowerCase()
    if (!email) { setScreen('landing'); return }

    const supabase = createClient()

    try {
      const { data: existingUser } = await supabase
        .from('chat_users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (existingUser) {
        // Mark online
        await supabase.from('chat_users').update({
          is_online: true,
          last_seen: new Date().toISOString(),
        }).eq('id', existingUser.id)

        localStorage.setItem('chat_user_id', existingUser.id)
        setOauthUser({ ...existingUser, is_online: true })
        setScreen('chat')
      } else {
        // New user — auth/callback already created the record, fetch it
        const { data: newUser } = await supabase
          .from('chat_users')
          .select('*')
          .eq('email', email)
          .maybeSingle()

        if (newUser) {
          localStorage.setItem('chat_user_id', newUser.id)
          setOauthUser(newUser)
          setScreen('chat')
        } else {
          // User not in chat_users yet (callback not run) — show landing
          setScreen('landing')
        }
      }
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

  // Guest login — no Supabase Auth needed
  const handleLogin = async (name: string, email: string | null, userType: UserType, avatarColor: string) => {
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

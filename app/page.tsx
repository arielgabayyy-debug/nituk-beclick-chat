"use client"

import { useState, useEffect } from 'react'
import { LandingScreen } from '@/components/chat/landing-screen'
import { LoginForm } from '@/components/chat/login-form'
import { AdminLogin } from '@/components/chat/admin-login'
import { ChatRoom } from '@/components/chat/chat-room'
import { LoadingScreen } from '@/components/chat/loading-screen'
import { useChatUser } from '@/hooks/use-chat'
import { createClient } from '@/lib/supabase/client'
import type { UserType, ChatUser } from '@/lib/chat-types'

type Screen = 'loading' | 'landing' | 'login' | 'admin' | 'chat'
type LoginMode = 'guest' | 'subscriber' | 'newsletter'

export default function ChatApp() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [adminClickCount, setAdminClickCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [oauthUser, setOauthUser] = useState<ChatUser | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('הצ׳אט הקהילתי טוען...')
  const { currentUser, isLoading, registerUser, logout } = useChatUser()

  // Handle OAuth auth state changes (works on mobile too)
  useEffect(() => {
    const supabase = createClient()

    // Listen for auth state changes - works for OAuth redirects on mobile.
    // Skip email/magic-link logins — those are handled by LoginForm directly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const provider = session.user.app_metadata?.provider
        if (provider === 'email') return // handled by LoginForm's onAuthStateChange
        setLoadingMessage('מתחבר עם הפרופיל שלך...')
        await syncOAuthUser(session.user)
      }
    })

    // Check for existing OAuth session on page load
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)

      // Handle oauth=success redirect
      if (urlParams.get('oauth') === 'success') {
        window.history.replaceState({}, '', '/')
        setLoadingMessage('מתחבר עם הפרופיל שלך...')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await syncOAuthUser(session.user)
      } else if (!currentUser) {
        // No session - show landing after brief loading
        setTimeout(() => setScreen('landing'), 800)
      }
    }

    checkSession()

    return () => subscription.unsubscribe()
  }, [])

  // If regular user logged in
  useEffect(() => {
    if (currentUser && !oauthUser) {
      setScreen('chat')
    }
  }, [currentUser, oauthUser])

  const syncOAuthUser = async (authUser: { email?: string; user_metadata?: Record<string, string> }) => {
    const supabase = createClient()
    const email = authUser.email
    const name = authUser.user_metadata?.full_name ||
                 authUser.user_metadata?.name ||
                 email?.split('@')[0] || 'משתמש'
    const avatarUrl = authUser.user_metadata?.avatar_url ||
                      authUser.user_metadata?.picture || null

    if (!email) {
      setScreen('landing')
      return
    }

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
            name,
            email,
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

  const handleAdminClick = () => {
    const newCount = adminClickCount + 1
    setAdminClickCount(newCount)
    if (newCount >= 5) {
      setScreen('admin')
      setAdminClickCount(0)
    }
    setTimeout(() => {
      setAdminClickCount(prev => prev === newCount ? 0 : prev)
    }, 3000)
  }

  const handleSelectMode = (mode: LoginMode) => {
    setLoginMode(mode)
    setScreen('login')
  }

  const handleLogin = async (name: string, email: string | null, userType: UserType, avatarColor: string) => {
    const user = await registerUser(name, email, userType, avatarColor)
    if (user) setScreen('chat')
  }

  const handleAdminLoginNew = async (name: string, email: string, color: string, userType: string) => {
    const user = await registerUser(name, email, userType as UserType, color)
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

  if (screen === 'landing') {
    return <LandingScreen onSelectMode={handleSelectMode} onlineCount={onlineCount} />
  }

  if (screen === 'login') {
    return <LoginForm mode={loginMode} onSubmit={handleLogin} onBack={() => setScreen('landing')} isLoading={isLoading} />
  }

  if (screen === 'admin') {
    return <AdminLogin onSubmit={handleAdminLoginNew} onBack={() => setScreen('landing')} />
  }

  if (screen === 'chat' && activeUser) {
    return (
      <ChatRoom
        currentUser={activeUser}
        onLogout={handleLogout}
        onAdminClick={handleAdminClick}
        adminClickCount={adminClickCount}
      />
    )
  }

  return <LoadingScreen />
}

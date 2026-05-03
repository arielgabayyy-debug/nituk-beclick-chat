"use client"

import { useState, useEffect } from 'react'
import { LandingScreen } from '@/components/chat/landing-screen'
import { LoginForm } from '@/components/chat/login-form'
import { AdminLogin } from '@/components/chat/admin-login'
import { ChatRoom } from '@/components/chat/chat-room'
import { useChatUser } from '@/hooks/use-chat'
import { createClient } from '@/lib/supabase/client'
import type { UserType } from '@/lib/chat-types'
import type { ChatUser } from '@/lib/chat-types'

type Screen = 'landing' | 'login' | 'admin' | 'chat'
type LoginMode = 'guest' | 'subscriber' | 'newsletter'

export default function ChatApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [adminClickCount, setAdminClickCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [oauthUser, setOauthUser] = useState<ChatUser | null>(null)
  const { currentUser, isLoading, registerUser, loginAdmin, logout } = useChatUser()

  // Check if user is already logged in (regular)
  useEffect(() => {
    if (currentUser) {
      setScreen('chat')
    }
  }, [currentUser])

  // Handle OAuth callback (?oauth=success)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('oauth') === 'success') {
      // Remove query param from URL
      window.history.replaceState({}, '', '/')
      handleOAuthLogin()
    }
  }, [])

  const handleOAuthLogin = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) return

    const authUser = session.user
    const email = authUser.email
    const name = authUser.user_metadata?.full_name ||
                 authUser.user_metadata?.name ||
                 email?.split('@')[0] || 'משתמש'
    const avatarUrl = authUser.user_metadata?.avatar_url ||
                      authUser.user_metadata?.picture || null

    if (!email) return

    // Find or create user in chat_users
    const { data: existingUser } = await supabase
      .from('chat_users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      // Update online status and avatar
      await supabase.from('chat_users')
        .update({
          is_online: true,
          avatar_url: avatarUrl,
          last_seen: new Date().toISOString()
        })
        .eq('id', existingUser.id)

      localStorage.setItem('chat_user_id', existingUser.id)
      setOauthUser({ ...existingUser, is_online: true, avatar_url: avatarUrl })
      setScreen('chat')
    } else {
      // Create new user from OAuth data
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
        setScreen('chat')
      }
    }
  }

  // Fetch online count for landing page
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

  // Handle admin secret click
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
    if (user) {
      setScreen('chat')
    }
  }

  const handleAdminLoginNew = async (name: string, email: string, color: string, userType: string) => {
    const user = await registerUser(name, email, userType as UserType, color)
    if (user) {
      setScreen('chat')
    }
  }

  const handleLogout = async () => {
    // Sign out from Supabase Auth (OAuth)
    const supabase = createClient()
    await supabase.auth.signOut()
    setOauthUser(null)
    await logout()
    setScreen('landing')
  }

  const activeUser = oauthUser || currentUser

  if (screen === 'landing') {
    return (
      <LandingScreen
        onSelectMode={handleSelectMode}
        onlineCount={onlineCount}
      />
    )
  }

  if (screen === 'login') {
    return (
      <LoginForm
        mode={loginMode}
        onSubmit={handleLogin}
        onBack={() => setScreen('landing')}
        isLoading={isLoading}
      />
    )
  }

  if (screen === 'admin') {
    return (
      <AdminLogin
        onSubmit={handleAdminLoginNew}
        onBack={() => setScreen('landing')}
      />
    )
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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

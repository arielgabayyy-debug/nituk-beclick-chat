"use client"

import { useState, useEffect } from 'react'
import { LandingScreen } from '@/components/chat/landing-screen'
import { LoginForm } from '@/components/chat/login-form'
import { AdminLogin } from '@/components/chat/admin-login'
import { ChatRoom } from '@/components/chat/chat-room'
import { useChatUser } from '@/hooks/use-chat'
import { createClient } from '@/lib/supabase/client'
import type { UserType } from '@/lib/chat-types'

type Screen = 'landing' | 'login' | 'admin' | 'chat'
type LoginMode = 'guest' | 'subscriber' | 'newsletter'

export default function ChatApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [adminClickCount, setAdminClickCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const { currentUser, isLoading, registerUser, loginAdmin, logout } = useChatUser()

  // Check if user is already logged in
  useEffect(() => {
    if (currentUser) {
      setScreen('chat')
    }
  }, [currentUser])

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

    // Reset after 3 seconds of no clicks
    setTimeout(() => {
      setAdminClickCount(prev => prev === newCount ? 0 : prev)
    }, 3000)
  }

  // Handle mode selection from landing
  const handleSelectMode = (mode: LoginMode) => {
    setLoginMode(mode)
    setScreen('login')
  }

  // Handle login form submission
  const handleLogin = async (name: string, email: string | null, userType: UserType, avatarColor: string) => {
    const user = await registerUser(name, email, userType, avatarColor)
    if (user) {
      setScreen('chat')
    }
  }

  // Handle admin login (new secure API)
  const handleAdminLoginNew = async (name: string, email: string, color: string, userType: string) => {
    // Register user as admin directly since API already verified
    const user = await registerUser(name, email, userType as UserType, color)
    if (user) {
      setScreen('chat')
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await logout()
    setScreen('landing')
  }

  // Render based on current screen
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

  if (screen === 'chat' && currentUser) {
    return (
      <ChatRoom
        currentUser={currentUser}
        onLogout={handleLogout}
        onAdminClick={handleAdminClick}
        adminClickCount={adminClickCount}
      />
    )
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

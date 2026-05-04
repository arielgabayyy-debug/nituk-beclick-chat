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

    // ── Listen for ALL auth events ─────────────────────────────────────
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

    // ── Check session / handle OAuth/magic-link redirect ───────────────
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const oauthSuccess = urlParams.get('oauth') === 'success'
      const oauthMagic = urlParams.get('oauth') === 'magic'
      const authError = urlParams.get('auth_error')

      // If there's a code at root (Supabase didn't redirect to /auth/callback),
      // forward it to the callback route for server-side exchange
      if (code) {
        window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
        return
      }

      // ── Handle hash-based magic link tokens (from admin.generateLink) ──
      if (oauthMagic) {
        window.history.replaceState({}, '', '/')
        try {
          const raw = sessionStorage.getItem('sb_magic_tokens')
          if (raw) {
            sessionStorage.removeItem('sb_magic_tokens')
            const { access_token, refresh_token } = JSON.parse(raw)
            setLoadingMessage('מתחבר...')
            const { data: sessionData } = await supabase.auth.setSession({ access_token, refresh_token })
            if (sessionData?.user) {
              await syncAuthUser(sessionData.user)
              return
            }
          }
        } catch { /* fall through to normal session check */ }
      }

      // Clean up URL
      if (oauthSuccess || authError) {
        window.history.replaceState({}, '', '/')
      }

      // Check for active session
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
      const { data: rows } = await supabase
        .from('chat_users')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: true })
        .limit(1)
      const chatUser = rows?.[0] ?? null

      if (chatUser) {
        await supabase.from('chat_users').update({
          is_online: true,
          last_seen: new Date().toISOString(),
        }).eq('id', chatUser.id)

        localStorage.setItem('chat_user_id', chatUser.id)
        setOauthUser({ ...chatUser, is_online: true })
        setScreen('chat')
      } else {
        // User not in chat_users — upsert (safe with UNIQUE constraint on email)
        const meta = authUser.user_metadata || {}
        const name = meta.full_name || meta.name || meta.display_name || email.split('@')[0]
        const avatarColor = meta.avatar_color || '#06b6d4'
        const intendedType = meta.intended_type || 'subscriber'
        const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com']
        const isAdmin = ADMIN_EMAILS.includes(email)

        const { data: upserted } = await supabase.from('chat_users').upsert({
          name,
          email,
          user_type: isAdmin ? 'admin' : intendedType,
          avatar_color: avatarColor,
          is_online: true,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'email' }).select().single()

        if (upserted) {
          localStorage.setItem('chat_user_id', upserted.id)
          setOauthUser(upserted)
          setScreen('chat')
        } else {
          // Final fallback — try fetching again
          const { data: refetch } = await supabase
            .from('chat_users').select('*').eq('email', email).limit(1)
          const found = refetch?.[0]
          if (found) {
            localStorage.setItem('chat_user_id', found.id)
            setOauthUser(found)
            setScreen('chat')
          } else {
            setScreen('landing')
          }
        }
      }
    } catch (err) {
      console.error('syncAuthUser error:', err)
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

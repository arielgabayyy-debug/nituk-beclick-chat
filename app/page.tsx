"use client"

import { useState, useEffect, useRef } from 'react'
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
type AuthError = null | 'blocked' | 'generic'

const ADMIN_EMAILS = ['nitukbeclick@gmail.com', 'arielgabayyy@gmail.com', 'uziel10@gmail.com', 'inbal2526@gmail.com', 'hilaoh3263@gmail.com']


// Compute level from points if not returned by DB (Frankfurt migration)
function enrichUser<T extends { points?: number; level?: number; messages_count?: number }>(u: T): T & { level: number; messages_count: number } {
  const pts = u.points ?? 0
  const lvl = u.level != null ? u.level : (pts >= 3000 ? 10 : pts >= 2000 ? 9 : pts >= 1500 ? 8 : pts >= 1000 ? 7 : pts >= 700 ? 6 : pts >= 450 ? 5 : pts >= 250 ? 4 : pts >= 100 ? 3 : pts >= 30 ? 2 : 1)
  return { ...u, level: lvl, messages_count: u.messages_count ?? 0 }
}
export default function ChatApp() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [onlineCount, setOnlineCount] = useState(0)
  const [oauthUser, setOauthUser] = useState<ChatUser | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('הצ׳אט הקהילתי טוען...')
  const [authError, setAuthError] = useState<AuthError>(null)
  const { currentUser, isLoading, registerUser, logout } = useChatUser()

  // Prevent double-calls to syncAuthUser
  const isSyncing = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // ── Listen for auth events ─────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Only sync if not already syncing (prevents double-call with checkSession)
        if (!isSyncing.current) {
          setLoadingMessage('מתחבר...')
          await syncAuthUser(session.user, supabase)
        }
      }
      if (event === 'SIGNED_OUT') {
        setOauthUser(null)
        setScreen('landing')
      }
    })

    // ── Check session on load ──────────────────────────────────────────
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const oauthSuccess = urlParams.get('oauth') === 'success'
      const oauthMagic = urlParams.get('oauth') === 'magic'
      const authError = urlParams.get('auth_error')

      // If ?code= landed at root, forward to callback
      if (code) {
        window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
        return
      }

      // ── Handle magic link hash tokens (?oauth=magic) ──────────────
      if (oauthMagic) {
        window.history.replaceState({}, '', '/')
        try {
          const raw = sessionStorage.getItem('sb_magic_tokens')
          if (raw) {
            sessionStorage.removeItem('sb_magic_tokens')
            const { access_token, refresh_token } = JSON.parse(raw)
            setLoadingMessage('מתחבר...')
            isSyncing.current = true
            const { data: sessionData, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            })
            if (!error && sessionData?.user) {
              await syncAuthUser(sessionData.user, supabase)
              isSyncing.current = false
              return
            }
            isSyncing.current = false
          }
        } catch (e) {
          isSyncing.current = false
          console.error('magic token error:', e)
        }
      }

      // Read intended_type from URL (set by callback when trigger fails)
      // or from localStorage (set by login-form before OAuth redirect)
      const intendedTypeFromUrl = urlParams.get('intended_type')
      const intendedTypeFromStorage = localStorage.getItem('nituk_intended_type')
      if (intendedTypeFromUrl || intendedTypeFromStorage) {
        // Prefer URL param (more reliable after full page reload)
        const resolved = intendedTypeFromUrl || intendedTypeFromStorage
        if (resolved) localStorage.setItem('nituk_intended_type', resolved)
      }

      // Handle auth errors from callback
      if (authError === 'blocked') {
        setAuthError('blocked')
      } else if (authError) {
        setAuthError('generic')
      }

      // Clean up URL
      if (oauthSuccess || authError) {
        window.history.replaceState({}, '', '/')
      }

      // ── Check for active session (oauth=success or existing session) ──
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setLoadingMessage('מתחבר...')
        isSyncing.current = true
        await syncAuthUser(session.user, supabase)
        isSyncing.current = false
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

  // ── Sync Supabase Auth user → chat_users ──────────────────────────────
  const syncAuthUser = async (
    authUser: { email?: string; user_metadata?: Record<string, unknown> },
    supabase: ReturnType<typeof createClient>
  ) => {
    const email = authUser.email?.toLowerCase()
    if (!email) { setScreen('landing'); return }

    // 10-second timeout safety net
    const timeout = setTimeout(() => {
      console.error('syncAuthUser timeout')
      setScreen('landing')
    }, 10000)

    try {
      const { data: rows, error: fetchError } = await supabase
        .from('chat_users')
        .select('id, name, email, avatar_color, user_type, is_online, last_seen, level, points, weekly_points, is_user_of_week, messages_count, helpful_count, created_at')
        .eq('email', email)
        .order('created_at', { ascending: true })
        .limit(1)

      if (fetchError) {
        console.error('chat_users fetch error:', fetchError.message)
        clearTimeout(timeout)
        setScreen('landing')
        return
      }

      const chatUser = rows?.[0] ?? null
      const isAdmin = ADMIN_EMAILS.includes(email)

      // ── Blocked user check ───────────────────────────────────────────
      if (chatUser?.user_type === 'blocked') {
        await supabase.auth.signOut()
        clearTimeout(timeout)
        setAuthError('blocked')
        setScreen('landing')
        return
      }

      if (chatUser) {
        await supabase.from('chat_users').update({
          is_online: true,
          last_seen: new Date().toISOString(),
        }).eq('id', chatUser.id)

        localStorage.setItem('chat_user_id', chatUser.id)
        // Clean up OAuth intent keys
        localStorage.removeItem('nituk_intended_type')
        localStorage.removeItem('nituk_intended_name')
        setOauthUser(enrichUser({ ...chatUser, is_online: true }))
        clearTimeout(timeout)
        setScreen('chat')
      } else {
        const meta = authUser.user_metadata || {}
        const name = (meta.full_name || meta.name || meta.display_name || email.split('@')[0]) as string
        const avatarColor = (meta.avatar_color || '#06b6d4') as string

        // Read intended_type saved by login-form.tsx before the OAuth redirect
        const savedIntendedType = localStorage.getItem('nituk_intended_type')
        const intendedType = (savedIntendedType || (meta.intended_type as string) || 'subscriber') as string

        // Clean up the stored intent
        localStorage.removeItem('nituk_intended_type')
        localStorage.removeItem('nituk_intended_name')

        const { data: upserted, error: upsertError } = await supabase
          .from('chat_users')
          .upsert({
            name,
            email,
            user_type: isAdmin ? 'admin' : intendedType,
            avatar_color: avatarColor,
            is_online: true,
            last_seen: new Date().toISOString(),
          }, { onConflict: 'email' })
          .select()
          .single()

        if (upsertError) {
          console.error('upsert error:', upsertError.message, upsertError.code)
        }

        if (upserted) {
          localStorage.setItem('chat_user_id', upserted.id)
          setOauthUser(enrichUser(upserted))
          clearTimeout(timeout)
          setScreen('chat')
        } else {
          // Upsert failed — try the server-side registration endpoint which has
          // service_role access and handles the broken trigger more gracefully
          const metaAvatarUrl = (authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null) as string | null
          try {
            // Get access token to authenticate the server-side call
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            const accessToken = currentSession?.access_token || ''
            const regRes = await fetch('/api/register-oauth-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                name,
                avatar_color: avatarColor,
                avatar_url: metaAvatarUrl,
              }),
            })

            const regData = await regRes.json()

            if (regRes.ok && regData.user) {
              localStorage.setItem('chat_user_id', regData.user.id)
              localStorage.removeItem('nituk_intended_type')
              localStorage.removeItem('nituk_intended_name')
              setOauthUser(enrichUser(regData.user))
              clearTimeout(timeout)
              setScreen('chat')
              return
            }

            if (regData.error === 'trigger_broken') {
              // The database trigger is broken — INSERT fails completely.
              // Log and show landing so the user is not stuck on loading screen.
              console.error('CRITICAL: DB trigger broken. Apply fix_trigger_safe.sql in Supabase SQL Editor.')
              console.error('SQL fix:', regData.sql_fix)
            }
          } catch (regErr) {
            console.error('register-oauth-user API error:', regErr)
          }

          // Final fallback — check if user somehow got created
          const { data: refetch } = await supabase
            .from('chat_users').select('id, name, email, avatar_color, user_type, is_online, last_seen, level, points, weekly_points, is_user_of_week, messages_count, helpful_count, created_at').eq('email', email).limit(1)
          const found = refetch?.[0]
          if (found) {
            localStorage.setItem('chat_user_id', found.id)
            localStorage.removeItem('nituk_intended_type')
            localStorage.removeItem('nituk_intended_name')
            setOauthUser(enrichUser(found))
            clearTimeout(timeout)
            setScreen('chat')
          } else {
            clearTimeout(timeout)
            setScreen('landing')
          }
        }
      }
    } catch (err) {
      console.error('syncAuthUser error:', err)
      clearTimeout(timeout)
      setScreen('landing')
    }
  }

  // ── Fetch online count ─────────────────────────────────────────────────
  useEffect(() => {
    // Use module-level singleton — no new client on each tick
    const supabase = createClient()
    const fetchOnlineCount = async () => {
      const { count } = await supabase
        .from('chat_users')
        .select('id', { count: 'exact', head: true })
        .eq('is_online', true)
      setOnlineCount(count || 0)
    }
    fetchOnlineCount()
    // 30s is plenty — use-chat's presence channel already reflects live changes
    const interval = setInterval(fetchOnlineCount, 30000)
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
  if (screen === 'landing') return (
    <>
      {authError === 'blocked' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs text-center">
          החשבון שלך חסום. לסיוע פנה לתמיכה.
          <button className="mr-3 opacity-70 hover:opacity-100" onClick={() => setAuthError(null)}>✕</button>
        </div>
      )}
      {authError === 'generic' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs text-center">
          שגיאה בהתחברות. נסה שוב.
          <button className="mr-3 opacity-70 hover:opacity-100" onClick={() => setAuthError(null)}>✕</button>
        </div>
      )}
      <LandingScreen onSelectMode={handleSelectMode} onlineCount={onlineCount} />
      <AccessibilityPanel />
    </>
  )
  if (screen === 'login') return <><LoginForm mode={loginMode} onSubmit={handleLogin} onBack={() => setScreen('landing')} isLoading={isLoading} /><AccessibilityPanel /></>
  if (screen === 'chat' && activeUser) return <><ChatErrorBoundary><ChatRoom currentUser={activeUser} onLogout={handleLogout} /></ChatErrorBoundary><AccessibilityPanel /></>

  return <LoadingScreen />
}

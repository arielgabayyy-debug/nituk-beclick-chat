"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, MessageCircle, TrendingUp, Mail, Send, Trash2,
  Crown, Shield, Ban, RefreshCw, BarChart3,
  CheckCircle, XCircle, Star, Award, LogOut,
  UserPlus, Pin, Download, Sparkles, ShieldOff, Search, Loader2
} from 'lucide-react'

// All admin emails — auto-authenticated without password
const ADMIN_EMAILS = ['arielgabayyy@gmail.com', 'nitukbeclick@gmail.com']
import { formatTimeAgo } from '@/lib/chat-types'

const supabase = createClient()

interface Stats {
  totalUsers: number
  onlineUsers: number
  totalMessages: number
  subscribers: number
  newsletterUsers: number
  guests: number
  todayMessages: number
  totalPolls: number
  totalDeals: number
  todayRegistrations: number
}

interface UserRow {
  id: string
  name: string
  email: string | null
  user_type: string
  is_online: boolean
  points: number
  level: number
  messages_count: number
  created_at: string
  email_consent: boolean
  avatar_color: string
}

interface MessageRow {
  id: string
  content: string
  created_at: string
  is_pinned: boolean
  user: { name: string; user_type: string }
}

const userTypeColor: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  subscriber: 'bg-blue-100 text-blue-700',
  newsletter: 'bg-amber-100 text-amber-700',
  guest: 'bg-gray-100 text-gray-600',
  blocked: 'bg-red-100 text-red-700',
}
const userTypeLabel: Record<string, string> = {
  admin: 'מנהל', subscriber: 'מנוי', newsletter: 'ניוזלטר', guest: 'אורח', blocked: '🚫 חסום'
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'users' | 'messages' | 'newsletter'>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newsletterSubject, setNewsletterSubject] = useState('')
  const [newsletterContent, setNewsletterContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [searchUser, setSearchUser] = useState('')
  const [searchMessage, setSearchMessage] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [authedEmail, setAuthedEmail] = useState<string | null>(null)
  const [newRegCount, setNewRegCount] = useState(0)
  const [toast, setToast] = useState<{ name: string; type: string } | null>(null)
  const lastSeenRef = useRef<string>(new Date().toISOString())

  // ── Auto-auth: check existing Google session ────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        setAuthedEmail(session.user.email)
        setIsAuthenticated(true)
      }
      setAuthLoading(false)
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        setAuthedEmail(session.user.email)
        setIsAuthenticated(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])
  // ─────────────────────────────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setAuthLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    })
  }

  const fetchStats = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      { count: totalUsers },
      { count: onlineUsers },
      { count: totalMessages },
      { count: subscribers },
      { count: newsletterUsers },
      { count: guests },
      { count: totalPolls },
      { count: totalDeals },
      { count: todayMessages },
      { count: todayRegistrations },
    ] = await Promise.all([
      supabase.from('chat_users').select('*', { count: 'exact', head: true }),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'subscriber'),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'newsletter'),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'guest'),
      supabase.from('polls').select('*', { count: 'exact', head: true }),
      supabase.from('hot_deals').select('*', { count: 'exact', head: true }),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ])

    setStats({
      totalUsers: totalUsers || 0,
      onlineUsers: onlineUsers || 0,
      totalMessages: totalMessages || 0,
      subscribers: subscribers || 0,
      newsletterUsers: newsletterUsers || 0,
      guests: guests || 0,
      todayMessages: todayMessages || 0,
      totalPolls: totalPolls || 0,
      totalDeals: totalDeals || 0,
      todayRegistrations: todayRegistrations || 0,
    })
  }, [])

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('chat_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setUsers(data || [])
  }, [])

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`*, user:chat_users(name, user_type)`)
      .order('created_at', { ascending: false })
      .limit(50)
    setMessages(data || [])
  }, [])

  // ── Real-time: new user registrations ───────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    const channel = supabase
      .channel('admin-registrations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_users',
      }, (payload) => {
        const newUser = payload.new as UserRow
        // Add to users list
        setUsers(prev => [newUser, ...prev])
        // Update stats
        setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : prev)
        // Show badge on registrations tab
        if (newUser.user_type !== 'guest') {
          setNewRegCount(c => c + 1)
          // Show toast
          setToast({ name: newUser.name, type: newUser.user_type })
          setTimeout(() => setToast(null), 5000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated])
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true)
      Promise.all([fetchStats(), fetchUsers(), fetchMessages()])
        .finally(() => setIsLoading(false))
    }
  }, [isAuthenticated, fetchStats, fetchUsers, fetchMessages])

  const handleLogin = () => {
    if (adminPassword === 'nituk2024' || adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('סיסמה שגויה')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setAuthedEmail(null)
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('id', id)
    fetchMessages()
    fetchStats()
  }

  const pinMessage = async (id: string, isPinned: boolean) => {
    await supabase.from('chat_messages').update({ is_pinned: !isPinned }).eq('id', id)
    fetchMessages()
  }

  const promoteUser = async (id: string, newType: string) => {
    await supabase.from('chat_users').update({ user_type: newType }).eq('id', id)
    fetchUsers()
    fetchStats()
  }

  const blockUser = async (id: string) => {
    await supabase.from('chat_users').update({ user_type: 'blocked', is_online: false }).eq('id', id)
    fetchUsers()
    fetchStats()
  }

  const unblockUser = async (id: string) => {
    await supabase.from('chat_users').update({ user_type: 'guest' }).eq('id', id)
    fetchUsers()
    fetchStats()
  }

  const deleteUser = async (id: string) => {
    if (!confirm('למחוק משתמש זה?')) return
    await supabase.from('chat_users').delete().eq('id', id)
    fetchUsers()
    fetchStats()
  }

  const sendNewsletter = async () => {
    if (!newsletterSubject || !newsletterContent) return
    setIsSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newsletterSubject, content: newsletterContent })
      })
      const data = await res.json()
      setSendResult(data.message || 'נשלח בהצלחה!')
    } catch {
      setSendResult('שגיאה בשליחה')
    } finally {
      setIsSending(false)
    }
  }

  // Export registrations as CSV
  const exportCSV = () => {
    const rows = users.filter(u => u.email)
    const csv = [
      ['שם', 'אימייל', 'סוג', 'תאריך הרשמה'].join(','),
      ...rows.map(u => [
        `"${u.name}"`,
        u.email || '',
        userTypeLabel[u.user_type] || u.user_type,
        new Date(u.created_at).toLocaleString('he-IL')
      ].join(','))
    ].join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrations-${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredUsers = users.filter(u =>
    u.name.includes(searchUser) || u.email?.includes(searchUser) || u.user_type.includes(searchUser)
  )

  // All non-guest registered users sorted by date
  const registrations = users.filter(u => u.user_type !== 'guest' && u.user_type !== 'admin' && u.user_type !== 'blocked')
  const filteredMessages = messages.filter(m =>
    !searchMessage || m.content.includes(searchMessage) || m.user?.name?.includes(searchMessage)
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">דאשבורד מנהל</h1>
            <p className="text-gray-400 text-sm mt-1">ניתוק בקליק</p>
          </div>

          {/* Google login — primary */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-4 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            כניסה עם Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">או</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Password fallback */}
          <input
            type="password"
            placeholder="סיסמת מנהל"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border rounded-xl px-4 py-3 text-right mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />
          {authError && <p className="text-red-500 text-sm text-center mb-3">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold hover:bg-purple-700 transition text-sm"
          >
            כניסה עם סיסמה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* ── Real-time toast notification ─────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-white border border-emerald-200 shadow-xl rounded-2xl px-5 py-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{toast.name} נרשם!</p>
              <p className="text-xs text-gray-500">{userTypeLabel[toast.type] || toast.type}</p>
            </div>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">דאשבורד מנהל | ניתוק בקליק</h1>
          {stats && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {stats.onlineUsers} מחוברים
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => Promise.all([fetchStats(), fetchUsers(), fetchMessages()])}
            className="p-2 hover:bg-gray-100 rounded-lg transition" title="רענן">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          {authedEmail && (
            <span className="text-xs text-gray-400 hidden md:block" dir="ltr">{authedEmail}</span>
          )}
          <button onClick={authedEmail ? handleLogout : () => setIsAuthenticated(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition" title="יציאה">
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'סקירה', icon: BarChart3 },
            { id: 'registrations', label: 'הרשמות', icon: UserPlus, badge: newRegCount },
            { id: 'users', label: 'משתמשים', icon: Users },
            { id: 'messages', label: 'הודעות', icon: MessageCircle },
            { id: 'newsletter', label: 'ניוזלטר', icon: Mail },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab)
                if (tab.id === 'registrations') setNewRegCount(0)
              }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'סה״כ משתמשים', value: stats.totalUsers, icon: Users, color: 'blue', sub: `${stats.onlineUsers} מחוברים` },
                    { label: 'הרשמות היום', value: stats.todayRegistrations, icon: UserPlus, color: 'emerald', sub: 'מנויים + ניוזלטר' },
                    { label: 'הודעות היום', value: stats.todayMessages, icon: MessageCircle, color: 'green', sub: `${stats.totalMessages} סה״כ` },
                    { label: 'מנויים', value: stats.subscribers, icon: Crown, color: 'purple', sub: `${stats.newsletterUsers} ניוזלטר` },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border">
                      <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center mb-3`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm font-medium text-gray-700 mt-1">{stat.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* User Breakdown */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    פילוח משתמשים
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: 'מנויים פרימיום', count: stats.subscribers, total: stats.totalUsers, color: 'bg-blue-500' },
                      { label: 'מנויי ניוזלטר', count: stats.newsletterUsers, total: stats.totalUsers, color: 'bg-amber-500' },
                      { label: 'אורחים', count: stats.guests, total: stats.totalUsers, color: 'bg-gray-400' },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-medium">{item.count} ({item.total > 0 ? Math.round(item.count / item.total * 100) : 0}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest 5 registrations preview */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      הרשמות אחרונות
                    </h2>
                    <button onClick={() => setActiveTab('registrations')}
                      className="text-xs text-purple-600 hover:underline">
                      הצג הכל →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {registrations.slice(0, 5).map(user => (
                      <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: user.avatar_color || '#06b6d4' }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-sm">{user.name}</span>
                            {user.email && <p className="text-xs text-gray-400" dir="ltr">{user.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColor[user.user_type] || 'bg-gray-100'}`}>
                            {userTypeLabel[user.user_type] || user.user_type}
                          </span>
                          <span className="text-xs text-gray-400">{formatTimeAgo(user.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {registrations.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">אין הרשמות עדיין</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── REGISTRATIONS TAB ────────────────────────────────────── */}
            {activeTab === 'registrations' && (
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-purple-600" />
                      הרשמות ({registrations.length})
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      מנויים ומנויי ניוזלטר בלבד • מסודר מהחדש לישן
                    </p>
                  </div>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    ייצוא CSV
                  </button>
                </div>

                {/* Cards grid */}
                <div className="grid gap-3">
                  {registrations.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border">
                      <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">אין הרשמות עדיין</p>
                    </div>
                  ) : (
                    registrations.map((user, idx) => {
                      const isNew = idx === 0
                      const regDate = new Date(user.created_at)
                      const isToday = new Date().toDateString() === regDate.toDateString()

                      return (
                        <div key={user.id} className={`bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 ${isNew && newRegCount > 0 ? 'border-emerald-300 bg-emerald-50/30' : ''}`}>
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                            style={{ backgroundColor: user.avatar_color || '#06b6d4' }}>
                            {user.name.charAt(0)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{user.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColor[user.user_type] || 'bg-gray-100'}`}>
                                {userTypeLabel[user.user_type] || user.user_type}
                              </span>
                              {isToday && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> היום
                                </span>
                              )}
                              {user.is_online && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> מחובר
                                </span>
                              )}
                            </div>
                            {user.email && (
                              <p className="text-sm text-blue-600 mt-0.5" dir="ltr">{user.email}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {regDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                              {' · '}
                              {regDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}
                              {user.points} נקודות
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {user.user_type === 'newsletter' && (
                              <button
                                onClick={() => promoteUser(user.id, 'subscriber')}
                                title="הפוך למנוי פרימיום"
                                className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition font-medium"
                              >
                                <Crown className="w-3 h-3" /> שדרג
                              </button>
                            )}
                            {user.email && (
                              <a
                                href={`mailto:${user.email}`}
                                title="שלח מייל"
                                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => deleteUser(user.id)}
                              title="מחק"
                              className="p-2 hover:bg-red-50 rounded-lg transition text-red-400"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── USERS TAB ────────────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    placeholder="חפש לפי שם / אימייל / סוג..."
                    className="flex-1 border rounded-xl px-4 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-sm text-gray-500">{filteredUsers.length} משתמשים</span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">אימייל</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">סוג</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">נקודות</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">נרשם</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{user.email || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${userTypeColor[user.user_type] || 'bg-gray-100'}`}>
                              {userTypeLabel[user.user_type] || user.user_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <Award className="w-3 h-3 text-amber-500" />
                              {user.points}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.is_online
                              ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle className="w-4 h-4" />מחובר</span>
                              : <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle className="w-4 h-4" />לא מחובר</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatTimeAgo(user.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {user.user_type !== 'admin' && user.user_type !== 'subscriber' && user.user_type !== 'blocked' && (
                                <button onClick={() => promoteUser(user.id, 'subscriber')}
                                  title="הפוך למנוי" className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600">
                                  <Crown className="w-4 h-4" />
                                </button>
                              )}
                              {user.user_type === 'blocked' ? (
                                <button onClick={() => unblockUser(user.id)}
                                  title="בטל חסימה" className="p-1.5 hover:bg-emerald-50 rounded-lg transition text-emerald-600">
                                  <ShieldOff className="w-4 h-4" />
                                </button>
                              ) : user.user_type !== 'admin' && (
                                <button onClick={() => blockUser(user.id)}
                                  title="חסום משתמש" className="p-1.5 hover:bg-orange-50 rounded-lg transition text-orange-500">
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              {user.email && (
                                <a href={`mailto:${user.email}`} title="שלח מייל"
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">
                                  <Mail className="w-4 h-4" />
                                </a>
                              )}
                              <button onClick={() => deleteUser(user.id)}
                                title="מחק לצמיתות" className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── MESSAGES TAB ─────────────────────────────────────────── */}
            {activeTab === 'messages' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchMessage}
                      onChange={e => setSearchMessage(e.target.value)}
                      placeholder="חיפוש בהודעות..."
                      className="w-full border rounded-xl pr-10 pl-4 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">{filteredMessages.length} הודעות</span>
                  <button onClick={fetchMessages} className="text-sm text-purple-600 hover:underline flex items-center gap-1 shrink-0">
                    <RefreshCw className="w-4 h-4" /> רענן
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  {filteredMessages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm">{msg.user?.name || 'לא ידוע'}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${userTypeColor[msg.user?.user_type] || 'bg-gray-100'}`}>
                            {userTypeLabel[msg.user?.user_type] || ''}
                          </span>
                          {msg.is_pinned && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">📌 נעוץ</span>}
                          <span className="text-xs text-gray-400">{formatTimeAgo(msg.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {searchMessage
                            ? msg.content.split(new RegExp(`(${searchMessage})`, 'gi')).map((part, i) =>
                                part.toLowerCase() === searchMessage.toLowerCase()
                                  ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
                                  : part
                              )
                            : msg.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => pinMessage(msg.id, msg.is_pinned)}
                          title={msg.is_pinned ? 'בטל נעיצה' : 'נעץ'}
                          className={`p-1.5 rounded-lg transition ${msg.is_pinned ? 'bg-amber-50 text-amber-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                          <Pin className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMessage(msg.id)}
                          title="מחק"
                          className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── NEWSLETTER TAB ───────────────────────────────────────── */}
            {activeTab === 'newsletter' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-600" />
                    שליחת ניוזלטר
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    יישלח לכל המנויים שאישרו קבלת מיילים
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">נושא המייל</label>
                      <input
                        value={newsletterSubject}
                        onChange={e => setNewsletterSubject(e.target.value)}
                        placeholder="עדכון מחירים - חודש מאי 2026"
                        className="w-full border rounded-xl px-4 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תוכן המייל</label>
                      <textarea
                        value={newsletterContent}
                        onChange={e => setNewsletterContent(e.target.value)}
                        placeholder="שלום לקהילה! הנה עדכון המחירים החודשי..."
                        rows={8}
                        className="w-full border rounded-xl px-4 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      />
                    </div>
                    {sendResult && (
                      <div className={`p-3 rounded-xl text-sm text-center ${sendResult.includes('שגיאה') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {sendResult}
                      </div>
                    )}
                    <button
                      onClick={sendNewsletter}
                      disabled={isSending || !newsletterSubject || !newsletterContent}
                      className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSending ? <><RefreshCw className="w-4 h-4 animate-spin" /> שולח...</> : <><Send className="w-4 h-4" /> שלח ניוזלטר</>}
                    </button>
                  </div>
                </div>

                {/* Subscribers list */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      רשימת נמענים ({users.filter(u => (u.user_type === 'newsletter' || u.user_type === 'subscriber') && u.email).length})
                    </h3>
                    <button onClick={exportCSV} className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> CSV
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {users.filter(u => (u.user_type === 'newsletter' || u.user_type === 'subscriber') && u.email).map(user => (
                      <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{user.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500" dir="ltr">{user.email}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColor[user.user_type]}`}>
                            {userTypeLabel[user.user_type]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

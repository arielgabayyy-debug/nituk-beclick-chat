"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, MessageCircle, TrendingUp, Mail, Send, Trash2,
  Crown, Shield, Ban, RefreshCw, BarChart3, Bell,
  CheckCircle, XCircle, Star, Award, LogOut, Eye
} from 'lucide-react'
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
}

interface MessageRow {
  id: string
  content: string
  created_at: string
  is_pinned: boolean
  user: { name: string; user_type: string }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'messages' | 'newsletter' | 'polls'>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newsletterSubject, setNewsletterSubject] = useState('')
  const [newsletterContent, setNewsletterContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [searchUser, setSearchUser] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const fetchStats = useCallback(async () => {
    const [
      { count: totalUsers },
      { count: onlineUsers },
      { count: totalMessages },
      { count: subscribers },
      { count: newsletterUsers },
      { count: guests },
      { count: totalPolls },
      { count: totalDeals },
    ] = await Promise.all([
      supabase.from('chat_users').select('*', { count: 'exact', head: true }),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'subscriber'),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'newsletter'),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'guest'),
      supabase.from('polls').select('*', { count: 'exact', head: true }),
      supabase.from('hot_deals').select('*', { count: 'exact', head: true }),
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

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
    })
  }, [])

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('chat_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
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

  const filteredUsers = users.filter(u =>
    u.name.includes(searchUser) || u.email?.includes(searchUser) || u.user_type.includes(searchUser)
  )

  const userTypeColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    subscriber: 'bg-blue-100 text-blue-700',
    newsletter: 'bg-amber-100 text-amber-700',
    guest: 'bg-gray-100 text-gray-600',
  }

  const userTypeLabel: Record<string, string> = {
    admin: 'מנהל', subscriber: 'מנוי', newsletter: 'ניוזלטר', guest: 'אורח'
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">דאשבורד מנהל</h1>
            <p className="text-gray-500 text-sm mt-1">ניתוק בקליק</p>
          </div>
          <input
            type="password"
            placeholder="סיסמת מנהל"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border rounded-xl px-4 py-3 text-right mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          {authError && <p className="text-red-500 text-sm text-center mb-3">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold hover:bg-purple-700 transition"
          >
            כניסה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
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
            className="p-2 hover:bg-gray-100 rounded-lg transition">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => setIsAuthenticated(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition">
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'סקירה', icon: BarChart3 },
            { id: 'users', label: 'משתמשים', icon: Users },
            { id: 'messages', label: 'הודעות', icon: MessageCircle },
            { id: 'newsletter', label: 'ניוזלטר', icon: Mail },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
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
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'סה״כ משתמשים', value: stats.totalUsers, icon: Users, color: 'blue', sub: `${stats.onlineUsers} מחוברים` },
                    { label: 'הודעות היום', value: stats.todayMessages, icon: MessageCircle, color: 'green', sub: `${stats.totalMessages} סה״כ` },
                    { label: 'מנויים', value: stats.subscribers, icon: Crown, color: 'purple', sub: `${stats.newsletterUsers} ניוזלטר` },
                    { label: 'סקרים ועסקאות', value: stats.totalPolls + stats.totalDeals, icon: TrendingUp, color: 'amber', sub: `${stats.totalPolls} סקרים, ${stats.totalDeals} עסקאות` },
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
                    <Users className="w-5 h-5 text-purple-600" />
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
                          <div
                            className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Users */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    משתמשים אחרונים
                  </h2>
                  <div className="space-y-2">
                    {users.slice(0, 5).map(user => (
                      <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium text-sm">{user.name}</span>
                          <span className={`mr-2 text-xs px-2 py-0.5 rounded-full ${userTypeColor[user.user_type] || 'bg-gray-100'}`}>
                            {userTypeLabel[user.user_type] || user.user_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.is_online && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                          <span className="text-xs text-gray-400">{formatTimeAgo(user.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
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
                        <th className="text-right px-4 py-3 font-medium text-gray-600">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{user.email || '-'}</td>
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
                              ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-4 h-4" />מחובר</span>
                              : <span className="flex items-center gap-1 text-gray-400"><XCircle className="w-4 h-4" />לא מחובר</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {user.user_type !== 'admin' && (
                                <button onClick={() => promoteUser(user.id, 'subscriber')}
                                  title="הפוך למנוי"
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600">
                                  <Crown className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => deleteUser(user.id)}
                                title="מחק משתמש"
                                className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
                                <Ban className="w-4 h-4" />
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

            {/* MESSAGES TAB */}
            {activeTab === 'messages' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">הודעות אחרונות ({messages.length})</h2>
                  <button onClick={fetchMessages} className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                    <RefreshCw className="w-4 h-4" /> רענן
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{msg.user?.name || 'לא ידוע'}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${userTypeColor[msg.user?.user_type] || 'bg-gray-100'}`}>
                            {userTypeLabel[msg.user?.user_type] || ''}
                          </span>
                          {msg.is_pinned && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">📌 נעוץ</span>}
                          <span className="text-xs text-gray-400">{formatTimeAgo(msg.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => pinMessage(msg.id, msg.is_pinned)}
                          title={msg.is_pinned ? 'בטל נעיצה' : 'נעץ'}
                          className="p-1.5 hover:bg-amber-50 rounded-lg transition text-amber-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMessage(msg.id)}
                          title="מחק הודעה"
                          className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NEWSLETTER TAB */}
            {activeTab === 'newsletter' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-600" />
                    שליחת ניוזלטר
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    יישלח לכל המנויים והמשתמשים שאישרו קבלת מיילים
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
                      {isSending ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> שולח...</>
                      ) : (
                        <><Send className="w-4 h-4" /> שלח ניוזלטר</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Newsletter subscribers list */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    רשימת מנויים לניוזלטר ({users.filter(u => u.user_type === 'newsletter' || u.user_type === 'subscriber').length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {users
                      .filter(u => (u.user_type === 'newsletter' || u.user_type === 'subscriber') && u.email)
                      .map(user => (
                        <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm font-medium">{user.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{user.email}</span>
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

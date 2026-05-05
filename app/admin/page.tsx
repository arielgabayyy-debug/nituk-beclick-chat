"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminMFA } from '@/components/chat/admin-mfa'
import {
  Users, MessageCircle, TrendingUp, Mail, Send, Trash2,
  Crown, Shield, Ban, RefreshCw, BarChart3, CheckCircle,
  XCircle, Star, Award, LogOut, UserPlus, Pin, Download,
  Sparkles, ShieldOff, Search, Loader2, Trophy, Settings,
  Bell, HardDrive, AlertTriangle, Eye, EyeOff, Megaphone,
  Flag, CheckCheck, ChevronDown, ChevronUp, MoreVertical,
  Zap, Activity, Package, PieChart,
} from 'lucide-react'
import { formatTimeAgo } from '@/lib/chat-types'

// ── Constants ───────────────────────────────────────────────────────────────
const ADMIN_EMAILS = [
  'arielgabayyy@gmail.com',
  'nitukbeclick@gmail.com',
  'uziel10@gmail.com',
  'inbal2526@gmail.com',
  'hilaoh3263@gmail.com',
]

const userTypeColor: Record<string, string> = {
  admin:      'bg-purple-100 text-purple-700',
  subscriber: 'bg-blue-100   text-blue-700',
  newsletter: 'bg-amber-100  text-amber-700',
  guest:      'bg-gray-100   text-gray-600',
  blocked:    'bg-red-100    text-red-700',
}
const userTypeLabel: Record<string, string> = {
  admin: 'מנהל', subscriber: 'מנוי', newsletter: 'ניוזלטר',
  guest: 'אורח', blocked: '🚫 חסום',
}

// ── Types ───────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; onlineUsers: number; totalMessages: number
  subscribers: number; newsletterUsers: number; guests: number
  todayMessages: number; todayRegistrations: number
  blockedUsers: number; pinnedMessages: number
  totalReactions: number; totalReports: number
}
interface UserRow {
  id: string; name: string; email: string | null; user_type: string
  is_online: boolean; points: number; level: number
  messages_count: number; created_at: string; email_consent: boolean
  avatar_color: string; weekly_points: number; is_user_of_week: boolean
  helpful_count: number
}
interface MessageRow {
  id: string; content: string; created_at: string; is_pinned: boolean
  upvotes_count: number
  user: { name: string; user_type: string } | null
}
interface ReportRow {
  id: string; reason: string; status: string; admin_note: string | null
  created_at: string
  message: { id: string; content: string; created_at: string; user: { name: string } | null } | null
  reporter: { name: string; email: string | null } | null
}
interface StorageFile {
  name: string; size: number; type: string; created_at: string; url: string
}
interface Settings {
  slow_mode:        { enabled: boolean; seconds: number }
  banned_words:     { words: string[] }
  maintenance_mode: { enabled: boolean; message: string }
  welcome_message:  { text: string; enabled: boolean }
}
type TabId = 'overview' | 'users' | 'registrations' | 'messages' | 'leaderboard' | 'moderation' | 'newsletter' | 'storage' | 'settings'

// ── Mini Components ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.FC<{ className?: string }>; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function BarChart({ data, color = '#8b5cf6', label }: {
  data: { date: string; count: number }[]; color?: string; label: string
}) {
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">אין נתונים</p>
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 560, H = 100, PAD = 8
  const barW = Math.max(4, Math.floor((W - PAD * 2) / data.length) - 4)
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" style={{ minWidth: 280 }}>
        {data.map((d, i) => {
          const x = PAD + i * ((W - PAD * 2) / data.length) + 2
          const barH = Math.max(4, (d.count / max) * H)
          const y = H - barH + PAD
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.8} />
              {d.count > 0 && barW > 18 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#6b7280">{d.count}</text>
              )}
              <text x={x + barW / 2} y={H + PAD + 16} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {new Date(d.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
              </text>
            </g>
          )
        })}
        <text x={W / 2} y={H + PAD + 28} textAnchor="middle" fontSize={9} fill="#9ca3af">{label}</text>
      </svg>
    </div>
  )
}

// ── Supabase client (module-level singleton) ────────────────────────────────
const supabase = createClient()

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState<TabId>('overview')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mfaVerified, setMfaVerified] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authedEmail, setAuthedEmail] = useState<string | null>(null)

  // Data
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [users,    setUsers]    = useState<UserRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [reports,  setReports]  = useState<ReportRow[]>([])
  const [storage,  setStorage]  = useState<{ audio: StorageFile[]; images: StorageFile[] }>({ audio: [], images: [] })
  const [settings, setSettings] = useState<Settings>({
    slow_mode:        { enabled: false, seconds: 10 },
    banned_words:     { words: [] },
    maintenance_mode: { enabled: false, message: 'חזרה בקרוב...' },
    welcome_message:  { text: 'ברוכים הבאים לניתוק בקליק!', enabled: true },
  })
  const [regChart, setRegChart] = useState<{ date: string; count: number }[]>([])
  const [msgChart, setMsgChart] = useState<{ date: string; count: number }[]>([])
  const [liveActivity, setLiveActivity] = useState<Array<{ id: string; name: string; content: string; time: string; type: string }>>([])

  // UI state
  const [isLoading,    setIsLoading]    = useState(true)
  const [searchUser,   setSearchUser]   = useState('')
  const [searchMsg,    setSearchMsg]    = useState('')
  const [userPage,     setUserPage]     = useState(0)
  const [msgPage,      setMsgPage]      = useState(0)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [toast,        setToast]        = useState<string | null>(null)
  const [newRegCount,  setNewRegCount]  = useState(0)
  const [isSending,    setIsSending]    = useState(false)
  const [nlSubject,    setNlSubject]    = useState('')
  const [nlContent,    setNlContent]    = useState('')
  const [nlResult,     setNlResult]     = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [bannedInput,  setBannedInput]  = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [storageBucket, setStorageBucket]   = useState<'chat-audio' | 'chat-images'>('chat-audio')
  const [selectedFiles, setSelectedFiles]   = useState<Set<string>>(new Set())
  const [reportStatus,  setReportStatus]    = useState<'pending' | 'resolved' | 'dismissed'>('pending')
  const [pointsInput,   setPointsInput]     = useState<Record<string, string>>({})

  const PAGE_SIZE = 50

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Use getUser() (server-verified) rather than getSession() (client-side JWT only)
  // Also check mfa-status on mount so page refresh restores MFA state from cookie
  // (the admin_mfa cookie is httpOnly and must be read server-side).
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const email = user?.email?.toLowerCase()
      if (email && ADMIN_EMAILS.includes(email)) {
        setAuthedEmail(user!.email!)
        setIsAuthenticated(true)
        // MFA is ALWAYS required on every page load.
        // mfaVerified starts false and is only set true by AdminMFA after
        // a successful /api/admin/mfa-verify call with a valid TOTP code.
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const email = session?.user?.email?.toLowerCase()
      if (email && ADMIN_EMAILS.includes(email)) {
        setAuthedEmail(session!.user.email!)
        setIsAuthenticated(true)
      } else if (!session) {
        setIsAuthenticated(false)
        setMfaVerified(false)
        setAuthedEmail(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleLogin = () => {
    window.location.href = `https://nituk-beclick-chat.vercel.app/login?provider=google&return=${encodeURIComponent('https://nituk-beclick-chat.vercel.app/admin')}`
  }

  // ── Auth token helper — attaches Bearer token to admin API calls ──────────
  const adminFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || ''
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
        Authorization: `Bearer ${token}`,
      },
    })
  }, [])

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const fetchStats = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [
      { count: totalUsers }, { count: onlineUsers }, { count: totalMessages },
      { count: subscribers }, { count: newsletterUsers }, { count: guests },
      { count: todayMessages }, { count: todayRegistrations }, { count: blockedUsers },
      { count: pinnedMessages }, { count: totalReactions }, { count: totalReports },
    ] = await Promise.all([
      supabase.from('chat_users').select('*', { count: 'exact', head: true }),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'subscriber'),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'newsletter'),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'guest'),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('chat_users').select('*', { count: 'exact', head: true }).eq('user_type', 'blocked'),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('is_pinned', true),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('message_reactions').select('*', { count: 'exact', head: true }) as any as Promise<{ count: number | null }>).catch(() => ({ count: 0 })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('message_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending') as any as Promise<{ count: number | null }>).catch(() => ({ count: 0 })),
    ])
    setStats({
      totalUsers: totalUsers || 0, onlineUsers: onlineUsers || 0,
      totalMessages: totalMessages || 0, subscribers: subscribers || 0,
      newsletterUsers: newsletterUsers || 0, guests: guests || 0,
      todayMessages: todayMessages || 0, todayRegistrations: todayRegistrations || 0,
      blockedUsers: blockedUsers || 0, pinnedMessages: pinnedMessages || 0,
      totalReactions: (totalReactions as number) || 0,
      totalReports: (totalReports as number) || 0,
    })
  }, [])

  const fetchUsers = useCallback(async (page = 0, search = '') => {
    // avatar_url excluded — stored as base64 (can be 200KB+ per user), not needed in admin table
    let q = supabase.from('chat_users')
      .select('id, name, email, user_type, is_online, points, level, messages_count, created_at, email_consent, avatar_color, weekly_points, is_user_of_week, helpful_count')
      .order('created_at', { ascending: false })
    if (search) {
      q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    const { data } = await q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (page === 0) setUsers(data || [])
    else setUsers(prev => [...prev, ...(data || [])])
    setUserPage(page)
  }, [])

  const fetchMessages = useCallback(async (page = 0, search = '') => {
    // Try with upvotes_count first; fall back to without it if column doesn't exist yet
    let q = supabase
      .from('chat_messages')
      .select('id, content, created_at, is_pinned, upvotes_count, user:chat_users(name, user_type)')
      .order('created_at', { ascending: false })
    if (search) q = q.ilike('content', `%${search}%`)
    let { data, error } = await q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error?.code === '42703') {
      // upvotes_count column not yet migrated — query without it
      let q2 = supabase
        .from('chat_messages')
        .select('id, content, created_at, is_pinned, user:chat_users(name, user_type)')
        .order('created_at', { ascending: false })
      if (search) q2 = q2.ilike('content', `%${search}%`)
      const res2 = await q2.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      data = res2.data
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (page === 0) setMessages((data || []) as any as MessageRow[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else setMessages(prev => [...prev, ...((data || []) as any as MessageRow[])])
    setMsgPage(page)
  }, [])

  const fetchReports = useCallback(async (status: 'pending' | 'resolved' | 'dismissed' = 'pending') => {
    const res = await adminFetch(`/api/admin/reports?status=${status}`)
    const data = await res.json() as { reports: ReportRow[] }
    setReports(data.reports || [])
  }, [adminFetch])

  const fetchCharts = useCallback(async () => {
    // Build all 14 date ranges upfront
    const ranges = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i)); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      return { date: d.toISOString(), from: d.toISOString(), to: next.toISOString() }
    })

    // Fire all 28 queries in parallel (was sequential — 14× slower)
    const results = await Promise.all(
      ranges.flatMap(r => [
        supabase.from('chat_users').select('*', { count: 'exact', head: true }).gte('created_at', r.from).lt('created_at', r.to),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', r.from).lt('created_at', r.to),
      ])
    )

    const days: { date: string; count: number }[] = []
    const msgDays: { date: string; count: number }[] = []
    ranges.forEach((r, i) => {
      days.push({ date: r.date, count: (results[i * 2].count) || 0 })
      msgDays.push({ date: r.date, count: (results[i * 2 + 1].count) || 0 })
    })
    setRegChart(days); setMsgChart(msgDays)
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/settings')
      const data = await res.json() as Partial<Settings>
      setSettings(s => ({ ...s, ...data }))
      const words = (data.banned_words?.words || []).join(', ')
      setBannedInput(words)
    } catch { /* table may not exist yet */ }
  }, [adminFetch])

  const fetchStorage = useCallback(async (bucket: 'chat-audio' | 'chat-images') => {
    try {
      const res = await adminFetch(`/api/admin/storage?bucket=${bucket}`)
      const data = await res.json() as { files: StorageFile[] }
      setStorage(s => ({ ...s, [bucket === 'chat-audio' ? 'audio' : 'images']: data.files || [] }))
    } catch {}
  }, [adminFetch])

  // ── Initial load — only after both auth AND MFA are verified ─────────────
  // fetchCharts is intentionally NOT in the blocking Promise.all:
  //   it fires 28 parallel DB queries and can take a few seconds.
  //   Dashboard content appears immediately; charts fill in right after.
  useEffect(() => {
    if (!isAuthenticated || !mfaVerified) return
    setIsLoading(true)
    Promise.all([
      fetchStats(), fetchUsers(), fetchMessages(), fetchSettings(),
    ]).finally(() => {
      setIsLoading(false)
      // Load charts in background — won't block main content
      fetchCharts()
    })
  }, [isAuthenticated, mfaVerified, fetchStats, fetchUsers, fetchMessages, fetchCharts, fetchSettings])

  // ── Real-time: new registrations + live activity ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !mfaVerified) return
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_users' }, payload => {
        const u = payload.new as UserRow
        setUsers(p => [u, ...p])
        setStats(s => s ? { ...s, totalUsers: s.totalUsers + 1 } : s)
        if (u.user_type !== 'guest') {
          setNewRegCount(c => c + 1)
          showToast(`✅ ${u.name} נרשם כ${userTypeLabel[u.user_type] || u.user_type}`)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const m = payload.new as { id: string; content: string; user_id: string; created_at: string }
        setLiveActivity(p => [{
          id: m.id,
          name: 'משתמש',
          content: m.content.startsWith('[voice:') ? '🎤 הודעה קולית'
            : m.content.startsWith('[video:') ? '🎥 וידאו'
            : m.content.slice(0, 60),
          time: m.created_at,
          type: 'message',
        }, ...p.slice(0, 19)])
        setStats(s => s ? { ...s, todayMessages: s.todayMessages + 1, totalMessages: s.totalMessages + 1 } : s)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [isAuthenticated, mfaVerified])

  // ── Load tab-specific data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !mfaVerified) return
    if (tab === 'moderation') fetchReports(reportStatus)
    if (tab === 'storage') { fetchStorage('chat-audio'); fetchStorage('chat-images') }
  }, [tab, isAuthenticated, mfaVerified, fetchReports, fetchStorage, reportStatus])

  // ── User actions — all go through /api/admin/users for audit logging ─────
  const promoteUser = async (id: string, type: string) => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'promote_user', userId: id, value: type }),
    })
    if (!res.ok) { showToast('שגיאה בעדכון'); return }
    setUsers(u => u.map(x => x.id === id ? { ...x, user_type: type } : x))
    fetchStats()
    showToast('סוג משתמש עודכן')
  }
  const blockUser = async (id: string) => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'block_user', userId: id }),
    })
    if (!res.ok) { showToast('שגיאה בחסימה'); return }
    setUsers(u => u.map(x => x.id === id ? { ...x, user_type: 'blocked', is_online: false } : x))
    fetchStats(); showToast('משתמש נחסם')
  }
  const unblockUser = async (id: string) => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'unblock_user', userId: id }),
    })
    if (!res.ok) { showToast('שגיאה בביטול חסימה'); return }
    setUsers(u => u.map(x => x.id === id ? { ...x, user_type: 'guest' } : x))
    fetchStats(); showToast('חסימה בוטלה')
  }
  const deleteUser = async (id: string) => {
    if (!confirm('למחוק משתמש זה לצמיתות?')) return
    const res = await adminFetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) { showToast('שגיאה במחיקה'); return }
    setUsers(u => u.filter(x => x.id !== id))
    fetchStats(); showToast('משתמש נמחק')
  }
  const awardPoints = async (id: string, delta: number) => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'award_points', userId: id, value: delta }),
    })
    if (!res.ok) { showToast('שגיאה בעדכון נקודות'); return }
    const d = await res.json() as { newPoints?: number }
    if (d.newPoints !== undefined) {
      setUsers(u => u.map(x => x.id === id ? { ...x, points: d.newPoints! } : x))
    }
    showToast(`נקודות עודכנו: ${d.newPoints ?? ''}`)
  }
  const setUserOfWeek = async (id: string) => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'set_user_of_week', userId: id }),
    })
    if (!res.ok) { showToast('שגיאה בעדכון'); return }
    setUsers(u => u.map(x => ({ ...x, is_user_of_week: x.id === id })))
    showToast('משתמש השבוע עודכן! 🏆')
  }
  const resetWeeklyPoints = async () => {
    if (!confirm('לאפס נקודות שבועיות לכולם?')) return
    // This one still goes direct — it's a bulk operation on all rows (no single target)
    await supabase.from('chat_users').update({ weekly_points: 0, is_user_of_week: false }).gte('weekly_points', 0)
    setUsers(u => u.map(x => ({ ...x, weekly_points: 0, is_user_of_week: false })))
    showToast('נקודות שבועיות אופסו')
  }

  // ── Message actions ───────────────────────────────────────────────────────
  const pinMessage = async (id: string, pinned: boolean) => {
    await supabase.from('chat_messages').update({ is_pinned: !pinned }).eq('id', id)
    setMessages(m => m.map(x => x.id === id ? { ...x, is_pinned: !pinned } : x))
    fetchStats()
  }
  const deleteMessage = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('id', id)
    setMessages(m => m.filter(x => x.id !== id))
    fetchStats()
  }
  const bulkDeleteMessages = async (ids: string[]) => {
    // Single query with .in() instead of N sequential round-trips
    await supabase.from('chat_messages').delete().in('id', ids)
    setMessages(m => m.filter(x => !ids.includes(x.id)))
    showToast(`${ids.length} הודעות נמחקו`)
  }

  // ── Newsletter ────────────────────────────────────────────────────────────
  const sendNewsletter = async () => {
    if (!nlSubject || !nlContent) return
    setIsSending(true); setNlResult(null)
    try {
      const res = await adminFetch('/api/admin/newsletter', {
        method: 'POST',
        body: JSON.stringify({ subject: nlSubject, content: nlContent }),
      })
      const d = await res.json() as { message?: string; error?: string }
      setNlResult(d.message || d.error || 'נשלח בהצלחה!')
    } catch { setNlResult('שגיאה בשליחה') }
    finally { setIsSending(false) }
  }

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    // Look up admin's chat_users row (required for system_messages.user_id FK)
    const { data: adminUser } = user
      ? await supabase.from('chat_users').select('id').eq('email', user.email!.toLowerCase()).maybeSingle()
      : { data: null }
    await supabase.from('system_messages').insert({
      message_type: 'announcement',
      content: `📢 ${announcement}`,
      user_id: adminUser?.id ?? null,
    })
    setAnnouncement('')
    showToast('הכרזה נשלחה לצ\'אט!')
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingSettings(true)
    const updated: Partial<Settings> = {
      ...settings,
      banned_words: { words: bannedInput.split(',').map(w => w.trim()).filter(Boolean) },
    }
    await adminFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(updated),
    })
    setSavingSettings(false)
    showToast('הגדרות נשמרו בהצלחה! ✅')
  }

  // ── Storage ───────────────────────────────────────────────────────────────
  const deleteStorageFiles = async () => {
    if (!selectedFiles.size) return
    if (!confirm(`למחוק ${selectedFiles.size} קבצים?`)) return
    const res = await adminFetch('/api/admin/storage', {
      method: 'DELETE',
      body: JSON.stringify({ bucket: storageBucket, names: Array.from(selectedFiles) }),
    })
    if (!res.ok) { showToast('שגיאה במחיקת קבצים'); return }
    setSelectedFiles(new Set())
    fetchStorage(storageBucket)
    showToast(`${selectedFiles.size} קבצים נמחקו`)
  }

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b}B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
    return `${(b / 1024 / 1024).toFixed(1)}MB`
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    await adminFetch('/api/admin/reports', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    })
    setReports(r => r.filter(x => x.id !== id))
    showToast(status === 'resolved' ? 'דיווח טופל' : 'דיווח נדחה')
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const registrations = users.filter(u => !['guest', 'admin', 'blocked'].includes(u.user_type))
  const leaderboard   = [...users].sort((a, b) => b.points - a.points).slice(0, 50)
  const storageFiles  = storageBucket === 'chat-audio' ? storage.audio : storage.images
  const totalStorageSize = storageFiles.reduce((s, f) => s + f.size, 0)

  // ── Auth screens ──────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
    </div>
  )

  // ── MFA gate — shown after Google login, before dashboard ───────────────
  if (isAuthenticated && !mfaVerified) return (
    <AdminMFA
      userEmail={authedEmail || ''}
      onVerified={() => setMfaVerified(true)}
      onLogout={async () => {
        await supabase.auth.signOut()
        setIsAuthenticated(false)
        setMfaVerified(false)
        setAuthedEmail(null)
      }}
    />
  )

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">דאשבורד מנהל</h1>
          <p className="text-gray-400 text-sm mt-1">ניתוק בקליק</p>
        </div>
        <button onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          כניסה עם Google
        </button>
        <p className="text-xs text-gray-400 text-center mt-4">כניסה דרך Google בלבד — מנהלים מאושרים בלבד</p>
      </div>
    </div>
  )

  const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'overview',       label: 'סקירה',      icon: BarChart3 },
    { id: 'users',          label: 'משתמשים',    icon: Users },
    { id: 'registrations',  label: 'הרשמות',     icon: UserPlus, badge: newRegCount },
    { id: 'messages',       label: 'הודעות',     icon: MessageCircle },
    { id: 'leaderboard',    label: 'לידרבורד',   icon: Trophy },
    { id: 'moderation',     label: 'מודרציה',    icon: Flag, badge: stats?.totalReports ?? 0 },
    { id: 'newsletter',     label: 'תקשורת',     icon: Mail },
    { id: 'storage',        label: 'אחסון',      icon: HardDrive },
    { id: 'settings',       label: 'הגדרות',     icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white border border-emerald-200 shadow-xl rounded-2xl px-5 py-3 text-sm font-medium text-gray-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            {toast}
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">דאשבורד מנהל</h1>
            <p className="text-xs text-gray-400 leading-tight">ניתוק בקליק</p>
          </div>
          {stats && (
            <span className="hidden md:flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {stats.onlineUsers} מחוברים כעת
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => Promise.all([fetchStats(), fetchUsers(), fetchMessages()])}
            className="p-2 hover:bg-gray-100 rounded-lg transition" title="רענן">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          {authedEmail && <span className="text-xs text-gray-400 hidden lg:block" dir="ltr">{authedEmail}</span>}
          <button onClick={async () => { await supabase.auth.signOut(); setIsAuthenticated(false); setMfaVerified(false) }}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500" title="יציאה">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex min-w-max px-1 md:px-4">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'registrations') setNewRegCount(0) }}
              className={`relative flex items-center gap-1 px-2.5 md:px-4 py-3 text-[11px] md:text-sm font-medium border-b-2 whitespace-nowrap transition touch-manipulation ${tab === t.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span>{t.label}</span>
              {(t.badge ?? 0) > 0 && (
                <span className="absolute -top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <>

          {/* ════════ OVERVIEW ════════════════════════════════════════════ */}
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="סה״כ משתמשים"  value={stats.totalUsers}         sub={`${stats.onlineUsers} מחוברים`}         icon={Users}          color="blue" />
                <StatCard label="הרשמות היום"    value={stats.todayRegistrations} sub="מנויים + ניוזלטר"                        icon={UserPlus}       color="emerald" />
                <StatCard label="הודעות היום"    value={stats.todayMessages}      sub={`${stats.totalMessages.toLocaleString()} סה״כ`} icon={MessageCircle} color="green" />
                <StatCard label="מנויים"          value={stats.subscribers}        sub={`${stats.newsletterUsers} ניוזלטר`}     icon={Crown}          color="purple" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="אורחים"        value={stats.guests}         sub=""                         icon={Users}         color="gray" />
                <StatCard label="חסומים"        value={stats.blockedUsers}   sub="בלתי רצויים"              icon={Ban}           color="red" />
                <StatCard label="הודעות נעוצות" value={stats.pinnedMessages} sub="פעיל בצ׳אט"              icon={Pin}           color="amber" />
                <StatCard label="דיווחים פתוחים" value={stats.totalReports}  sub="ממתינים לטיפול"          icon={AlertTriangle} color="orange" />
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" /> הרשמות — 14 ימים
                  </h2>
                  <BarChart data={regChart} color="#8b5cf6" label="הרשמות יומיות" />
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-600" /> הודעות — 14 ימים
                  </h2>
                  <BarChart data={msgChart} color="#10b981" label="הודעות יומיות" />
                </div>
              </div>

              {/* User breakdown */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" /> פילוח משתמשים
                </h2>
                <div className="space-y-3">
                  {[
                    { label: 'מנויים פרימיום', count: stats.subscribers,    color: 'bg-blue-500' },
                    { label: 'מנויי ניוזלטר',  count: stats.newsletterUsers, color: 'bg-amber-500' },
                    { label: 'אורחים',          count: stats.guests,         color: 'bg-gray-400' },
                    { label: 'חסומים',          count: stats.blockedUsers,   color: 'bg-red-400' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium text-gray-900">
                          {item.count} ({stats.totalUsers > 0 ? Math.round(item.count / stats.totalUsers * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${stats.totalUsers > 0 ? (item.count / stats.totalUsers) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live activity feed */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  פיד פעילות חי
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-1" />
                </h2>
                {liveActivity.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">ממתין להודעות חדשות...</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {liveActivity.map(a => (
                      <div key={a.id} className="flex items-start gap-3 py-2 border-b last:border-0 text-sm">
                        <span className="text-lg shrink-0">💬</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 truncate">{a.content}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{formatTimeAgo(a.time)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent registrations */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" /> הרשמות אחרונות
                  </h2>
                  <button onClick={() => setTab('registrations')} className="text-xs text-purple-600 hover:underline">הצג הכל →</button>
                </div>
                <div className="space-y-2">
                  {registrations.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: u.avatar_color || '#06b6d4' }}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          {u.email && <p className="text-xs text-gray-400" dir="ltr">{u.email}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColor[u.user_type]}`}>{userTypeLabel[u.user_type]}</span>
                        <span className="text-xs text-gray-400">{formatTimeAgo(u.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════ USERS ═══════════════════════════════════════════════ */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchUser} onChange={e => { setSearchUser(e.target.value); fetchUsers(0, e.target.value) }}
                    placeholder="חיפוש שם / אימייל / סוג..."
                    className="w-full border rounded-xl pr-10 pl-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <button onClick={() => exportCSV(
                  [['שם','אימייל','סוג','נקודות','נרשם'], ...users.map(u => [`"${u.name}"`, u.email || '', userTypeLabel[u.user_type], String(u.points), new Date(u.created_at).toLocaleString('he-IL')])],
                  `users-${Date.now()}.csv`
                )} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition">
                  <Download className="w-4 h-4" /> ייצוא CSV
                </button>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5">
                  <span className="text-sm font-medium text-purple-700">{selectedIds.size} נבחרו</span>
                  <div className="flex gap-2 mr-auto flex-wrap">
                    {(['subscriber', 'newsletter', 'guest', 'blocked'] as const).map(type => (
                      <button key={type} onClick={async () => {
                        for (const id of selectedIds) await supabase.from('chat_users').update({ user_type: type }).eq('id', id)
                        setSelectedIds(new Set()); fetchUsers(0, searchUser); fetchStats()
                        showToast(`${selectedIds.size} משתמשים עודכנו`)
                      }} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${userTypeColor[type]}`}>
                        {userTypeLabel[type]}
                      </button>
                    ))}
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 px-2">ביטול</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input type="checkbox" className="accent-purple-600"
                          checked={selectedIds.size === users.length && users.length > 0}
                          onChange={e => setSelectedIds(e.target.checked ? new Set(users.map(u => u.id)) : new Set())} />
                      </th>
                      {['שם', 'אימייל', 'סוג', 'נקודות', 'הודעות', 'סטטוס', 'נרשם', 'פעולות'].map(h => (
                        <th key={h} className="text-right px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={`border-b last:border-0 hover:bg-gray-50 transition ${selectedIds.has(u.id) ? 'bg-purple-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" className="accent-purple-600" checked={selectedIds.has(u.id)}
                            onChange={e => setSelectedIds(p => { const n = new Set(p); e.target.checked ? n.add(u.id) : n.delete(u.id); return n })} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: u.avatar_color || '#06b6d4' }}>
                              {u.name.charAt(0)}
                            </div>
                            <span className="font-medium">{u.name}</span>
                            {u.is_user_of_week && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{u.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColor[u.user_type]}`}>{userTypeLabel[u.user_type]}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" />{u.points}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.messages_count || 0}</td>
                        <td className="px-4 py-3">
                          {u.is_online
                            ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle className="w-3.5 h-3.5" />מחובר</span>
                            : <span className="text-gray-400 text-xs">לא מחובר</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatTimeAgo(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {u.user_type !== 'admin' && u.user_type !== 'subscriber' && u.user_type !== 'blocked' && (
                              <button onClick={() => promoteUser(u.id, 'subscriber')} title="שדרג למנוי"
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600">
                                <Crown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {u.user_type === 'blocked'
                              ? <button onClick={() => unblockUser(u.id)} title="בטל חסימה" className="p-1.5 hover:bg-emerald-50 rounded-lg transition text-emerald-600"><ShieldOff className="w-3.5 h-3.5" /></button>
                              : u.user_type !== 'admin' && <button onClick={() => blockUser(u.id)} title="חסום" className="p-1.5 hover:bg-orange-50 rounded-lg transition text-orange-500"><Ban className="w-3.5 h-3.5" /></button>
                            }
                            {u.email && <a href={`mailto:${u.email}`} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"><Mail className="w-3.5 h-3.5" /></a>}
                            {u.user_type !== 'admin' && (
                              <button onClick={() => deleteUser(u.id)} title="מחק לצמיתות" className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center">
                <button onClick={() => fetchUsers(userPage + 1, searchUser)}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:underline px-4 py-2">
                  <ChevronDown className="w-4 h-4" /> טען עוד
                </button>
              </div>
            </div>
          )}

          {/* ════════ REGISTRATIONS ═══════════════════════════════════════ */}
          {tab === 'registrations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" /> הרשמות ({registrations.length})
                </h2>
                <button onClick={() => exportCSV(
                  [['שם','אימייל','סוג','נקודות','תאריך'],
                    ...registrations.map(u => [`"${u.name}"`, u.email || '', userTypeLabel[u.user_type], String(u.points), new Date(u.created_at).toLocaleString('he-IL')])],
                  `registrations-${new Date().toLocaleDateString('he-IL').replace(/\//g,'-')}.csv`
                )} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition">
                  <Download className="w-4 h-4" /> ייצוא CSV
                </button>
              </div>
              <div className="grid gap-3">
                {registrations.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">אין הרשמות עדיין</p>
                  </div>
                ) : registrations.map((u, idx) => {
                  const isToday = new Date().toDateString() === new Date(u.created_at).toDateString()
                  return (
                    <div key={u.id} className={`bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 ${idx === 0 && newRegCount > 0 ? 'border-emerald-300 bg-emerald-50/30' : ''}`}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ backgroundColor: u.avatar_color || '#06b6d4' }}>{u.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{u.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColor[u.user_type]}`}>{userTypeLabel[u.user_type]}</span>
                          {isToday && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> היום</span>}
                          {u.is_online && <span className="flex items-center gap-1 text-xs text-emerald-600"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />מחובר</span>}
                        </div>
                        {u.email && <p className="text-sm text-blue-600 mt-0.5" dir="ltr">{u.email}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(u.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{u.points} נקודות · {u.messages_count || 0} הודעות
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {u.user_type === 'newsletter' && (
                          <button onClick={() => promoteUser(u.id, 'subscriber')}
                            className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition font-medium">
                            <Crown className="w-3 h-3" /> שדרג
                          </button>
                        )}
                        {u.email && <a href={`mailto:${u.email}`} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"><Mail className="w-4 h-4" /></a>}
                        <button onClick={() => deleteUser(u.id)} className="p-2 hover:bg-red-50 rounded-lg transition text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════ MESSAGES ════════════════════════════════════════════ */}
          {tab === 'messages' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchMsg} onChange={e => { setSearchMsg(e.target.value); fetchMessages(0, e.target.value) }}
                    placeholder="חיפוש בהודעות (Supabase)..."
                    className="w-full border rounded-xl pr-10 pl-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <button onClick={() => fetchMessages(0, searchMsg)} className="p-2.5 border rounded-xl hover:bg-gray-50 transition"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
                <button onClick={() => exportCSV(
                  [['שם','סוג','תוכן','תאריך'],
                    ...messages.map(m => [`"${m.user?.name || ''}"`, m.user?.user_type || '', `"${m.content.replace(/"/g,'""').slice(0,200)}"`, new Date(m.created_at).toLocaleString('he-IL')])],
                  `messages-${Date.now()}.csv`
                )} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition">
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {messages.length === 0 && <p className="text-center text-gray-400 py-12">אין הודעות</p>}
                {messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{msg.user?.name || 'לא ידוע'}</span>
                        {msg.user?.user_type && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${userTypeColor[msg.user.user_type]}`}>{userTypeLabel[msg.user.user_type]}</span>
                        )}
                        {msg.is_pinned && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">📌 נעוץ</span>}
                        {msg.upvotes_count > 0 && <span className="text-xs text-emerald-600">👍 {msg.upvotes_count}</span>}
                        <span className="text-xs text-gray-400">{formatTimeAgo(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {msg.content.startsWith('[voice:') ? '🎤 הודעה קולית'
                          : msg.content.startsWith('[video:') ? '🎥 הודעת וידאו'
                          : msg.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => pinMessage(msg.id, msg.is_pinned)} title={msg.is_pinned ? 'בטל נעיצה' : 'נעץ'}
                        className={`p-1.5 rounded-lg transition ${msg.is_pinned ? 'bg-amber-50 text-amber-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                        <Pin className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMessage(msg.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => fetchMessages(msgPage + 1, searchMsg)}
                className="flex items-center gap-2 text-sm text-purple-600 hover:underline mx-auto px-4 py-2">
                <ChevronDown className="w-4 h-4" /> טען עוד
              </button>
            </div>
          )}

          {/* ════════ LEADERBOARD ═════════════════════════════════════════ */}
          {tab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> לידרבורד משתמשים
                </h2>
                <button onClick={resetWeeklyPoints}
                  className="flex items-center gap-2 text-sm text-orange-600 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition">
                  <RefreshCw className="w-4 h-4" /> אפס נקודות שבועיות
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600 w-12">#</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">שם</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">נקודות</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">שבועיות</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">רמה</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">הודעות</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((u, i) => (
                      <tr key={u.id} className={`border-b last:border-0 hover:bg-gray-50 transition ${u.is_user_of_week ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-4 py-3 font-bold text-gray-500">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: u.avatar_color || '#06b6d4' }}>{u.name.charAt(0)}</div>
                            <span className="font-medium">{u.name}</span>
                            {u.is_user_of_week && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">👑 השבוע</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-600">{u.points}</td>
                        <td className="px-4 py-3 text-blue-600">{u.weekly_points || 0}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Lv.{u.level}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.messages_count || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Award/deduct points */}
                            <input
                              type="number"
                              placeholder="±נקודות"
                              value={pointsInput[u.id] || ''}
                              onChange={e => setPointsInput(p => ({ ...p, [u.id]: e.target.value }))}
                              className="w-20 border rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                            <button
                              onClick={() => {
                                const delta = parseInt(pointsInput[u.id] || '0', 10)
                                if (!isNaN(delta)) { awardPoints(u.id, delta); setPointsInput(p => ({ ...p, [u.id]: '' })) }
                              }}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition text-xs font-medium"
                              title="עדכן נקודות">
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setUserOfWeek(u.id)}
                              title="קבע כמשתמש השבוע"
                              className={`p-1.5 rounded-lg transition ${u.is_user_of_week ? 'bg-amber-100 text-amber-700' : 'hover:bg-amber-50 text-gray-400'}`}>
                              <Trophy className="w-3.5 h-3.5" />
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

          {/* ════════ MODERATION ══════════════════════════════════════════ */}
          {tab === 'moderation' && (
            <div className="space-y-6">
              {/* Pinned messages */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Pin className="w-5 h-5 text-amber-500" /> הודעות נעוצות ({messages.filter(m => m.is_pinned).length})
                </h2>
                {messages.filter(m => m.is_pinned).length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">אין הודעות נעוצות</p>
                  : (
                    <div className="space-y-2">
                      {messages.filter(m => m.is_pinned).map(msg => (
                        <div key={msg.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-amber-700 mb-0.5">{msg.user?.name || 'לא ידוע'}</p>
                            <p className="text-sm text-gray-700 truncate">{msg.content}</p>
                          </div>
                          <button onClick={() => pinMessage(msg.id, true)} className="text-xs text-amber-600 hover:underline shrink-0">בטל נעיצה</button>
                          <button onClick={() => deleteMessage(msg.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              {/* Reports */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-500" /> דיווחים
                  </h2>
                  <div className="flex gap-2">
                    {(['pending', 'resolved', 'dismissed'] as const).map(s => (
                      <button key={s} onClick={() => { setReportStatus(s); fetchReports(s) }}
                        className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${reportStatus === s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s === 'pending' ? 'פתוחים' : s === 'resolved' ? 'טופלו' : 'נדחו'}
                      </button>
                    ))}
                  </div>
                </div>
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400 opacity-40" />
                    <p className="text-sm">אין דיווחים {reportStatus === 'pending' ? 'פתוחים' : reportStatus === 'resolved' ? 'מטופלים' : 'שנדחו'} 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map(r => (
                      <div key={r.id} className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{r.reason}</span>
                              <span className="text-xs text-gray-400">{formatTimeAgo(r.created_at)}</span>
                              {r.reporter && <span className="text-xs text-gray-500">דווח ע״י: {r.reporter.name}</span>}
                            </div>
                            {r.message && (
                              <div className="bg-white rounded-lg p-2.5 border border-red-100 mt-2">
                                <p className="text-xs font-medium text-gray-600 mb-1">{r.message.user?.name || 'לא ידוע'}</p>
                                <p className="text-sm text-gray-700 line-clamp-3">{r.message.content}</p>
                              </div>
                            )}
                          </div>
                          {reportStatus === 'pending' && (
                            <div className="flex gap-1 shrink-0">
                              {r.message && (
                                <button onClick={() => { deleteMessage(r.message!.id); resolveReport(r.id, 'resolved') }}
                                  className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-1.5 rounded-lg transition font-medium flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> מחק
                                </button>
                              )}
                              <button onClick={() => resolveReport(r.id, 'resolved')}
                                className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg transition font-medium">
                                <CheckCheck className="w-3 h-3" />
                              </button>
                              <button onClick={() => resolveReport(r.id, 'dismissed')}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg transition">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ NEWSLETTER / COMMS ══════════════════════════════════ */}
          {tab === 'newsletter' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Newsletter */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Mail className="w-5 h-5 text-purple-600" /> שליחת ניוזלטר</h2>
                  <p className="text-sm text-gray-500 mb-4">יישלח לכל {users.filter(u => (u.user_type === 'newsletter' || u.user_type === 'subscriber') && u.email).length} מנויים עם הסכמה</p>
                  <div className="space-y-3">
                    <input value={nlSubject} onChange={e => setNlSubject(e.target.value)} placeholder="נושא המייל"
                      className="w-full border rounded-xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    <textarea value={nlContent} onChange={e => setNlContent(e.target.value)} placeholder="תוכן המייל..." rows={8}
                      className="w-full border rounded-xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                    {nlResult && (
                      <div className={`p-3 rounded-xl text-sm text-center ${nlResult.includes('שגיאה') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{nlResult}</div>
                    )}
                    <button onClick={sendNewsletter} disabled={isSending || !nlSubject || !nlContent}
                      className="w-full bg-purple-600 text-white rounded-xl py-2.5 font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Send className="w-4 h-4" /> שלח ניוזלטר</>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* System announcement */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-purple-100">
                  <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Megaphone className="w-5 h-5 text-purple-600" /> הכרזת מערכת לצ׳אט</h3>
                  <p className="text-sm text-gray-500 mb-4">תופיע כהודעת מערכת לכל המחוברים</p>
                  <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)}
                    placeholder="📢 הכרזה לכל הקהילה..." rows={3}
                    className="w-full border bg-white rounded-xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none mb-3" />
                  <button onClick={sendAnnouncement} disabled={!announcement.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    <Bell className="w-4 h-4" /> שלח הכרזה
                  </button>
                </div>

                {/* Broadcast */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> שידור מהיר לכולם</h3>
                  <p className="text-sm text-gray-500 mb-3">שימוש בתוכן הניוזלטר — ממלא מהטופס משמאל</p>
                  <div className="flex gap-3 mb-3">
                    {(['all', 'subscribers', 'newsletter'] as const).map(t => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" name="bt" value={t} className="accent-purple-600" defaultChecked={t === 'all'} />
                        {t === 'all' ? 'כולם' : t === 'subscribers' ? 'מנויים' : 'ניוזלטר'}
                      </label>
                    ))}
                  </div>
                  <button onClick={() => {
                    const target = (document.querySelector('input[name="bt"]:checked') as HTMLInputElement)?.value || 'all'
                    if (!nlSubject || !nlContent) { showToast('מלא נושא ותוכן בטופס הניוזלטר'); return }
                    adminFetch('/api/admin/broadcast', {
                      method: 'POST',
                      body: JSON.stringify({ subject: nlSubject, message: nlContent, targetType: target }),
                    }).then(r => r.json()).then((d: { sent?: number }) => showToast(`נשלח! ${d.sent || 0} מיילים`))
                      .catch(() => showToast('שגיאה בשליחה'))
                  }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 font-semibold transition flex items-center justify-center gap-2 text-sm">
                    <Send className="w-4 h-4" /> שלח שידור
                  </button>
                </div>

                {/* Subscriber list */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      נמענים ({users.filter(u => ['newsletter', 'subscriber'].includes(u.user_type) && u.email).length})
                    </h3>
                    <button onClick={() => exportCSV([['שם','אימייל','סוג'], ...users.filter(u => u.email && ['newsletter','subscriber'].includes(u.user_type)).map(u => [`"${u.name}"`, u.email || '', userTypeLabel[u.user_type]])], 'subscribers.csv')}
                      className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {users.filter(u => ['newsletter', 'subscriber'].includes(u.user_type) && u.email).map(u => (
                      <div key={u.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <span className="font-medium">{u.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500" dir="ltr">{u.email}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${userTypeColor[u.user_type]}`}>{userTypeLabel[u.user_type]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ STORAGE ═════════════════════════════════════════════ */}
          {tab === 'storage' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-2">
                  {(['chat-audio', 'chat-images'] as const).map(b => (
                    <button key={b} onClick={() => { setStorageBucket(b); fetchStorage(b) }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${storageBucket === b ? 'bg-purple-600 text-white' : 'bg-white border hover:bg-gray-50 text-gray-600'}`}>
                      {b === 'chat-audio' ? '🎙️' : '🖼️'} {b === 'chat-audio' ? 'שמע / וידאו' : 'תמונות'}
                    </button>
                  ))}
                </div>
                <div className="mr-auto flex items-center gap-3">
                  <span className="text-sm text-gray-500">{storageFiles.length} קבצים · {formatBytes(totalStorageSize)}</span>
                  {selectedFiles.size > 0 && (
                    <button onClick={deleteStorageFiles}
                      className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition">
                      <Trash2 className="w-4 h-4" /> מחק {selectedFiles.size} נבחרים
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {storageFiles.length === 0
                  ? <div className="text-center py-12 text-gray-400"><Package className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>אין קבצים בבאקט זה</p></div>
                  : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 w-8">
                            <input type="checkbox" className="accent-purple-600"
                              checked={selectedFiles.size === storageFiles.length && storageFiles.length > 0}
                              onChange={e => setSelectedFiles(e.target.checked ? new Set(storageFiles.map(f => f.name)) : new Set())} />
                          </th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">שם קובץ</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">סוג</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">גודל</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך</th>
                          <th className="px-4 py-3 font-medium text-gray-600">פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageFiles.map(f => (
                          <tr key={f.name} className={`border-b last:border-0 hover:bg-gray-50 ${selectedFiles.has(f.name) ? 'bg-purple-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" className="accent-purple-600" checked={selectedFiles.has(f.name)}
                                onChange={e => setSelectedFiles(p => { const n = new Set(p); e.target.checked ? n.add(f.name) : n.delete(f.name); return n })} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs truncate max-w-[180px]">{f.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{f.type || '—'}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(f.size)}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{f.created_at ? formatTimeAgo(f.created_at) : '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <a href={f.url} target="_blank" rel="noreferrer"
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-500" title="פתח">
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <button onClick={async () => {
                                  await adminFetch('/api/admin/storage', { method: 'DELETE', body: JSON.stringify({ bucket: storageBucket, names: [f.name] }) })
                                  fetchStorage(storageBucket)
                                }} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-400" title="מחק">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>
          )}

          {/* ════════ SETTINGS ════════════════════════════════════════════ */}
          {tab === 'settings' && (
            <div className="space-y-5 max-w-2xl">
              {/* Slow mode */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-600" /> מצב איטי (Slow Mode)</h2>
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setSettings(s => ({ ...s, slow_mode: { ...s.slow_mode, enabled: !s.slow_mode.enabled } }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.slow_mode.enabled ? 'bg-purple-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.slow_mode.enabled ? 'translate-x-[1px]' : '-translate-x-5'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{settings.slow_mode.enabled ? 'פעיל' : 'כבוי'}</span>
                </div>
                {settings.slow_mode.enabled && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">שניות בין הודעות:</label>
                    <input type="number" min={1} max={3600} value={settings.slow_mode.seconds}
                      onChange={e => setSettings(s => ({ ...s, slow_mode: { ...s.slow_mode, seconds: Number(e.target.value) } }))}
                      className="border rounded-lg px-3 py-1.5 w-24 text-center focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />
                  </div>
                )}
              </div>

              {/* Maintenance mode */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><EyeOff className="w-5 h-5 text-orange-500" /> מצב תחזוקה</h2>
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setSettings(s => ({ ...s, maintenance_mode: { ...s.maintenance_mode, enabled: !s.maintenance_mode.enabled } }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.maintenance_mode.enabled ? 'bg-orange-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.maintenance_mode.enabled ? 'translate-x-[1px]' : '-translate-x-5'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{settings.maintenance_mode.enabled ? '🔴 פעיל — הצ׳אט נעול למשתמשים' : 'כבוי'}</span>
                </div>
                <input value={settings.maintenance_mode.message}
                  onChange={e => setSettings(s => ({ ...s, maintenance_mode: { ...s.maintenance_mode, message: e.target.value } }))}
                  placeholder="הודעת תחזוקה..."
                  className="w-full border rounded-xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              {/* Welcome message */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-blue-500" /> הודעת ברוכים הבאים</h2>
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setSettings(s => ({ ...s, welcome_message: { ...s.welcome_message, enabled: !s.welcome_message.enabled } }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.welcome_message.enabled ? 'bg-blue-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.welcome_message.enabled ? 'translate-x-[1px]' : '-translate-x-5'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{settings.welcome_message.enabled ? 'פעיל' : 'כבוי'}</span>
                </div>
                <input value={settings.welcome_message.text}
                  onChange={e => setSettings(s => ({ ...s, welcome_message: { ...s.welcome_message, text: e.target.value } }))}
                  placeholder="ברוכים הבאים לניתוק בקליק!"
                  className="w-full border rounded-xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Banned words */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Ban className="w-5 h-5 text-red-500" /> מילים אסורות</h2>
                <p className="text-xs text-gray-400 mb-3">
                  {bannedInput.split(',').filter(w => w.trim()).length} מילים • מופרדות בפסיקים
                </p>
                <textarea value={bannedInput} onChange={e => setBannedInput(e.target.value)}
                  placeholder="מילה1, מילה2, מילה3..."
                  rows={4} dir="rtl"
                  className="w-full border rounded-xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>

              <button onClick={saveSettings} disabled={savingSettings}
                className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingSettings ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><CheckCircle className="w-4 h-4" /> שמור הגדרות ב-Supabase</>}
              </button>
              <p className="text-xs text-gray-400 text-center">ההגדרות נשמרות ב-Supabase ומשותפות לכל המנהלים</p>
            </div>
          )}

          </>
        )}
      </div>
    </div>
  )
}

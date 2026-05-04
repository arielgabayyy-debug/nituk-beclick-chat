"use client"

import { useState, useEffect, useCallback } from 'react'
import { X, Bell, BellOff, Zap, Eye, EyeOff, Plus, Trash2, BarChart2, MessageSquare, TrendingUp, Clock, Star, Download, Brain, Hash, Settings2, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ChatUser, ChatMessage } from '@/lib/chat-types'

interface SmartSettingsPanelProps {
  currentUser: ChatUser
  messages: ChatMessage[]
  onClose: () => void
}

type Tab = 'alerts' | 'insights' | 'digest' | 'preferences'

// ── Default settings ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  soundOnMention: true,
  soundOnKeyword: true,
  showReadReceipts: true,
  autoTranslate: false,
  compactMode: false,
  showLinkPreviews: true,
  fontSize: 'md' as 'sm' | 'md' | 'lg',
  bubbleStyle: 'gradient' as 'gradient' | 'flat' | 'minimal',
  notifyOnJoin: false,
  digestEnabled: true,
}

type UserSettings = typeof DEFAULT_SETTINGS

export function SmartSettingsPanel({ currentUser, messages, onClose }: SmartSettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('alerts')
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [keywords, setKeywords] = useState<{ id: string; keyword: string; triggered_count: number }[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [digest, setDigest] = useState<string | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const supabase = createClient()

  // ── Load settings & keywords ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [{ data: settingsRow }, { data: kw }] = await Promise.all([
        supabase.from('user_chat_settings').select('settings').eq('user_id', currentUser.id).single(),
        supabase.from('user_keyword_alerts').select('id,keyword,triggered_count').eq('user_id', currentUser.id).eq('is_active', true).order('created_at'),
      ])
      if (settingsRow?.settings) setSettings({ ...DEFAULT_SETTINGS, ...settingsRow.settings })
      if (kw) setKeywords(kw)
    }
    load()
  }, [currentUser.id])

  // ── Save settings to Supabase ─────────────────────────────────────────────
  const saveSettings = useCallback(async (next: UserSettings) => {
    setSaving(true)
    await supabase.from('user_chat_settings').upsert({
      user_id: currentUser.id,
      settings: next,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [currentUser.id])

  const toggle = (key: keyof UserSettings) => {
    const next = { ...settings, [key]: !settings[key as keyof UserSettings] }
    setSettings(next)
    saveSettings(next)
  }

  const setOption = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
  }

  // ── Keyword alerts ────────────────────────────────────────────────────────
  const addKeyword = async () => {
    const kw = newKeyword.trim().toLowerCase()
    if (!kw || keywords.some(k => k.keyword === kw)) return
    const { data } = await supabase.from('user_keyword_alerts').insert({
      user_id: currentUser.id, keyword: kw
    }).select('id,keyword,triggered_count').single()
    if (data) setKeywords(prev => [...prev, data])
    setNewKeyword('')
  }

  const removeKeyword = async (id: string) => {
    await supabase.from('user_keyword_alerts').update({ is_active: false }).eq('id', id)
    setKeywords(prev => prev.filter(k => k.id !== id))
  }

  // ── Personal insights ─────────────────────────────────────────────────────
  const myMessages = messages.filter(m => m.user_id === currentUser.id)
  const today = new Date(); today.setHours(0,0,0,0)
  const todayMsgs = myMessages.filter(m => new Date(m.created_at) >= today).length
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const weekMsgs = myMessages.filter(m => new Date(m.created_at) >= weekAgo).length
  const avgPerDay = Math.round(weekMsgs / 7)

  // Peak hour
  const hourCounts: Record<number, number> = {}
  myMessages.forEach(m => {
    const h = new Date(m.created_at).getHours()
    hourCounts[h] = (hourCounts[h] || 0) + 1
  })
  const peakHour = Object.entries(hourCounts).sort((a,b) => b[1]-a[1])[0]

  // Top keywords in my messages
  const wordCounts: Record<string, number> = {}
  myMessages.forEach(m => {
    m.content.split(/\s+/).filter(w => w.length > 3).forEach(w => {
      const clean = w.replace(/[^֐-׿a-zA-Z]/g, '').toLowerCase()
      if (clean.length > 3) wordCounts[clean] = (wordCounts[clean] || 0) + 1
    })
  })
  const topWords = Object.entries(wordCounts).sort((a,b) => b[1]-a[1]).slice(0,6)

  // ── Catch-up digest ───────────────────────────────────────────────────────
  const generateDigest = async () => {
    setDigestLoading(true)
    try {
      const lastHour = new Date(Date.now() - 3600000)
      const recent = messages
        .filter(m => new Date(m.created_at) >= lastHour && m.user_id !== currentUser.id)
        .slice(-30)
        .map(m => `${m.user?.name || 'משתמש'}: ${m.content.slice(0, 80)}`)
        .join('\n')

      if (!recent) { setDigest('אין הודעות חדשות בשעה האחרונה 👋'); setDigestLoading(false); return }

      const res = await fetch('/api/ai-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `סכם בעברית ב-3-4 משפטים קצרים מה קרה בצ'אט הקהילתי בשעה האחרונה. היה תמציתי ומעניין:\n\n${recent}`
        })
      })
      const data = await res.json()
      setDigest(data.answer || 'לא הצלחתי לסכם. נסה שוב.')
    } catch {
      setDigest('שגיאה בטעינת הסיכום.')
    } finally {
      setDigestLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">הגדרות חכמות</h2>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" />נשמר</span>}
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          {([
            { id: 'alerts', label: 'התראות', icon: Bell },
            { id: 'insights', label: 'סטטיסטיקות', icon: BarChart2 },
            { id: 'digest', label: 'סיכום AI', icon: Brain },
            { id: 'preferences', label: 'העדפות', icon: Zap },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                tab === id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── ALERTS TAB ── */}
          {tab === 'alerts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Hash className="w-4 h-4 text-primary" />מילות מפתח</h3>
                <p className="text-xs text-muted-foreground mb-3">קבל התראה כשמישהו כותב את המילים האלה בצ'אט</p>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    placeholder="פרטנר, HOT, חבילה..."
                    className="flex-1 text-sm bg-muted/50 border border-border/50 rounded-xl px-3 py-2 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!newKeyword.trim()}
                    className="px-3 py-2 bg-primary text-white rounded-xl text-sm disabled:opacity-50 hover:bg-primary/90 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {keywords.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">אין מילות מפתח עדיין</p>
                  )}
                  {keywords.map(kw => (
                    <div key={kw.id} className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
                      <Hash className="w-3 h-3 text-primary shrink-0" />
                      <span className="flex-1 text-sm">{kw.keyword}</span>
                      {kw.triggered_count > 0 && (
                        <span className="text-xs text-muted-foreground">{kw.triggered_count}× הופעל</span>
                      )}
                      <button onClick={() => removeKeyword(kw.id)} className="text-muted-foreground hover:text-destructive transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/20">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Bell className="w-4 h-4 text-primary" />הגדרות התראה</h3>
                {([
                  { key: 'soundOnMention', label: 'צליל בעת אזכור (@)', icon: Bell },
                  { key: 'soundOnKeyword', label: 'צליל בעת מילת מפתח', icon: Hash },
                  { key: 'notifyOnJoin', label: 'התראה כשמשתמש מצטרף', icon: MessageSquare },
                ] as { key: keyof UserSettings; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <button
                      onClick={() => toggle(key)}
                      className={cn("w-10 h-6 rounded-full transition-colors relative", settings[key] ? "bg-primary" : "bg-muted-foreground/30")}
                    >
                      <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all", settings[key] ? "right-1" : "left-1")} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {tab === 'insights' && (
            <div className="space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'הודעות היום', value: todayMsgs, icon: '💬' },
                  { label: 'השבוע', value: weekMsgs, icon: '📅' },
                  { label: 'ממוצע/יום', value: avgPerDay, icon: '📊' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-muted/30 rounded-xl p-3 text-center">
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>

              {/* Gamification */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-400/20">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" />דירוג שלי</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span>⭐</span>
                    <span className="font-medium">{currentUser.points || 0} נקודות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🏅</span>
                    <span className="font-medium">רמה {currentUser.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>💬</span>
                    <span className="font-medium">{currentUser.messages_count || 0} הודעות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👍</span>
                    <span className="font-medium">{currentUser.helpful_count || 0} עזרות</span>
                  </div>
                </div>
              </div>

              {/* Peak hour */}
              {peakHour && (
                <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
                  <Clock className="w-8 h-8 text-primary/60 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">שעת שיא שלך</p>
                    <p className="text-xs text-muted-foreground">{peakHour[0]}:00 — הכי פעיל עם {peakHour[1]} הודעות</p>
                  </div>
                </div>
              )}

              {/* Top words */}
              {topWords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" />מילים שאני כותב הכי הרבה</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {topWords.map(([word, count]) => (
                      <span key={word} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {word} <span className="opacity-60">×{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DIGEST TAB ── */}
          {tab === 'digest' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <Brain className="w-10 h-10 text-primary mx-auto mb-2 opacity-80" />
                <h3 className="font-semibold mb-1">סיכום AI חכם</h3>
                <p className="text-xs text-muted-foreground">קבל סיכום של מה שקרה בצ'אט בשעה האחרונה</p>
              </div>

              {digest && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm leading-relaxed">
                  {digest}
                </div>
              )}

              <button
                onClick={generateDigest}
                disabled={digestLoading}
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {digestLoading ? (
                  <><span className="animate-spin">⚡</span> מסכם...</>
                ) : (
                  <><Brain className="w-4 h-4" /> {digest ? 'עדכן סיכום' : 'סכם עכשיו'}</>
                )}
              </button>

              <div className="space-y-2 border-t border-border/20 pt-3">
                <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-xl">
                  <span className="text-sm">סיכום אוטומטי פעיל</span>
                  <button
                    onClick={() => toggle('digestEnabled')}
                    className={cn("w-10 h-6 rounded-full transition-colors relative", settings.digestEnabled ? "bg-primary" : "bg-muted-foreground/30")}
                  >
                    <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all", settings.digestEnabled ? "right-1" : "left-1")} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PREFERENCES TAB ── */}
          {tab === 'preferences' && (
            <div className="space-y-4">

              {/* Toggles */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Eye className="w-4 h-4 text-primary" />תצוגה ופרטיות</h3>
                {([
                  { key: 'showReadReceipts', label: 'הצג קריאת הודעות', icon: Eye },
                  { key: 'showLinkPreviews', label: 'תצוגה מקדימה של קישורים', icon: ChevronRight },
                  { key: 'autoTranslate', label: 'תרגום אוטומטי לעברית', icon: MessageSquare },
                ] as { key: keyof UserSettings; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <button
                      onClick={() => toggle(key)}
                      className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", settings[key] ? "bg-primary" : "bg-muted-foreground/30")}
                    >
                      <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all", settings[key] ? "right-1" : "left-1")} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Font size */}
              <div>
                <h3 className="text-sm font-semibold mb-2">גודל טקסט</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['sm', 'md', 'lg'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setOption('fontSize', size)}
                      className={cn(
                        "py-2 rounded-xl text-sm border-2 transition",
                        settings.fontSize === size ? "border-primary bg-primary/10 font-semibold" : "border-border/30 hover:border-primary/30"
                      )}
                    >
                      {size === 'sm' ? 'A קטן' : size === 'md' ? 'A בינוני' : 'A גדול'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bubble style */}
              <div>
                <h3 className="text-sm font-semibold mb-2">סגנון בועות</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'gradient', label: 'גרדיאנט' },
                    { id: 'flat', label: 'שטוח' },
                    { id: 'minimal', label: 'מינימל' },
                  ] as { id: UserSettings['bubbleStyle']; label: string }[]).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setOption('bubbleStyle', id)}
                      className={cn(
                        "py-2 rounded-xl text-sm border-2 transition",
                        settings.bubbleStyle === id ? "border-primary bg-primary/10 font-semibold" : "border-border/30 hover:border-primary/30"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export */}
              <div className="border-t border-border/20 pt-3">
                <button
                  onClick={() => {
                    const myMsgs = messages.filter(m => m.user_id === currentUser.id)
                    const text = myMsgs.map(m => `[${new Date(m.created_at).toLocaleString('he-IL')}] ${m.content}`).join('\n')
                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                    a.download = `chat-${currentUser.name}-${new Date().toISOString().slice(0,10)}.txt`; a.click()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-muted/40 hover:bg-muted/60 rounded-xl text-sm transition"
                >
                  <Download className="w-4 h-4" />
                  ייצא את ההודעות שלי
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Keyword alert checker hook ────────────────────────────────────────────
export function useKeywordAlerts(userId: string, soundEnabled: boolean) {
  const [alerts, setAlerts] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('user_keyword_alerts').select('keyword').eq('user_id', userId).eq('is_active', true)
      if (data) setAlerts(data.map(k => k.keyword.toLowerCase()))
    }
    load()
  }, [userId])

  const check = useCallback(async (content: string, senderId: string) => {
    if (senderId === userId) return // don't alert on own messages
    const lower = content.toLowerCase()
    const hit = alerts.find(kw => lower.includes(kw))
    if (!hit) return

    // Increment triggered count
    supabase.from('user_keyword_alerts')
      .update({ triggered_count: supabase.rpc as never })
      .eq('user_id', userId).eq('keyword', hit)

    if (soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = 880; g.gain.value = 0.1
        o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); o.stop(ctx.currentTime + 0.3)
      } catch {}
    }
    return hit
  }, [alerts, userId, soundEnabled])

  return { check, keywords: alerts }
}

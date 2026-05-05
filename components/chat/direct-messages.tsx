"use client"

import { useState, useEffect, useRef } from 'react'
import { Send, X, MessageCircle, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ChatUser } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'
import { cn } from '@/lib/utils'

interface DM {
  id: string
  from_user_id: string
  to_user_id: string
  content: string
  created_at: string
  read: boolean
  from_user?: ChatUser
  to_user?: ChatUser
}

interface DirectMessagesProps {
  currentUser: ChatUser
  targetUser: ChatUser
  onClose: () => void
}

function getInitials(name: string) { return name.charAt(0).toUpperCase() }

const LS_KEY = (a: string, b: string) => `dms_${[a, b].sort().join('_')}`

export function DirectMessages({ currentUser, targetUser, onClose }: DirectMessagesProps) {
  const [messages, setMessages] = useState<DM[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [useDB, setUseDB] = useState(false) // tracks if Supabase DM table exists
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const key = LS_KEY(currentUser.id, targetUser.id)

    const loadFromLS = () => {
      try {
        setMessages(JSON.parse(localStorage.getItem(key) || '[]'))
      } catch {
        setMessages([])
      }
      setLoading(false)
    }

    // Try Supabase first
    const tryDB = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${targetUser.id}),and(from_user_id.eq.${targetUser.id},to_user_id.eq.${currentUser.id})`)
        .order('created_at')
        .limit(100)

      if (!error && data) {
        setUseDB(true)
        setMessages(data as DM[])
        setLoading(false)

        // Mark unread messages as read (messages sent to currentUser from targetUser)
        const unreadIds = (data as DM[])
          .filter(m => m.to_user_id === currentUser.id && m.from_user_id === targetUser.id && !m.read)
          .map(m => m.id)
        if (unreadIds.length > 0) {
          supabase
            .from('direct_messages')
            .update({ read: true })
            .in('id', unreadIds)
            .then(() => {
              setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true } : m))
            })
        }

        // Subscribe to realtime
        const ch = supabase
          .channel(`dms-${key}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `to_user_id=eq.${currentUser.id}`,
          }, (payload) => {
            const newMsg = payload.new as DM
            if (newMsg.from_user_id === targetUser.id) {
              setMessages(prev => [...prev, newMsg])
              // Mark newly received message as read immediately (window is open)
              supabase
                .from('direct_messages')
                .update({ read: true })
                .eq('id', newMsg.id)
                .then(() => {})
            }
          })
          .subscribe()
        channelRef.current = ch
      } else {
        loadFromLS()
      }
    }
    tryDB()

    return () => {
      channelRef.current && supabase.removeChannel(channelRef.current)
    }
  }, [currentUser.id, targetUser.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    const newMsg: DM = {
      id: Date.now().toString(),
      from_user_id: currentUser.id,
      to_user_id: targetUser.id,
      content,
      created_at: new Date().toISOString(),
      read: false,
      from_user: currentUser,
      to_user: targetUser,
    }

    // Optimistic update
    setMessages(prev => [...prev, newMsg])

    if (useDB) {
      // Insert into Supabase
      const { error } = await supabase.from('direct_messages').insert({
        from_user_id: currentUser.id,
        to_user_id: targetUser.id,
        content,
        read: false,
      })
      if (error) {
        console.warn('DM insert failed, falling back to localStorage:', error.message)
        setUseDB(false)
      }
    } else {
      // localStorage fallback
      const key = LS_KEY(currentUser.id, targetUser.id)
      const prev = [...messages, newMsg]
      localStorage.setItem(key, JSON.stringify(prev.slice(-100)))
    }

    setSending(false)
  }

  const unreadCount = messages.filter(m => m.to_user_id === currentUser.id && !m.read).length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-full max-w-md h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow"
            style={{ backgroundColor: targetUser.avatar_color }}
          >
            {targetUser.avatar_url ? (
              <img src={targetUser.avatar_url} alt={targetUser.name} className="w-full h-full rounded-full object-cover" />
            ) : getInitials(targetUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{targetUser.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {targetUser.is_online ? '🟢 מחובר' : '⚫ לא מחובר'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium">אין הודעות עדיין</p>
                <p className="text-xs mt-0.5">שלח הודעה ל{targetUser.name}</p>
              </div>
            </div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.from_user_id === currentUser.id
              return (
                <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                  {!isOwn && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1"
                      style={{ backgroundColor: targetUser.avatar_color }}
                    >
                      {getInitials(targetUser.name)}
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    isOwn
                      ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  )}>
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={cn("text-[10px] mt-0.5", isOwn ? "text-white/60 text-left" : "text-muted-foreground text-right")}>
                      {formatTimeAgo(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2 bg-muted/40 rounded-2xl px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={`הודעה ל${targetUser.name}...`}
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              dir="auto"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-1">
            💡 הודעות ישירות — גלויות רק לך ול{targetUser.name}
          </p>
        </div>
      </div>
    </div>
  )
}

// DM button to show in user profiles / hover cards
interface DMButtonProps {
  targetUser: ChatUser
  currentUser: ChatUser
}

export function DMButton({ targetUser, currentUser }: DMButtonProps) {
  const [open, setOpen] = useState(false)
  if (targetUser.id === currentUser.id) return null
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-lg px-3 py-1.5 hover:bg-primary/20 transition font-medium"
      >
        <MessageCircle className="w-3.5 h-3.5" /> הודעה ישירה
      </button>
      {open && (
        <DirectMessages
          currentUser={currentUser}
          targetUser={targetUser}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

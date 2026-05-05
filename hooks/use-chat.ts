"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatUser, ChatMessage, UserType, SystemMessage, TypingUser, MessageReaction } from '@/lib/chat-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient()

export function useChat(currentUser: ChatUser | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const lastReadTimestampRef = useRef<string | null>(null)
  const [bannedWords, setBannedWords] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('banned_words')
      if (stored) return stored.split(',').map(w => w.trim()).filter(Boolean)
    }
    return []
  })
  const isPageVisibleRef = useRef(true)
  const channelRef = useRef<RealtimeChannel | null>(null)        // messages + reactions + system (consolidated)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null) // online users
  const typingChannelRef = useRef<RealtimeChannel | null>(null)   // typing indicators
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch initial messages with reactions
  const fetchMessages = useCallback(async () => {
    try {
      // ── Parallel fetch: messages + reactions in one round-trip pair ────────
      // reactions fetched by recent timestamp (last 7d) so we don't need message IDs first
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [
        { data: messagesData, error: messagesError },
        { data: reactionsData },
      ] = await Promise.all([
        supabase
          .from('chat_messages')
          .select(`
            id, user_id, content, created_at, updated_at, is_pinned,
            upvotes_count, has_gif, gif_url, mentions,
            user:chat_users(id, name, avatar_color, user_type, is_online, created_at, level)
          `)
          // avatar_url intentionally omitted — stored as base64 in DB (can be 200KB+)
          .order('created_at', { ascending: true })
          .limit(100),
        supabase
          .from('message_reactions')
          .select(`id, message_id, user_id, emoji, created_at, user:chat_users(id, name, avatar_color)`)
          .gte('created_at', since7d)
          .limit(500),
      ])

      if (messagesError) throw messagesError

      if (messagesData && messagesData.length > 0) {
        // Build a Set of message IDs for O(1) lookup when joining
        const msgIdSet = new Set(messagesData.map(m => m.id))
        const relevantReactions = reactionsData?.filter(r => msgIdSet.has(r.message_id)) ?? []

        const messagesWithReactions = messagesData.map(msg => ({
          ...msg,
          reactions: relevantReactions.filter(r => r.message_id === msg.id),
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages(messagesWithReactions as any as ChatMessage[])
      } else {
        setMessages([])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('שגיאה בטעינת ההודעות')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch system messages
  const fetchSystemMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_messages')
        .select(`id, user_id, message_type, content, created_at, user:chat_users(id, name, avatar_color, user_type)`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSystemMessages((data || []) as any as SystemMessage[])
    } catch (err) {
      console.error('Error fetching system messages:', err)
    }
  }, [])

  // Fetch online users — exclude avatar_url (potentially large base64) for speed
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_users')
        .select('id, name, avatar_color, user_type, is_online, last_seen, created_at, level, points')
        .eq('is_online', true)
        .limit(100)
        .order('last_seen', { ascending: false })

      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOnlineUsers((data || []) as any as ChatUser[])
    } catch (err) {
      console.error('Error fetching online users:', err)
    }
  }, [])

  // Slash commands
  const processSlashCommand = (content: string): string => {
    const jokes = [
      'למה לא אמר הפיל לחבר שלו? כי לא רצה להשמיע קול גדול! 🐘',
      'מה אמר המחשב לאמא שלו? "אמא, ה-RAM שלי לא מספיק!"',
      'למה הגיטריסט הצטרף לצ\'אט? כי הוא ידע לנגן על העצבים! 🎸',
      'מה אמר הבנק לאיש העני? "סורי, אין לנו חשבון לך!" 💸',
    ]
    const tips = [
      '💡 טיפ: תמיד השווה מחירים ב-3 מקומות לפחות לפני שאתה קונה!',
      '💡 טיפ: הגדר Google Alerts על שם המוצר שאתה מחפש לקבל התראות על מחירים!',
      '💡 טיפ: חברות מחדשות לרוב נותנות הנחות משמעותיות - שווה לבדוק!',
      '💡 טיפ: בדוק תמיד את ה"מחיר לחודש" ולא רק את המחיר הראשון!',
    ]

    const commands: Record<string, () => string> = {
      '/shrug':   () => '¯\\_(ツ)_/¯',
      '/flip':    () => '(╯°□°）╯︵ ┻━┻',
      '/unflip':  () => '┬─┬ノ( º _ ºノ)',
      '/lenny':   () => '( ͡° ͜ʖ ͡°)',
      '/bear':    () => 'ʕ•ᴥ•ʔ',
      '/wave':    () => '( ﾟДﾟ)ﾉ',
      '/hi':      () => '👋 שלום לכולם!',
      '/deal':    () => '🔥 מצאתי עסקה מדהימה!',
      '/thanks':  () => '🙏 תודה רבה לכולם!',
      '/joke':    () => jokes[Math.floor(Math.random() * jokes.length)],
      '/tip':     () => tips[Math.floor(Math.random() * tips.length)],
      '/aitip':   () => {
        const aiTips = [
          '🤖 AI טיפ: בחן מחיר "לחודש" ולא מחיר "לשנה" — חברות רבות מציגות מחיר שנתי מחולק שנראה נמוך יותר!',
          '🤖 AI טיפ: שאל תמיד על "חבילת נאמנות" — מנויים ותיקים מקבלים לעיתים הנחות שלא מפורסמות',
          '🤖 AI טיפ: בדוק כיסוי רשת בעיר שלך BEFORE שעוברים — לא כל הספקים שווים בכל מקום!',
          '🤖 AI טיפ: העברת מספר (number portability) חינמית ולוקחת עד יום עסקים אחד — אל תפחד לנייד!',
          '🤖 AI טיפ: הצטרפות לאינטרנט ביתי + מובייל מאותה חברה = הנחת "חבילה" של 10-30% בדרך כלל',
          '🤖 AI טיפ: בחן תמיד: כמה GB בחו"ל? חברות רבות חוסכות בחבילה הזו בחינם!',
        ]
        return aiTips[Math.floor(Math.random() * aiTips.length)]
      },
      '/help':    () => '💡 פקודות: /shrug /flip /lenny /bear /wave /hi /deal /thanks /joke /tip /aitip /ai [שאלה] /poll שאלה|אפשרות1|אפשרות2',
    }
    const trimmed = content.trim()

    // /ai [custom question] — real AI query
    if (trimmed.toLowerCase().startsWith('/ai ')) {
      const question = trimmed.slice(4).trim()
      if (question) {
        // Send placeholder immediately, then replace with real answer
        setTimeout(async () => {
          try {
            const res = await fetch('/api/ai-tip', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question }),
            })
            const data = await res.json() as { answer: string }
            if (data.answer) {
              sendMessage(`🤖 AI: ${data.answer}`)
            }
          } catch {
            sendMessage('🤖 לא הצלחתי להתחבר ל-AI. נסה שוב מאוחר יותר.')
          }
        }, 100)
        return `🤖 שואל את ה-AI: "${question}"... ⏳`
      }
    }

    return commands[trimmed.toLowerCase()]?.() || content
  }

  // Handle /poll command: /poll שאלה | אפשרות1 | אפשרות2
  const processPollCommand = (content: string): string | null => {
    const trimmed = content.trim()
    if (!trimmed.toLowerCase().startsWith('/poll ')) return null
    const rest = trimmed.slice(6).trim()
    const parts = rest.split('|').map(p => p.trim()).filter(Boolean)
    if (parts.length < 2) return null
    const [question, ...options] = parts
    // Return as a formatted poll creation string
    return `[poll:${question}::${options.join('::')}]`
  }

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentUser || !content.trim()) return
    if (currentUser.user_type === 'blocked') {
      setError('החשבון שלך חסום. צור קשר עם המנהל.')
      return
    }

    // Handle /poll command
    const pollResult = processPollCommand(content.trim())
    if (pollResult !== null) {
      // Create a quick poll via community hook — not accessible here, so just send as announcement
      // Uses module-level supabase singleton — no duplicate createClient()
      const pollParts = pollResult.slice(6, -1).split('::')
      const question = pollParts[0]
      const options = pollParts.slice(1)
      if (question && options.length >= 2) {
        // Create a poll in the polls table
        const { data: poll } = await supabase.from('polls').insert({
          question, created_by: currentUser.id, is_active: true
        }).select().single()
        if (poll) {
          await Promise.all(options.map(opt => supabase.from('poll_options').insert({ poll_id: poll.id, option_text: opt, votes_count: 0 })))
          // Announce in chat
          await supabase.from('chat_messages').insert({ user_id: currentUser.id, content: `📊 סקר חדש: "${question}" — הצביעו בסרגל הצדדי!` })
        }
      }
      stopTyping()
      return
    }

    // Process slash commands
    const processedContent = processSlashCommand(content.trim())

    // Skip banned-words check for voice/video messages (content is a URL token, not user text)
    const isMediaMessage = processedContent.startsWith('[voice:') || processedContent.startsWith('[video:')

    // Check banned words (reload from localStorage each call to stay fresh)
    if (!isMediaMessage) {
      const currentBanned = (() => {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('banned_words')
          return stored ? stored.split(',').map(w => w.trim()).filter(Boolean) : []
        }
        return bannedWords
      })()
      const lowerContent = processedContent.toLowerCase()
      const foundBanned = currentBanned.find(w => w && lowerContent.includes(w.toLowerCase()))
      if (foundBanned) {
        setError('ההודעה מכילה מילה אסורה ולא ניתן לשלוח אותה.')
        setTimeout(() => setError(null), 3000)
        return
      }
    }

    // ── Client-side pre-checks (fast, before hitting DB) ──────────────────
    if (processedContent.length > 2000) {
      setError('ההודעה ארוכה מדי (מקסימום 2000 תווים)')
      setTimeout(() => setError(null), 3000)
      return
    }

    // Client-side duplicate guard (same message within 5s) — skip for voice/video
    const lastMsg = messages[messages.length - 1]
    if (!isMediaMessage && lastMsg?.user_id === currentUser.id && lastMsg?.content === processedContent) {
      setError('כבר שלחת הודעה זהה לאחרונה')
      setTimeout(() => setError(null), 3000)
      return
    }

    // ── OPTIMISTIC RENDER: add to UI immediately (0ms — no waiting for DB) ──
    const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const optimisticMsg = {
      id: tempId,
      user_id: currentUser.id,
      content: processedContent,
      created_at: new Date().toISOString(),
      updated_at: undefined,
      is_pinned: false,
      upvotes_count: 0,
      has_gif: false,
      gif_url: null,
      mentions: [],
      user: currentUser,
      reactions: [],
    } as unknown as ChatMessage
    setMessages(prev => [...prev, optimisticMsg])
    stopTyping()

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({ user_id: currentUser.id, content: processedContent })

      if (error) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== tempId))
        // Map error to Hebrew
        const msg = error.message || ''
        const spamMessages: Record<string, string> = {
          rate_limit_exceeded: '⏱️ שולח הודעות מהר מדי — המתן רגע',
          duplicate_message:   '🔁 שלחת הודעה זהה לאחרונה',
          repetitive_message:  '🔁 הודעה דומה מדי לאחרונה',
          too_many_urls:       '🚫 יותר מדי קישורים בהודעה אחת (מקסימום 3)',
          url_rate_limit:      '🚫 יותר מדי קישורים — המתן לפני שליחת קישור נוסף',
          flood_detected:      '🛑 נזוהו שליחות מהירות מדי — המתן כמה שניות',
          new_account_limit:   '🆕 חשבון חדש — ניתן לשלוח עד 3 הודעות בתחילה',
          blocked_user:        '🚫 החשבון שלך חסום. צור קשר עם המנהל',
          content_too_long:    '📏 ההודעה ארוכה מדי (מקסימום 2000 תווים)',
          content_too_short:   '📏 ההודעה קצרה מדי',
        }
        const match = Object.keys(spamMessages).find(k => msg.includes(k))
        setError(match ? spamMessages[match] : 'שגיאה בשליחת ההודעה')
        setTimeout(() => setError(null), 4000)
        return
      }

      // ── BROADCAST: fast delivery to other users (~20ms vs ~600ms via postgres_changes) ──
      channelRef.current?.send({
        type: 'broadcast',
        event: 'fast_msg',
        payload: { ...optimisticMsg },
      })
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      console.error('Error sending message:', err)
      setError('שגיאה בשליחת ההודעה — נסה שוב')
      setTimeout(() => setError(null), 3000)
    }
  }, [currentUser, bannedWords, messages])

  // Edit message (own messages only)
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return
    // Try with updated_at first; fall back to content-only if column not yet migrated
    const { error } = await supabase
      .from('chat_messages')
      .update({ content: newContent.trim(), updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', currentUser?.id ?? '')
    if (error?.code === '42703') {
      await supabase
        .from('chat_messages')
        .update({ content: newContent.trim() })
        .eq('id', messageId)
        .eq('user_id', currentUser?.id ?? '')
    }
  }, [currentUser])

  // Delete message (admin only)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser || currentUser.user_type !== 'admin') return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error
      setMessages(prev => prev.filter(m => m.id !== messageId))
    } catch (err) {
      console.error('Error deleting message:', err)
    }
  }, [currentUser])

  // Pin/Unpin message (admin only)
  const togglePinMessage = useCallback(async (messageId: string, isPinned: boolean) => {
    if (!currentUser || currentUser.user_type !== 'admin') return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_pinned: !isPinned })
        .eq('id', messageId)

      if (error) throw error
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_pinned: !isPinned } : m
      ))
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }, [currentUser])

  // Add reaction to message — optimistic toggle (no SELECT round-trip first)
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return

    try {
      // Check local state first (zero DB queries for the read)
      const currentMsg = messages.find(m => m.id === messageId)
      const existingReaction = currentMsg?.reactions?.find(
        r => r.user_id === currentUser.id && r.emoji === emoji
      )

      if (existingReaction) {
        // Remove reaction — optimistic update first
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== existingReaction.id) }
            : m
        ))
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id)
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: currentUser.id,
            emoji
          })
        // Realtime will push the new reaction back via postgres_changes
      }
    } catch (err) {
      console.error('Error toggling reaction:', err)
    }
  }, [currentUser, messages])

  // ── Typing indicators via Broadcast (~20ms) instead of DB (~200ms) ────────
  const startTyping = useCallback(() => {
    if (!currentUser) return
    // Broadcast is P2P through Supabase WebSocket — no DB round-trip
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, name: currentUser.name, avatarColor: currentUser.avatar_color, isTyping: true },
    })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 3000)
  }, [currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopTyping = useCallback(() => {
    if (!currentUser) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, name: currentUser.name, avatarColor: currentUser.avatar_color, isTyping: false },
    })
  }, [currentUser])

  // Fetch typing users
  const fetchTypingUsers = useCallback(async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('typing_users')
        .select(`user_id, started_at, user:chat_users(id, name, avatar_color)`)
        .neq('user_id', currentUser.id)

      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTypingUsers((data || []) as any as TypingUser[])
    } catch (err) {
      console.error('Error fetching typing users:', err)
    }
  }, [currentUser])

  // Update user online status
  const setUserOnline = useCallback(async (userId: string, isOnline: boolean) => {
    try {
      // Use RETURNING to get name in the same round-trip — eliminates the extra SELECT
      const { data: updated } = await supabase
        .from('chat_users')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId)
        .select('name')
        .single()

      // Add system message for join/leave (only on joining, skip leave to reduce noise)
      if (isOnline && updated?.name) {
        await supabase
          .from('system_messages')
          .insert({
            user_id: userId,
            message_type: 'join',
            content: `${updated.name} הצטרף/ה לצ׳אט`
          })
      }
    } catch (err) {
      console.error('Error updating online status:', err)
    }
  }, [])

  // Send announcement (admin only)
  const sendAnnouncement = useCallback(async (content: string) => {
    if (!currentUser || currentUser.user_type !== 'admin') return

    try {
      await supabase
        .from('system_messages')
        .insert({
          user_id: currentUser.id,
          message_type: 'announcement',
          content
        })
    } catch (err) {
      console.error('Error sending announcement:', err)
    }
  }, [currentUser])

  // Set up realtime subscriptions
  useEffect(() => {
    if (!currentUser) return

    // Mark user as online
    setUserOnline(currentUser.id, true)

    // Subscribe to new messages — use payload directly + user from local state
    // to avoid an extra DB round-trip per message
    // ── Consolidated channel: messages + reactions + system (3 → 1 WebSocket) ──
    channelRef.current = supabase
      .channel('chat_main_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMsg = payload.new as Record<string, unknown>

          // Try to resolve user from existing messages/online users (zero extra queries)
          setMessages(prev => {
            // ── Deduplication ─────────────────────────────────────────────
            // 1. Already in state via broadcast fast_msg → skip
            if (prev.some(m => m.id === newMsg.id)) return prev
            // 2. Replace optimistic temp message from same user+content (sender's own message)
            const isOwnOptimistic = newMsg.user_id === currentUser?.id
            const withoutTemp = isOwnOptimistic
              ? prev.filter(m => {
                  if (!m.id.startsWith('opt-')) return true
                  // Remove temp msg with same content sent within last 15s
                  return !(m.content === newMsg.content &&
                    Math.abs(new Date(newMsg.created_at as string).getTime() - new Date(m.created_at).getTime()) < 15000)
                })
              : prev
            const existingUser = prev.find(m => m.user_id === newMsg.user_id)?.user
              || onlineUsers.find(u => u.id === newMsg.user_id) as unknown as ChatUser | undefined
            const composed = { ...newMsg, user: existingUser || null, reactions: [] } as unknown as ChatMessage
            return [...withoutTemp, composed]
          })

          // Background user fetch only if missing
          const userAlreadyKnown = messages.some(m => m.user_id === newMsg.user_id && m.user)
            || onlineUsers.some(u => u.id === newMsg.user_id)
          if (!userAlreadyKnown) {
            const { data: userData } = await supabase
              .from('chat_users')
              // avatar_url intentionally excluded — potentially 200KB+ base64
              .select('id, name, avatar_color, user_type, is_online, created_at, level')
              .eq('id', newMsg.user_id as string)
              .single()
            if (userData) {
              setMessages(prev => prev.map(m =>
                m.id === newMsg.id ? { ...m, user: userData as unknown as ChatUser } : m
              ))
            }
          }

          if (!isPageVisibleRef.current && newMsg.user_id !== currentUser?.id) {
            setUnreadCount(c => c + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          setMessages(prev => prev.map(m => 
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ))
        }
      )
      // ── System messages — merged into main channel (saves 1 WebSocket) ──
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_messages' },
        async (payload) => {
          const { data } = await supabase
            .from('system_messages')
            .select('id, user_id, message_type, content, created_at, user:chat_users(id, name, avatar_color, user_type)')
            .eq('id', payload.new.id)
            .single()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (data) setSystemMessages(prev => [data as any as SystemMessage, ...prev].slice(0, 50))
        }
      )
      // ── Reactions — merged into main channel (saves 1 more WebSocket) ──
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const { data } = await supabase
            .from('message_reactions')
            .select('id, message_id, user_id, emoji, created_at, user:chat_users(id, name, avatar_color)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages(prev => prev.map(m =>
              m.id === data.message_id
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? { ...m, reactions: [...(m.reactions || []).filter(r => r.id !== data.id), data as any as MessageReaction] }
                : m
            ))
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => {
          setMessages(prev => prev.map(m =>
            m.reactions?.some(r => r.id === payload.old.id)
              ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== payload.old.id) }
              : m
          ))
        }
      )
      // ── Broadcast: fast message delivery (~20ms, no DB round-trip) ──────
      .on('broadcast', { event: 'fast_msg' }, (event) => {
        const msg = event.payload as ChatMessage
        // Skip own messages (sender already added optimistically)
        if (msg.user_id === currentUser?.id) return
        setMessages(prev => {
          // Skip if already received via postgres_changes
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      // ── Broadcast: typing indicators (~20ms, no DB round-trip) ──────────
      .on('broadcast', { event: 'typing' }, (event) => {
        const { userId, name, avatarColor, isTyping } = event.payload as {
          userId: string; name: string; avatarColor: string; isTyping: boolean
        }
        if (userId === currentUser?.id) return // ignore own typing
        setTypingUsers(prev => {
          if (isTyping) {
            if (prev.some(u => u.user_id === userId)) return prev
            return [...prev, {
              user_id: userId,
              started_at: new Date().toISOString(),
              user: { id: userId, name, avatar_color: avatarColor } as ChatUser,
            }]
          } else {
            return prev.filter(u => u.user_id !== userId)
          }
        })
      })
      .subscribe()

    // Subscribe to user changes — debounce refetch to avoid stampede
    let onlineUsersDebounce: ReturnType<typeof setTimeout> | null = null
    presenceChannelRef.current = supabase
      .channel('chat_users_channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_users', filter: 'is_online=eq.true' },
        () => {
          if (onlineUsersDebounce) clearTimeout(onlineUsersDebounce)
          onlineUsersDebounce = setTimeout(() => fetchOnlineUsers(), 500)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_users', filter: 'is_online=eq.false' },
        (payload) => {
          // Immediately remove user from online list without DB refetch
          setOnlineUsers(prev => prev.filter(u => u.id !== payload.new.id))
        }
      )
      .subscribe()

    // Typing is now handled via broadcast (fast_msg channel above) — no separate DB channel needed
    // typingChannelRef kept for cleanup compatibility but unused
    typingChannelRef.current = null

    // Fetch initial data (typing starts empty — populated via broadcast)
    fetchMessages()
    fetchOnlineUsers()
    fetchSystemMessages()

    // Cleanup on unmount
    return () => {
      if (currentUser) {
        setUserOnline(currentUser.id, false)
        stopTyping()
      }
      // 3 channels now (was 5) — messages+reactions+system, users, typing
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current)
    }
  }, [currentUser, fetchMessages, fetchOnlineUsers, fetchSystemMessages, fetchTypingUsers, setUserOnline, stopTyping])

  // Handle page visibility change
  useEffect(() => {
    if (!currentUser) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setUserOnline(currentUser.id, true)
      } else {
        setUserOnline(currentUser.id, false)
        stopTyping()
      }
    }

    const handleBeforeUnload = () => {
      setUserOnline(currentUser.id, false)
      stopTyping()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [currentUser, setUserOnline, stopTyping])

  // Get pinned messages — memoized so it doesn't re-filter on unrelated state changes
  const pinnedMessages = useMemo(() => messages.filter(m => m.is_pinned), [messages])

  // Upvote/helpful a message
  const upvoteMessage = useCallback(async (messageId: string) => {
    if (!currentUser) return
    // Module-level supabase singleton — no duplicate createClient()
    // Check if already upvoted (stored locally)
    const upvotedKey = `upvoted_${currentUser.id}`
    const upvoted: string[] = JSON.parse(localStorage.getItem(upvotedKey) || '[]')
    const already = upvoted.includes(messageId)

    // Optimistically toggle local state
    if (already) {
      localStorage.setItem(upvotedKey, JSON.stringify(upvoted.filter(id => id !== messageId)))
    } else {
      localStorage.setItem(upvotedKey, JSON.stringify([...upvoted, messageId]))
    }

    // Update upvotes_count in DB — try RPC first, fallback to raw select+update
    if (!already) {
      try {
        const { error: rpcErr } = await supabase.rpc('increment_upvotes', { message_id: messageId })
        if (rpcErr) {
          // RPC might not exist — get current count and increment
          const { data, error: selErr } = await supabase.from('chat_messages').select('upvotes_count').eq('id', messageId).single()
          // Only update if column exists (selErr?.code '42703' means column missing — skip silently)
          if (!selErr && data) {
            await supabase.from('chat_messages').update({ upvotes_count: (data.upvotes_count || 0) + 1 }).eq('id', messageId)
          }
        }
      } catch {
        // Non-critical — upvote is tracked locally anyway
      }
    }
  }, [currentUser])

  // Mark all messages as read — updates Supabase last_seen and clears unread count
  const markMessagesRead = useCallback(async () => {
    setUnreadCount(0)
    if (!currentUser) return
    try {
      await supabase
        .from('chat_users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', currentUser.id)
    } catch {
      // non-critical, ignore
    }
  }, [currentUser])

  // Track page visibility for unread counting
  useEffect(() => {
    const onVis = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible'
      if (isPageVisibleRef.current) markMessagesRead()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [markMessagesRead])

  // Quick ban user (admin only)
  const banUser = useCallback(async (userId: string, userName: string) => {
    if (currentUser?.user_type !== 'admin') return
    // Module-level supabase singleton — no duplicate createClient()
    const { error } = await supabase
      .from('chat_users')
      .update({ user_type: 'blocked' })
      .eq('id', userId)
    if (!error) {
      // Post announcement
      await supabase.from('system_messages').insert({
        message_type: 'announcement',
        content: `🚫 ${userName} נחסם על ידי המנהל`,
        user_id: currentUser.id
      }).select()
    }
  }, [currentUser])

  return {
    messages,
    pinnedMessages,
    systemMessages,
    onlineUsers,
    typingUsers,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
    addReaction,
    startTyping,
    stopTyping,
    sendAnnouncement,
    banUser,
    upvoteMessage,
    markMessagesRead,
    unreadCount,
    onlineCount: onlineUsers.length
  }
}

// Hook for user registration/login
function enrichUser<T extends { points?: number; level?: number; messages_count?: number }>(u: T): T & { level: number; messages_count: number } {
  const pts = u.points ?? 0
  const lvl = u.level != null ? u.level : (pts >= 3000 ? 10 : pts >= 2000 ? 9 : pts >= 1500 ? 8 : pts >= 1000 ? 7 : pts >= 700 ? 6 : pts >= 450 ? 5 : pts >= 250 ? 4 : pts >= 100 ? 3 : pts >= 30 ? 2 : 1)
  return { ...u, level: lvl, messages_count: u.messages_count ?? 0 }
}
export function useChatUser() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check for existing user in localStorage
  useEffect(() => {
    const savedUserId = localStorage.getItem('chat_user_id')
    if (savedUserId) {
      fetchUser(savedUserId)
    }
  }, [])

  const fetchUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_users')
        // avatar_url intentionally excluded — stored as base64 (can be 200KB+)
        .select('id, name, email, avatar_color, user_type, is_online, last_seen, level, points, weekly_points, is_user_of_week, messages_count, helpful_count, created_at')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) {
        setCurrentUser(data)
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      localStorage.removeItem('chat_user_id')
    }
  }

  const registerUser = async (
    name: string,
    email: string | null,
    userType: UserType,
    avatarColor: string
  ): Promise<ChatUser | null> => {
    setIsLoading(true)
    try {
      const normalizedEmail = email ? email.toLowerCase().trim() : null

      // For users with an email, check if they already exist (returning user)
      if (normalizedEmail) {
        const { data: existing } = await supabase
          .from('chat_users')
          .select('id, name, email, avatar_color, user_type, is_online, last_seen, level, points, weekly_points, is_user_of_week, messages_count, helpful_count, created_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (existing) {
          const { data: updated } = await supabase
            .from('chat_users')
            .update({
              name: name.trim() || existing.name,
              is_online: true,
              last_seen: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single()

          const returnedUser = updated || existing
          localStorage.setItem('chat_user_id', returnedUser.id)
          setCurrentUser({ ...returnedUser, is_online: true })
          return { ...returnedUser, is_online: true }
        }
      }

      // New user — insert
      const { data, error } = await supabase
        .from('chat_users')
        .insert({
          name,
          email: normalizedEmail,
          user_type: userType,
          avatar_color: avatarColor,
          is_online: true
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        localStorage.setItem('chat_user_id', data.id)
        setCurrentUser(data)

        // Notify admin of new registration (fire-and-forget)
        if (userType !== 'guest') {
          fetch('/api/admin/notify-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, userType }),
          }).catch(() => {})
        }

        return data
      }
      return null
    } catch (err) {
      console.error('Error registering user:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (currentUser) {
      await supabase
        .from('chat_users')
        .update({ is_online: false })
        .eq('id', currentUser.id)
    }
    localStorage.removeItem('chat_user_id')
    setCurrentUser(null)
  }

  return {
    currentUser,
    isLoading,
    registerUser,
    logout
  }
}

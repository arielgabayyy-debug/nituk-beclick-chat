"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
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
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const systemChannelRef = useRef<RealtimeChannel | null>(null)
  const reactionsChannelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch initial messages with reactions
  const fetchMessages = useCallback(async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id, user_id, content, created_at, updated_at, is_pinned,
          upvotes_count, has_gif, gif_url, mentions,
          user:chat_users(id, name, avatar_url, avatar_color, user_type, is_online, created_at, level)
        `)
        .order('created_at', { ascending: true })
        .limit(100)

      if (messagesError) throw messagesError

      // Fetch reactions for all messages
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map(m => m.id)
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select(`id, message_id, user_id, emoji, created_at, user:chat_users(id, name, avatar_color)`)
          .in('message_id', messageIds)

        const messagesWithReactions = messagesData.map(msg => ({
          ...msg,
          reactions: reactionsData?.filter(r => r.message_id === msg.id) || []
        }))

        setMessages(messagesWithReactions)
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
      setSystemMessages(data || [])
    } catch (err) {
      console.error('Error fetching system messages:', err)
    }
  }, [])

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_users')
        .select('id, name, avatar_url, avatar_color, user_type, is_online, last_seen, created_at, level, points')
        .eq('is_online', true)

      if (error) throw error
      setOnlineUsers(data || [])
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
      const supabase = createClient()
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

    // Check banned words (reload from localStorage each call to stay fresh)
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

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: currentUser.id,
          content: processedContent
        })

      if (error) throw error

      // Stop typing when sending
      stopTyping()
    } catch (err) {
      console.error('Error sending message:', err)
      setError('שגיאה בשליחת ההודעה')
    }
  }, [currentUser, bannedWords])

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

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return

    try {
      // Check if already reacted with this emoji
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUser.id)
        .eq('emoji', emoji)
        .single()

      if (existing) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id)
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: currentUser.id,
            emoji
          })
      }
    } catch (err) {
      console.error('Error toggling reaction:', err)
    }
  }, [currentUser])

  // Typing indicators
  const startTyping = useCallback(async () => {
    if (!currentUser) return

    try {
      await supabase
        .from('typing_users')
        .upsert({
          user_id: currentUser.id,
          started_at: new Date().toISOString()
        })

      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 3000)
    } catch (err) {
      console.error('Error starting typing:', err)
    }
  }, [currentUser])

  const stopTyping = useCallback(async () => {
    if (!currentUser) return

    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      await supabase
        .from('typing_users')
        .delete()
        .eq('user_id', currentUser.id)
    } catch (err) {
      console.error('Error stopping typing:', err)
    }
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
      setTypingUsers(data || [])
    } catch (err) {
      console.error('Error fetching typing users:', err)
    }
  }, [currentUser])

  // Update user online status
  const setUserOnline = useCallback(async (userId: string, isOnline: boolean) => {
    try {
      await supabase
        .from('chat_users')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId)

      // Add system message for join/leave
      if (isOnline) {
        const { data: userData } = await supabase
          .from('chat_users')
          .select('name')
          .eq('id', userId)
          .single()

        if (userData) {
          await supabase
            .from('system_messages')
            .insert({
              user_id: userId,
              message_type: isOnline ? 'join' : 'leave',
              content: isOnline ? `${userData.name} הצטרף/ה לצ׳אט` : `${userData.name} עזב/ה את הצ׳אט`
            })
        }
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

    // Subscribe to new messages
    channelRef.current = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select(`id, user_id, content, created_at, updated_at, is_pinned, upvotes_count, has_gif, gif_url, mentions, user:chat_users(id, name, avatar_url, avatar_color, user_type, is_online, created_at, level)`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => [...prev, { ...data, reactions: [] }])
            // Count as unread if page is hidden or not the sender
            if (!isPageVisibleRef.current && data.user_id !== currentUser?.id) {
              setUnreadCount(c => c + 1)
            }
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
      .subscribe()

    // Subscribe to user changes
    presenceChannelRef.current = supabase
      .channel('chat_users_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_users'
        },
        () => {
          fetchOnlineUsers()
        }
      )
      .subscribe()

    // Subscribe to typing changes
    typingChannelRef.current = supabase
      .channel('typing_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_users'
        },
        () => {
          fetchTypingUsers()
        }
      )
      .subscribe()

    // Subscribe to system messages
    systemChannelRef.current = supabase
      .channel('system_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_messages'
        },
        async (payload) => {
          const { data } = await supabase
            .from('system_messages')
            .select(`id, user_id, message_type, content, created_at, user:chat_users(id, name, avatar_color, user_type)`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setSystemMessages(prev => [data, ...prev])
          }
        }
      )
      .subscribe()

    // Subscribe to reactions — update local state instead of full refetch
    reactionsChannelRef.current = supabase
      .channel('reactions_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions'
        },
        async (payload) => {
          const { data } = await supabase
            .from('message_reactions')
            .select(`id, message_id, user_id, emoji, created_at, user:chat_users(id, name, avatar_color)`)
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages(prev => prev.map(m =>
              m.id === data.message_id
                ? { ...m, reactions: [...(m.reactions || []).filter(r => r.id !== data.id), data] }
                : m
            ))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          setMessages(prev => prev.map(m =>
            m.reactions?.some(r => r.id === payload.old.id)
              ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== payload.old.id) }
              : m
          ))
        }
      )
      .subscribe()

    // Fetch initial data
    fetchMessages()
    fetchOnlineUsers()
    fetchSystemMessages()
    fetchTypingUsers()

    // Cleanup on unmount
    return () => {
      if (currentUser) {
        setUserOnline(currentUser.id, false)
        stopTyping()
      }
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current)
      if (systemChannelRef.current) supabase.removeChannel(systemChannelRef.current)
      if (reactionsChannelRef.current) supabase.removeChannel(reactionsChannelRef.current)
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

  // Get pinned messages
  const pinnedMessages = messages.filter(m => m.is_pinned)

  // Upvote/helpful a message
  const upvoteMessage = useCallback(async (messageId: string) => {
    if (!currentUser) return
    const supabase = createClient()
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
    const supabase = createClient()
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
        .select('*')
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
          .select('*')
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

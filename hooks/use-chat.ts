"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatUser, ChatMessage, UserType, SystemMessage, TypingUser, MessageReaction } from '@/lib/chat-types'
import { ADMIN_PASSWORD } from '@/lib/chat-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient()

export function useChat(currentUser: ChatUser | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
          *,
          user:chat_users(*)
        `)
        .order('created_at', { ascending: true })
        .limit(100)

      if (messagesError) throw messagesError

      // Fetch reactions for all messages
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map(m => m.id)
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select(`*, user:chat_users(*)`)
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
        .select(`*, user:chat_users(*)`)
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
        .select('*')
        .eq('is_online', true)

      if (error) throw error
      setOnlineUsers(data || [])
    } catch (err) {
      console.error('Error fetching online users:', err)
    }
  }, [])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentUser || !content.trim()) return
    if (currentUser.user_type === 'blocked') {
      setError('החשבון שלך חסום. צור קשר עם המנהל.')
      return
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: currentUser.id,
          content: content.trim()
        })

      if (error) throw error

      // Stop typing when sending
      stopTyping()
    } catch (err) {
      console.error('Error sending message:', err)
      setError('שגיאה בשליחת ההודעה')
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
        .select(`*, user:chat_users(*)`)
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
            .select(`*, user:chat_users(*)`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => [...prev, { ...data, reactions: [] }])
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
            .select(`*, user:chat_users(*)`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setSystemMessages(prev => [data, ...prev])
          }
        }
      )
      .subscribe()

    // Subscribe to reactions
    reactionsChannelRef.current = supabase
      .channel('reactions_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          // Refetch messages to get updated reactions
          fetchMessages()
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

  return {
    messages,
    pinnedMessages,
    systemMessages,
    onlineUsers,
    typingUsers,
    isLoading,
    error,
    sendMessage,
    deleteMessage,
    togglePinMessage,
    addReaction,
    startTyping,
    stopTyping,
    sendAnnouncement,
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
      const { data, error } = await supabase
        .from('chat_users')
        .insert({
          name,
          email,
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

  const loginAdmin = async (password: string): Promise<boolean> => {
    if (password !== ADMIN_PASSWORD) {
      return false
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_users')
        .insert({
          name: 'מנהל',
          email: 'admin@nituk.co.il',
          user_type: 'admin',
          avatar_color: '#8b5cf6',
          is_online: true
        })
        .select()
        .single()

      if (error) throw error
      
      if (data) {
        localStorage.setItem('chat_user_id', data.id)
        setCurrentUser(data)
        return true
      }
      return false
    } catch (err) {
      console.error('Error admin login:', err)
      return false
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
    loginAdmin,
    logout
  }
}

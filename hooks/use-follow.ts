"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface FollowStats {
  followers: number
  following: number
}

/**
 * useFollow — manages follow/unfollow state between currentUser → targetUser.
 * Works directly with the user_follows Supabase table.
 * Safe to call with undefined currentUserId (returns no-op state).
 */
export function useFollow(currentUserId: string | undefined, targetUserId: string) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [stats,       setStats]       = useState<FollowStats>({ followers: 0, following: 0 })

  useEffect(() => {
    if (!targetUserId) return

    // Check if current user follows target
    const checkFollow = async () => {
      if (!currentUserId || currentUserId === targetUserId) return
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .maybeSingle()
      setIsFollowing(!!data)
    }

    // Follower/following counts for the target user
    const fetchStats = async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id',  targetUserId),
      ])
      setStats({ followers: followers ?? 0, following: following ?? 0 })
    }

    checkFollow()
    fetchStats()
  }, [currentUserId, targetUserId])

  const toggleFollow = useCallback(async () => {
    if (!currentUserId || currentUserId === targetUserId || loading) return
    setLoading(true)
    const wasFollowing = isFollowing
    // Optimistic update
    setIsFollowing(!wasFollowing)
    setStats(s => ({ ...s, followers: wasFollowing ? Math.max(0, s.followers - 1) : s.followers + 1 }))
    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: currentUserId, following_id: targetUserId })
        if (error) throw error
      }
    } catch (err) {
      console.error('[useFollow] toggle error:', err)
      // Rollback optimistic update on failure
      setIsFollowing(wasFollowing)
      setStats(s => ({ ...s, followers: wasFollowing ? s.followers + 1 : Math.max(0, s.followers - 1) }))
    } finally {
      setLoading(false)
    }
  }, [currentUserId, targetUserId, isFollowing, loading])

  const canFollow = !!currentUserId && currentUserId !== targetUserId

  return { isFollowing, toggleFollow, loading, stats, canFollow }
}

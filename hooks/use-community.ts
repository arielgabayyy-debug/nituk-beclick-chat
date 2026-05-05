"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { 
  ChatUser, Poll, PollOption, HotDeal, DailyQuestion, 
  DailyTip, SuccessStory, CommunityEvent, UserAchievement,
  AchievementType
} from '@/lib/chat-types'
import { calculateLevel } from '@/lib/chat-types'

const supabase = createClient()

export function useCommunity(currentUser: ChatUser | null) {
  const [polls, setPolls] = useState<Poll[]>([])
  const [hotDeals, setHotDeals] = useState<HotDeal[]>([])
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null)
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null)
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CommunityEvent[]>([])
  const [leaderboard, setLeaderboard] = useState<ChatUser[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch all community data
  const fetchCommunityData = useCallback(async () => {
    setIsLoading(true)
    try {
      const now = new Date().toISOString()

      // ── Parallelise all independent fetches in one round-trip batch ──────
      const [
        { data: pollsData },
        { data: dealsData },
        // Fetch user-specific data only when logged in
        { data: userPollVotes },
        { data: userDealVotes },
        { data: questionData },
        { data: tipData },
        { data: storiesData },
        { data: eventsData },
        { data: leaderboardData },
        { data: achievementsData },
      ] = await Promise.all([
        supabase
          .from('polls')
          .select(`id, question, is_active, created_at, created_by, options:poll_options(id, poll_id, option_text, votes_count), creator:chat_users(id, name, avatar_color)`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('hot_deals')
          .select('id, title, description, provider, savings_amount, upvotes, created_at, user_id, user:chat_users(id, name, avatar_color)')
          .order('upvotes', { ascending: false })
          .limit(10),

        // Single query for ALL user poll votes (not one per poll)
        currentUser
          ? supabase.from('poll_votes').select('poll_id, option_id').eq('user_id', currentUser.id)
          : Promise.resolve({ data: [] as Array<{ poll_id: string; option_id: string }> }),

        currentUser
          ? supabase.from('deal_votes').select('deal_id, vote_type').eq('user_id', currentUser.id)
          : Promise.resolve({ data: [] as Array<{ deal_id: string; vote_type: string }> }),

        supabase.from('daily_questions').select('id, question, is_active, created_at').eq('is_active', true).single(),

        supabase.from('daily_tips').select('id, tip, category, is_active, created_at').eq('is_active', true).single(),

        supabase
          .from('success_stories')
          .select('id, title, description, savings_amount, likes_count, created_at, user_id, user:chat_users(id, name, avatar_color)')
          .order('likes_count', { ascending: false })
          .limit(5),

        supabase
          .from('community_events')
          .select('id, title, description, starts_at, is_active')
          .eq('is_active', true)
          .gte('starts_at', now)
          .order('starts_at', { ascending: true })
          .limit(3),

        // Narrow columns — avatar_url excluded (large base64)
        supabase
          .from('chat_users')
          .select('id, name, avatar_color, user_type, level, points, level, weekly_points, messages_count, helpful_count, is_user_of_week, is_online, created_at, last_seen')
          .order('weekly_points', { ascending: false })
          .limit(10),

        currentUser
          ? supabase.from('user_achievements').select('id, user_id, achievement_type, unlocked_at').eq('user_id', currentUser.id)
          : Promise.resolve({ data: [] as Array<{ id: string; user_id: string; achievement_type: string; unlocked_at: string }> }),
      ])

      // ── Build poll vote lookup map (O(1) per poll) ────────────────────
      const pollVoteMap = new Map<string, string>()
      for (const v of (userPollVotes || [])) pollVoteMap.set(v.poll_id, v.option_id)

      if (pollsData) {
        const pollsWithVotes = pollsData.map(poll => {
          const totalVotes = poll.options?.reduce((sum: number, opt: PollOption) => sum + opt.votes_count, 0) || 0
          return {
            ...poll,
            total_votes: totalVotes,
            user_voted_option: pollVoteMap.get(poll.id) || null,
            options: poll.options?.map((opt: PollOption) => ({
              ...opt,
              percentage: totalVotes > 0 ? (opt.votes_count / totalVotes) * 100 : 0,
            })),
          }
        })
        setPolls(pollsWithVotes)
      }

      // ── Build deal vote lookup map ─────────────────────────────────────
      const dealVoteMap = new Map<string, string>()
      for (const v of (userDealVotes || [])) dealVoteMap.set(v.deal_id, v.vote_type)

      if (dealsData) {
        const dealsWithVotes = dealsData.map(deal => ({
          ...deal,
          user_voted: dealVoteMap.get(deal.id) || null,
        }))
        setHotDeals(dealsWithVotes)
      }

      setDailyQuestion(questionData)
      setDailyTip(tipData)
      setSuccessStories(storiesData || [])
      setUpcomingEvents(eventsData || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLeaderboard((leaderboardData || []) as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (currentUser) setUserAchievements((achievementsData || []) as any)

    } catch (err) {
      console.error('Error fetching community data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  // Vote on poll
  const votePoll = useCallback(async (pollId: string, optionId: string) => {
    if (!currentUser) return

    try {
      // Insert vote
      await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: currentUser.id
        })

      // Increment vote count
      await supabase.rpc('increment_poll_vote', { option_id: optionId })

      // Add points
      await addPoints(5, 'poll_vote')

      // Refresh polls
      fetchCommunityData()
    } catch (err) {
      console.error('Error voting on poll:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Create poll (admin or subscribers)
  const createPoll = useCallback(async (question: string, options: string[]) => {
    if (!currentUser) return

    try {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert({
          question,
          created_by: currentUser.id,
          is_active: true
        })
        .select()
        .single()

      if (pollError) throw pollError

      // Insert options
      const optionsToInsert = options.map(opt => ({
        poll_id: pollData.id,
        option_text: opt
      }))

      await supabase
        .from('poll_options')
        .insert(optionsToInsert)

      // Add achievement
      await checkAndAddAchievement('poll_creator')

      // Add points
      await addPoints(20, 'create_poll')

      fetchCommunityData()
    } catch (err) {
      console.error('Error creating poll:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Share hot deal
  const shareDeal = useCallback(async (title: string, description: string, provider: string, savingsAmount: number) => {
    if (!currentUser) return

    try {
      await supabase
        .from('hot_deals')
        .insert({
          user_id: currentUser.id,
          title,
          description,
          provider,
          savings_amount: savingsAmount
        })

      // Add points
      await addPoints(15, 'share_deal')

      // Check deal hunter achievement
      const { count } = await supabase
        .from('hot_deals')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUser.id)

      if (count && count >= 10) {
        await checkAndAddAchievement('deal_hunter')
      }

      fetchCommunityData()
    } catch (err) {
      console.error('Error sharing deal:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Vote on deal
  const voteDeal = useCallback(async (dealId: string, voteType: 'up' | 'down') => {
    if (!currentUser) return

    try {
      // Check existing vote
      const { data: existingVote } = await supabase
        .from('deal_votes')
        .select('id, vote_type')
        .eq('deal_id', dealId)
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await supabase.from('deal_votes').delete().eq('id', existingVote.id)

          // Decrement upvotes
          const { data: deal } = await supabase
            .from('hot_deals').select('upvotes').eq('id', dealId).single()
          if (deal) {
            await supabase.from('hot_deals')
              .update({ upvotes: Math.max(0, deal.upvotes - 1) })
              .eq('id', dealId)
          }
        } else {
          // Change vote
          await supabase.from('deal_votes')
            .update({ vote_type: voteType }).eq('id', existingVote.id)
        }
      } else {
        // New vote
        await supabase.from('deal_votes').insert({
          deal_id: dealId,
          user_id: currentUser.id,
          vote_type: voteType
        })

        if (voteType === 'up') {
          // Increment upvotes on deal
          const { data: deal } = await supabase
            .from('hot_deals').select('upvotes, user_id').eq('id', dealId).single()

          if (deal) {
            // Parallel: update deal upvotes + creator points in one round-trip pair
            const updates: Promise<unknown>[] = [
              supabase.from('hot_deals')
                .update({ upvotes: deal.upvotes + 1 }).eq('id', dealId),
            ]
            if (deal.user_id !== currentUser.id) {
              const { data: creator } = await supabase
                .from('chat_users').select('helpful_count, points').eq('id', deal.user_id).single()
              if (creator) {
                updates.push(
                  supabase.from('chat_users')
                    .update({
                      helpful_count: creator.helpful_count + 1,
                      points: creator.points + 5
                    }).eq('id', deal.user_id)
                )
              }
            }
            await Promise.all(updates)
          }
        }
      }

      fetchCommunityData()
    } catch (err) {
      console.error('Error voting on deal:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Share success story
  const shareStory = useCallback(async (title: string, story: string, savingsAmount: number) => {
    if (!currentUser) return

    try {
      await supabase
        .from('success_stories')
        .insert({
          user_id: currentUser.id,
          title,
          story,
          savings_amount: savingsAmount
        })

      // Add achievement
      await checkAndAddAchievement('story_teller')

      // Add points
      await addPoints(30, 'share_story')

      fetchCommunityData()
    } catch (err) {
      console.error('Error sharing story:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Upvote message
  const upvoteMessage = useCallback(async (messageId: string, messageUserId: string) => {
    if (!currentUser || messageUserId === currentUser.id) return

    try {
      // Check existing upvote
      const { data: existing } = await supabase
        .from('message_upvotes')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUser.id)
        .single()

      if (existing) {
        // Remove upvote
        await supabase
          .from('message_upvotes')
          .delete()
          .eq('id', existing.id)
      } else {
        // Add upvote
        await supabase
          .from('message_upvotes')
          .insert({
            message_id: messageId,
            user_id: currentUser.id
          })

        // Add helpful count to message author
        const { data: author } = await supabase
          .from('chat_users').select('helpful_count, points').eq('id', messageUserId).single()
        if (author) {
          await supabase.from('chat_users')
            .update({
              helpful_count: author.helpful_count + 1,
              points: author.points + 3
            }).eq('id', messageUserId)
        }

        // Check helpful achievements
        const { data: userData } = await supabase
          .from('chat_users')
          .select('helpful_count')
          .eq('id', messageUserId)
          .single()

        if (userData) {
          if (userData.helpful_count >= 10) {
            await checkAndAddAchievementForUser(messageUserId, 'helpful_10')
          }
          if (userData.helpful_count >= 50) {
            await checkAndAddAchievementForUser(messageUserId, 'helpful_50')
          }
        }
      }
    } catch (err) {
      console.error('Error upvoting message:', err)
    }
  }, [currentUser])

  // Add points helper
  const addPoints = useCallback(async (points: number, reason: string) => {
    if (!currentUser) return

    try {
      const { data: userData } = await supabase
        .from('chat_users')
        .select('points, level, weekly_points')
        .eq('id', currentUser.id)
        .single()

      if (userData) {
        const newPoints = userData.points + points
        const newLevel = calculateLevel(newPoints)

        await supabase
          .from('chat_users')
          .update({
            points: newPoints,
            level: calculateLevel(newPoints),
            weekly_points: (userData.weekly_points || 0) + points
          })
          .eq('id', currentUser.id)
      }
    } catch (err) {
      console.error('Error adding points:', err)
    }
  }, [currentUser])

  // Check and add achievement
  const checkAndAddAchievement = useCallback(async (achievementType: AchievementType) => {
    if (!currentUser) return

    try {
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('achievement_type', achievementType)
        .maybeSingle()

      if (!existing) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: currentUser.id,
            achievement_type: achievementType
          })

        // Add bonus points for achievement
        await addPoints(50, `achievement_${achievementType}`)
      }
    } catch (err) {
      console.error('Error adding achievement:', err)
    }
  }, [currentUser, addPoints])

  // Check and add achievement for specific user
  const checkAndAddAchievementForUser = useCallback(async (userId: string, achievementType: AchievementType) => {
    try {
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_type', achievementType)
        .maybeSingle()

      if (!existing) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_type: achievementType
          })
      }
    } catch (err) {
      console.error('Error adding achievement for user:', err)
    }
  }, [])

  // Admin: Set daily question
  const setDailyQuestionActive = useCallback(async (question: string) => {
    if (!currentUser || currentUser.user_type !== 'admin') return

    try {
      // Deactivate all questions
      await supabase
        .from('daily_questions')
        .update({ is_active: false })
        .eq('is_active', true)

      // Insert new active question
      await supabase
        .from('daily_questions')
        .insert({
          question,
          is_active: true
        })

      fetchCommunityData()
    } catch (err) {
      console.error('Error setting daily question:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Admin: Set daily tip
  const setDailyTipActive = useCallback(async (tipText: string, category: string) => {
    if (!currentUser || currentUser.user_type !== 'admin') return

    try {
      // Deactivate all tips
      await supabase
        .from('daily_tips')
        .update({ is_active: false })
        .eq('is_active', true)

      // Insert new active tip
      await supabase
        .from('daily_tips')
        .insert({
          tip_text: tipText,
          category,
          is_active: true
        })

      fetchCommunityData()
    } catch (err) {
      console.error('Error setting daily tip:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Admin: Create event
  const createEvent = useCallback(async (title: string, description: string, eventType: 'expert_hour' | 'quiz' | 'special', startsAt: string) => {
    if (!currentUser || currentUser.user_type !== 'admin') return

    try {
      await supabase
        .from('community_events')
        .insert({
          title,
          description,
          event_type: eventType,
          starts_at: startsAt,
          is_active: true
        })

      fetchCommunityData()
    } catch (err) {
      console.error('Error creating event:', err)
    }
  }, [currentUser, fetchCommunityData])

  // Keep a stable ref to fetchCommunityData so subscriptions don't need to
  // re-subscribe every time currentUser changes (which would re-run this effect)
  const fetchCommunityDataRef = useRef(fetchCommunityData)
  useEffect(() => { fetchCommunityDataRef.current = fetchCommunityData }, [fetchCommunityData])

  // Set up realtime subscriptions — runs once on mount only (stable ref)
  // Debounce re-fetches to prevent stampede when many events arrive at once
  useEffect(() => {
    fetchCommunityDataRef.current()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => fetchCommunityDataRef.current(), 1000)
    }

    const communityChannel = supabase
      .channel('community_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hot_deals' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_events' }, debouncedRefetch)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(communityChannel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // empty deps — stable ref handles updates

  return {
    polls,
    hotDeals,
    dailyQuestion,
    dailyTip,
    successStories,
    upcomingEvents,
    leaderboard,
    userAchievements,
    isLoading,
    votePoll,
    createPoll,
    shareDeal,
    voteDeal,
    shareStory,
    upvoteMessage,
    setDailyQuestionActive,
    setDailyTipActive,
    createEvent,
    addPoints,
    checkAndAddAchievement,
    refreshData: fetchCommunityData
  }
}

"use client"

import { useState, useEffect, useMemo } from 'react'
import { Crown, ThumbsUp, Star, ChevronRight } from 'lucide-react'
import type { ChatUser, ChatMessage } from '@/lib/chat-types'
import { cn } from '@/lib/utils'

const VOTE_KEY = 'user_of_week_votes'
const WEEK_KEY = 'user_of_week_current'

function getCurrentWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  const week = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${week}`
}

interface UserOfWeekProps {
  messages: ChatMessage[]
  onlineUsers: ChatUser[]
  currentUser: ChatUser
  onViewProfile?: (user: ChatUser) => void
}

export function UserOfWeekWidget({ messages, onlineUsers, currentUser, onViewProfile }: UserOfWeekProps) {
  const [myVote, setMyVote] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const weekKey = getCurrentWeekKey()

  useEffect(() => {
    try {
      const savedVote = localStorage.getItem(`${VOTE_KEY}_${weekKey}_${currentUser.id}`)
      if (savedVote) setMyVote(savedVote)
      const savedVotes = JSON.parse(localStorage.getItem(`${VOTE_KEY}_${weekKey}`) || '{}')
      setVotes(savedVotes)
    } catch {}
  }, [weekKey, currentUser.id])

  // Top candidates: most active users this week (from messages)
  const candidates = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const msgCounts: Record<string, { count: number; user: ChatUser | undefined }> = {}

    messages.forEach(m => {
      if (new Date(m.created_at).getTime() < weekAgo) return
      if (m.user_id === currentUser.id) return // can't vote for yourself
      if (!msgCounts[m.user_id]) msgCounts[m.user_id] = { count: 0, user: m.user }
      msgCounts[m.user_id].count++
    })

    return Object.entries(msgCounts)
      .filter(([, v]) => v.user)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([userId, { user, count }]) => ({
        userId,
        user: user!,
        msgCount: count,
        voteCount: (votes[userId] || 0),
      }))
  }, [messages, currentUser.id, votes])

  const handleVote = (userId: string) => {
    if (myVote) return // already voted
    const newVotes = { ...votes, [userId]: (votes[userId] || 0) + 1 }
    setVotes(newVotes)
    setMyVote(userId)
    localStorage.setItem(`${VOTE_KEY}_${weekKey}`, JSON.stringify(newVotes))
    localStorage.setItem(`${VOTE_KEY}_${weekKey}_${currentUser.id}`, userId)
  }

  const winner = candidates.sort((a, b) => b.voteCount - a.voteCount)[0]

  if (candidates.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/20 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-400/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">משתמש השבוע 🏆</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">{weekKey}</span>
      </div>

      {/* Current leader */}
      {winner && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-amber-400/10">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-amber-400"
              style={{ backgroundColor: winner.user.avatar_color }}
            >
              {winner.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -top-1 -right-1 text-base">👑</div>
          </div>
          <div>
            <p className="text-sm font-semibold">{winner.user.name}</p>
            <p className="text-xs text-muted-foreground">{winner.voteCount} הצבעות · {winner.msgCount} הודעות</p>
          </div>
        </div>
      )}

      {/* Candidates list */}
      <div className="divide-y divide-amber-400/10">
        {candidates.slice(0, 4).map((c, i) => (
          <div key={c.userId} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-amber-500/5 transition">
            <span className="text-xs font-bold text-amber-600 w-5 shrink-0">#{i + 1}</span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: c.user.avatar_color }}
            >
              {c.user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{c.user.name}</p>
              <p className="text-[10px] text-muted-foreground">{c.msgCount} הודעות השבוע</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{c.voteCount}</span>
              <button
                onClick={() => handleVote(c.userId)}
                disabled={!!myVote}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full transition-all",
                  myVote === c.userId
                    ? "bg-amber-100 text-amber-600 cursor-default"
                    : myVote
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-amber-100 hover:text-amber-600"
                )}
                title={myVote ? 'כבר הצבעת השבוע' : 'הצבע'}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {myVote && (
        <p className="text-center text-[10px] text-muted-foreground py-2">
          ✓ הצבעת השבוע — תוצאות יתעדכנו בסוף השבוע
        </p>
      )}
    </div>
  )
}

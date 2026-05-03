"use client"

import { Crown, Medal, TrendingUp, Star, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatUser } from '@/lib/chat-types'
import { LEVEL_NAMES, formatNumber } from '@/lib/chat-types'
import { UserBadge } from './user-badge'

interface LeaderboardProps {
  users: ChatUser[]
  currentUserId?: string
}

export function Leaderboard({ users, currentUserId }: LeaderboardProps) {
  if (users.length === 0) return null

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-300" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-muted-foreground font-medium">{rank}</span>
    }
  }

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50'
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50'
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50'
      default:
        return 'bg-card/50 border-border/50'
    }
  }

  return (
    <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">לוח המובילים</h3>
            <p className="text-xs text-muted-foreground">השבוע</p>
          </div>
          <Sparkles className="h-4 w-4 text-purple-400 mr-auto animate-pulse" />
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
        {users.map((user, index) => {
          const rank = index + 1
          const isCurrentUser = user.id === currentUserId

          return (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                getRankStyle(rank),
                isCurrentUser && "ring-2 ring-primary/50",
                rank <= 3 && "hover:scale-[1.02]"
              )}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(rank)}
              </div>

              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.name.charAt(0)}
                </div>
                {user.is_user_of_week && (
                  <div className="absolute -top-1 -right-1">
                    <Crown className="h-4 w-4 text-yellow-400 animate-bounce" />
                  </div>
                )}
                {rank === 1 && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Star className="h-2.5 w-2.5 text-yellow-900" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold truncate",
                    isCurrentUser && "text-primary"
                  )}>
                    {user.name}
                  </span>
                  <UserBadge userType={user.user_type} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>רמה {user.level}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{LEVEL_NAMES[user.level] || 'מתחיל'}</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-left">
                <div className={cn(
                  "font-bold text-lg",
                  rank === 1 && "text-yellow-400",
                  rank === 2 && "text-gray-300",
                  rank === 3 && "text-amber-600"
                )}>
                  {formatNumber(user.weekly_points)}
                </div>
                <div className="text-xs text-muted-foreground">נקודות</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-muted/30">
        <p className="text-xs text-center text-muted-foreground">
          הנקודות מתאפסות כל יום ראשון בחצות
        </p>
      </div>
    </div>
  )
}

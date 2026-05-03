"use client"

import { useState, useRef } from 'react'
import { Star, Trophy, MessageSquare, Heart, TrendingUp, Award, Zap, Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatUser, UserAchievement, ChatMessage } from '@/lib/chat-types'
import { 
  LEVEL_NAMES, ACHIEVEMENT_INFO, getPointsToNextLevel, 
  formatNumber, USER_TYPE_LABELS 
} from '@/lib/chat-types'
import { UserBadge } from './user-badge'
import { StreakCalendar } from './streak-calendar'

interface UserProfileProps {
  user: ChatUser
  achievements: UserAchievement[]
  rank?: number
  onClose?: () => void
  isCurrentUser?: boolean
  onAvatarUpdate?: (avatarUrl: string) => void
  recentMessages?: ChatMessage[]
}

export function UserProfile({ user, achievements, rank, onClose, isCurrentUser, onAvatarUpdate, recentMessages }: UserProfileProps) {
  const levelProgress = getPointsToNextLevel(user.points, user.level)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canUploadAvatar = isCurrentUser && (user.user_type === 'subscriber' || user.user_type === 'admin')

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'שגיאה בהעלאת התמונה')
        return
      }

      onAvatarUpdate?.(data.avatar_url)
      alert('התמונה הועלתה בהצלחה!')
    } catch {
      alert('שגיאה בהעלאת התמונה')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden shadow-xl max-w-sm w-full">
      {/* Header with gradient */}
      <div className="relative h-24 bg-gradient-to-br from-primary/50 to-purple-500/50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        {user.is_user_of_week && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-400/90 text-yellow-900 rounded-full text-xs font-bold flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            משתמש השבוע
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="relative px-4 -mt-12">
        <div className="relative">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-card shadow-lg"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl border-4 border-card shadow-lg"
              style={{ backgroundColor: user.avatar_color }}
            >
              {user.name.charAt(0)}
            </div>
          )}
          
          {/* Upload button for subscribers */}
          {canUploadAvatar && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 pt-2 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
            <UserBadge userType={user.user_type} joinedAt={user.created_at} />
          </div>
          <p className="text-sm text-muted-foreground">{USER_TYPE_LABELS[user.user_type]}</p>
        </div>

        {/* Level & Progress */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                <Star className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">רמה {user.level}</span>
              <span className="text-sm text-muted-foreground">
                {LEVEL_NAMES[user.level]}
              </span>
            </div>
            {rank && (
              <span className="text-sm text-muted-foreground">
                דירוג #{rank}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
              style={{ width: `${levelProgress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            {levelProgress.current} / {levelProgress.needed} לרמה הבאה
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
            <div className="font-bold text-foreground">{formatNumber(user.points)}</div>
            <div className="text-xs text-muted-foreground">נקודות</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <MessageSquare className="h-5 w-5 mx-auto mb-1 text-blue-400" />
            <div className="font-bold text-foreground">{formatNumber(user.messages_count)}</div>
            <div className="text-xs text-muted-foreground">הודעות</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Heart className="h-5 w-5 mx-auto mb-1 text-red-400" />
            <div className="font-bold text-foreground">{formatNumber(user.helpful_count)}</div>
            <div className="text-xs text-muted-foreground">עזרות</div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-1">
              <Award className="h-4 w-4 text-purple-400" />
              הישגים ({achievements.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {achievements.map((achievement) => {
                const info = ACHIEVEMENT_INFO[achievement.achievement_type]
                return (
                  <div
                    key={achievement.id}
                    className="group relative"
                    title={info?.description}
                  >
                    <div className="px-2 py-1 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30 flex items-center gap-1 text-sm hover:scale-105 transition-transform cursor-default">
                      <span>{info?.icon}</span>
                      <span className="text-xs font-medium">{info?.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly Stats */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-foreground">נקודות השבוע</span>
          </div>
          <span className="font-bold text-purple-400">{formatNumber(user.weekly_points)}</span>
        </div>

        {/* Streak calendar - only for self */}
        {isCurrentUser && <StreakCalendar userId={user.id} />}

        {/* Recent messages */}
        {recentMessages && recentMessages.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> הודעות אחרונות
            </h4>
            <div className="space-y-1.5">
              {recentMessages.slice(0, 3).map(msg => (
                <div key={msg.id} className="bg-muted/40 rounded-xl px-3 py-2">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {msg.content.startsWith('[voice:') ? '🎤 הודעה קולית' : msg.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

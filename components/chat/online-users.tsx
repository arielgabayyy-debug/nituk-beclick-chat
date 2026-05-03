"use client"

import { Users, ChevronDown, ChevronUp, Crown, Star, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { UserBadge } from './user-badge'
import type { ChatUser, UserType } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

interface OnlineUsersProps {
  users: ChatUser[]
  currentUserId?: string
  onUserClick?: (user: ChatUser) => void
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

function getUserTypeIcon(type: UserType) {
  switch (type) {
    case 'admin':
      return <Crown className="w-3 h-3 text-purple-400" />
    case 'subscriber':
      return <Star className="w-3 h-3 text-cyan-400" />
    case 'newsletter':
      return <Mail className="w-3 h-3 text-amber-400" />
    default:
      return <User className="w-3 h-3 text-muted-foreground" />
  }
}

// Sort users: admins first, then subscribers, then newsletter, then guests
function sortUsers(users: ChatUser[]): ChatUser[] {
  const order: Record<UserType, number> = {
    admin: 0,
    subscriber: 1,
    newsletter: 2,
    guest: 3,
    blocked: 99
  }
  return [...users].sort((a, b) => order[a.user_type] - order[b.user_type])
}

export function OnlineUsers({ users, currentUserId, onUserClick }: OnlineUsersProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const sortedUsers = sortUsers(users)

  // Count by type
  const counts = {
    admin: users.filter(u => u.user_type === 'admin').length,
    subscriber: users.filter(u => u.user_type === 'subscriber').length,
    newsletter: users.filter(u => u.user_type === 'newsletter').length,
    guest: users.filter(u => u.user_type === 'guest').length
  }

  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/30 shadow-xl">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black">
              {users.length}
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold block">משתמשים מחוברים</span>
            <span className="text-xs text-muted-foreground">בזמן אמת</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Stats bar */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 border-t border-border/20",
        isExpanded ? "max-h-[500px]" : "max-h-0"
      )}>
        {/* User type counts */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted/20">
          {counts.admin > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Crown className="w-3 h-3 text-purple-400" />
              <span>{counts.admin}</span>
            </div>
          )}
          {counts.subscriber > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3 h-3 text-cyan-400" />
              <span>{counts.subscriber}</span>
            </div>
          )}
          {counts.newsletter > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Mail className="w-3 h-3 text-amber-400" />
              <span>{counts.newsletter}</span>
            </div>
          )}
          {counts.guest > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <User className="w-3 h-3 text-muted-foreground" />
              <span>{counts.guest}</span>
            </div>
          )}
        </div>

        {/* User list */}
        <div className="px-3 pb-3 space-y-1 chat-scrollbar overflow-y-auto max-h-80">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                אין משתמשים מחוברים כרגע
              </p>
            </div>
          ) : (
            sortedUsers.map((user, index) => (
              <button 
                key={user.id}
                onClick={() => onUserClick?.(user)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-muted/30 cursor-pointer",
                  user.id === currentUserId && "bg-primary/10 border border-primary/20",
                  "animate-in fade-in slide-in-from-right-2"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg transition-transform hover:scale-105"
                    style={{ 
                      backgroundColor: user.avatar_color,
                      boxShadow: `0 4px 14px ${user.avatar_color}40`
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                  </div>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate">
                      {user.name}
                    </span>
                    {user.id === currentUserId && (
                      <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded-full">
                        אתה
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserBadge userType={user.user_type} />
                  </div>
                </div>

                {/* User type icon */}
                <div className="shrink-0">
                  {getUserTypeIcon(user.user_type)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

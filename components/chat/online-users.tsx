"use client"

import { Users, ChevronDown, ChevronUp, Crown, Star, Mail, User, Search } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const sortedUsers = sortUsers(users).filter(u =>
    !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Count by type
  const counts = {
    admin: users.filter(u => u.user_type === 'admin').length,
    subscriber: users.filter(u => u.user_type === 'subscriber').length,
    newsletter: users.filter(u => u.user_type === 'newsletter').length,
    guest: users.filter(u => u.user_type === 'guest').length
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">מחוברים עכשיו</span>
          </div>
          <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Stats bar */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded ? "max-h-[500px]" : "max-h-0"
      )}>
        {/* User type counts */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
          {counts.admin > 0 && (
            <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <Crown className="w-3 h-3" />
              <span>{counts.admin}</span>
            </div>
          )}
          {counts.subscriber > 0 && (
            <div className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400">
              <Star className="w-3 h-3" />
              <span>{counts.subscriber}</span>
            </div>
          )}
          {counts.newsletter > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Mail className="w-3 h-3" />
              <span>{counts.newsletter}</span>
            </div>
          )}
          {counts.guest > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>{counts.guest}</span>
            </div>
          )}
        </div>

        {/* User search */}
        {users.length > 5 && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="חפש משתמש..."
                className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}

        {/* User list */}
        <div className="px-3 pb-3 space-y-0.5 chat-scrollbar overflow-y-auto max-h-80">
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
                  "w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer text-right",
                  user.id === currentUserId && "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/50 dark:border-cyan-800/50",
                  "animate-in fade-in slide-in-from-right-2"
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Avatar with online indicator */}
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      backgroundColor: user.avatar_color,
                      boxShadow: `0 2px 8px ${user.avatar_color}40`
                    }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : getInitials(user.name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-100">
                      {user.name}
                    </span>
                    {user.id === currentUserId && (
                      <span className="text-[9px] text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 px-1.5 py-0.5 rounded-full shrink-0">
                        אתה
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserBadge userType={user.user_type} joinedAt={user.created_at} />
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

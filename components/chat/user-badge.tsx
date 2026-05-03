"use client"

import { Crown, Mail, User, Shield, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserType } from '@/lib/chat-types'
import { USER_TYPE_LABELS, USER_TYPE_COLORS } from '@/lib/chat-types'

interface UserBadgeProps {
  userType: UserType
  size?: 'sm' | 'md'
  showIcon?: boolean
  joinedAt?: string
  userId?: string
}

const USER_TYPE_ICONS: Record<UserType, React.ReactNode> = {
  guest: <User className="w-3 h-3" />,
  subscriber: <Crown className="w-3 h-3" />,
  newsletter: <Mail className="w-3 h-3" />,
  admin: <Shield className="w-3 h-3" />,
  blocked: <Shield className="w-3 h-3" />
}

function isNewUser(joinedAt?: string): boolean {
  if (!joinedAt) return false
  const days = (Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 7
}

function hasGoldenBadge(userId?: string): boolean {
  if (!userId || typeof window === 'undefined') return false
  try { return !!localStorage.getItem(`golden_badge_${userId}`) } catch { return false }
}

export function UserBadge({ userType, size = 'sm', showIcon = true, joinedAt, userId }: UserBadgeProps) {
  const isNew = isNewUser(joinedAt)
  const golden = hasGoldenBadge(userId)
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium",
          USER_TYPE_COLORS[userType],
          size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
        )}
      >
        {showIcon && USER_TYPE_ICONS[userType]}
        {USER_TYPE_LABELS[userType]}
      </span>
      {golden && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900" title="תג זהב VIP">
          👑 VIP
        </span>
      )}
      {isNew && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white">
          <Sparkles className="w-2 h-2" />
          חדש
        </span>
      )}
    </span>
  )
}

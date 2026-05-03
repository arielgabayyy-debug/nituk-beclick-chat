"use client"

import { Crown, Mail, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserType } from '@/lib/chat-types'
import { USER_TYPE_LABELS, USER_TYPE_COLORS } from '@/lib/chat-types'

interface UserBadgeProps {
  userType: UserType
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const USER_TYPE_ICONS: Record<UserType, React.ReactNode> = {
  guest: <User className="w-3 h-3" />,
  subscriber: <Crown className="w-3 h-3" />,
  newsletter: <Mail className="w-3 h-3" />,
  admin: <Shield className="w-3 h-3" />,
  blocked: <Shield className="w-3 h-3" />
}

export function UserBadge({ userType, size = 'sm', showIcon = true }: UserBadgeProps) {
  return (
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
  )
}

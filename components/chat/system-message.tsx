"use client"

import { UserPlus, UserMinus, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SystemMessage } from '@/lib/chat-types'
import { formatTime } from '@/lib/chat-types'

interface SystemMessageComponentProps {
  message: SystemMessage
}

export function SystemMessageComponent({ message }: SystemMessageComponentProps) {
  const getIcon = () => {
    switch (message.message_type) {
      case 'join':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
      case 'leave':
        return <UserMinus className="w-3.5 h-3.5 text-rose-400" />
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-amber-400" />
    }
  }

  const getBgColor = () => {
    switch (message.message_type) {
      case 'join':
        return 'bg-emerald-500/10 border-emerald-500/20'
      case 'leave':
        return 'bg-rose-500/10 border-rose-500/20'
      case 'announcement':
        return 'bg-amber-500/10 border-amber-500/20'
    }
  }

  return (
    <div className="flex justify-center my-3">
      <div className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs border",
        getBgColor()
      )}>
        {getIcon()}
        <span className="text-muted-foreground">{message.content}</span>
        <span className="text-muted-foreground/60">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

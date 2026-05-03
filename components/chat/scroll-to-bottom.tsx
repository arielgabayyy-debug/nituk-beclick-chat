"use client"

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollToBottomProps {
  show: boolean
  unreadCount: number
  onClick: () => void
}

export function ScrollToBottomButton({ show, unreadCount, onClick }: ScrollToBottomProps) {
  return (
    <button
      onClick={onClick}
      aria-label="גלול לתחתית"
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 z-10",
        "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90 hover:shadow-xl hover:scale-105",
        "transition-all duration-200",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ChevronDown className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="text-xs font-bold">
          {unreadCount} הודעות חדשות
        </span>
      )}
    </button>
  )
}

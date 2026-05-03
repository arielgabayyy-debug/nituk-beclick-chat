"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ReadReceiptsProps {
  messageId: string
  messageCreatedAt: string
  currentUserId: string
  isOwn: boolean
  onlineUsers?: Array<{ user_id: string; user_name: string; avatar_color: string }>
}

// We track "seen" by storing the last-seen message ID per user in localStorage
// This is a client-only approximation — real read receipts require a DB table
export function useReadReceipts(currentUserId: string, currentMessageId: string) {
  // Mark the current latest message as read for this user
  useEffect(() => {
    if (!currentUserId || !currentMessageId) return
    try {
      const receipts = JSON.parse(localStorage.getItem('read_receipts') || '{}')
      receipts[currentUserId] = { messageId: currentMessageId, at: new Date().toISOString() }
      localStorage.setItem('read_receipts', JSON.stringify(receipts))
    } catch {}
  }, [currentUserId, currentMessageId])
}

export function ReadReceiptAvatars({
  messageId,
  isOwn,
  onlineUsers = [],
  currentUserId,
}: ReadReceiptsProps) {
  const [readers, setReaders] = useState<Array<{ user_id: string; user_name: string; avatar_color: string }>>([])

  useEffect(() => {
    // Find which online users have "seen" up to this message
    try {
      const receipts = JSON.parse(localStorage.getItem('read_receipts') || '{}')
      const seen = onlineUsers.filter(u => {
        if (u.user_id === currentUserId) return false
        const r = receipts[u.user_id]
        return r && r.messageId >= messageId // string compare works for UUID sort order approximation
      })
      setReaders(seen.slice(0, 3))
    } catch {}
  }, [messageId, onlineUsers, currentUserId])

  if (!isOwn || readers.length === 0) return null

  return (
    <div className={cn("flex items-center gap-0.5 mt-0.5", isOwn && "justify-end")}>
      {readers.map(r => (
        <div
          key={r.user_id}
          className="w-4 h-4 rounded-full border border-background flex items-center justify-center text-[8px] text-white font-bold shrink-0"
          style={{ backgroundColor: r.avatar_color }}
          title={`${r.user_name} ראה`}
        >
          {r.user_name.charAt(0).toUpperCase()}
        </div>
      ))}
      <span className="text-[9px] text-muted-foreground">✓✓</span>
    </div>
  )
}

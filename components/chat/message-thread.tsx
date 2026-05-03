"use client"

import { useMemo } from 'react'
import { X, MessageCircle, Reply } from 'lucide-react'
import type { ChatMessage, ChatUser } from '@/lib/chat-types'
import { formatTime } from '@/lib/chat-types'

interface MessageThreadProps {
  rootMessage: ChatMessage
  allMessages: ChatMessage[]
  currentUser: ChatUser
  onClose: () => void
  onReply?: (msg: ChatMessage) => void
}

function getInitials(name: string) { return name.charAt(0).toUpperCase() }

function isReplyTo(msg: ChatMessage, rootId: string): boolean {
  // A message is a reply to rootId if its content contains the root message's reply marker
  return msg.content.includes(`↩️ בתגובה ל`) &&
    !msg.content.startsWith(`[voice:`)
}

export function MessageThread({ rootMessage, allMessages, currentUser, onClose, onReply }: MessageThreadProps) {
  // Find messages that are direct replies to rootMessage (within 4 hours, same user or @mention)
  const replies = useMemo(() => {
    const rootTime = new Date(rootMessage.created_at).getTime()
    const fourHours = 4 * 60 * 60 * 1000

    return allMessages.filter(m => {
      if (m.id === rootMessage.id) return false
      const msgTime = new Date(m.created_at).getTime()
      if (msgTime < rootTime || msgTime - rootTime > fourHours) return false
      // Check if it's a reply to this message
      if (m.content.startsWith('↩️ בתגובה ל')) {
        const nameMatch = m.content.match(/^↩️ בתגובה ל(.+?):/)
        if (nameMatch && rootMessage.user?.name && nameMatch[1] === rootMessage.user.name) return true
      }
      // Check @mention of original author
      if (rootMessage.user?.name && m.content.includes(`@${rootMessage.user.name}`)) return true
      return false
    }).slice(0, 20)
  }, [allMessages, rootMessage])

  const totalReplies = replies.length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="bg-background border-r border-border/60 shadow-2xl w-full max-w-sm h-full flex flex-col animate-in slide-in-from-right-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">תשובות ({totalReplies})</h3>
          </div>
          <button onClick={onClose} className="mr-auto p-1 hover:bg-muted rounded-full transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Root message */}
        <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase">הודעה מקורית</p>
          <div className="flex gap-2.5">
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: rootMessage.user?.avatar_color || '#06b6d4' }}
            >
              {rootMessage.user?.name ? getInitials(rootMessage.user.name) : '?'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold">{rootMessage.user?.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatTime(rootMessage.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed line-clamp-4 text-muted-foreground">
                {rootMessage.content.startsWith('[voice:') ? '🎤 הודעת קול' : rootMessage.content.slice(0, 200)}
              </p>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Reply className="w-8 h-8 opacity-30" />
              <p className="text-sm">אין תשובות עדיין</p>
              <p className="text-xs text-center">לחץ על "השב" מתחת להודעה כדי להגיב</p>
            </div>
          ) : (
            replies.map(reply => {
              const isOwn = reply.user_id === currentUser.id
              return (
                <div key={reply.id} className="flex gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: reply.user?.avatar_color || '#8b5cf6' }}
                  >
                    {reply.user?.name ? getInitials(reply.user.name) : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{reply.user?.name}</span>
                      {isOwn && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">אתה</span>}
                      <span className="text-[10px] text-muted-foreground mr-auto">{formatTime(reply.created_at)}</span>
                    </div>
                    <div className="bg-muted/50 rounded-xl px-3 py-2">
                      <p className="text-sm leading-relaxed">
                        {reply.content.startsWith('[voice:') ? '🎤 הודעת קול' : reply.content.replace(/^↩️ בתגובה ל.+?\n/, '')}
                      </p>
                    </div>
                    {(reply.reactions || []).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {[...new Set((reply.reactions || []).map(r => r.emoji))].slice(0, 5).map(e => (
                          <span key={e} className="text-sm">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Reply CTA */}
        <div className="px-4 py-3 border-t border-border/30">
          <button
            onClick={() => { onReply?.(rootMessage); onClose() }}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl py-2.5 text-sm font-medium hover:bg-primary/20 transition"
          >
            <Reply className="w-4 h-4" />
            השב להודעה
          </button>
        </div>
      </div>
    </div>
  )
}

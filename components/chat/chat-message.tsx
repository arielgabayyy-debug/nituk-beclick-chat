"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { UserBadge } from './user-badge'
import { Pin, Trash2, Reply, Copy, Check, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage as ChatMessageType, ChatUser, MessageReaction } from '@/lib/chat-types'
import { REACTION_EMOJIS, formatTime } from '@/lib/chat-types'

interface ChatMessageProps {
  message: ChatMessageType
  currentUser?: ChatUser
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string, isPinned: boolean) => void
  onReact?: (messageId: string, emoji: string) => void
  onUserClick?: (user: ChatUser) => void
  onReply?: (message: ChatMessageType) => void
  searchQuery?: string
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

function groupReactions(reactions: MessageReaction[]): { emoji: string; count: number; userIds: string[] }[] {
  const grouped: Record<string, { count: number; userIds: string[] }> = {}
  reactions.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userIds: [] }
    grouped[r.emoji].count++
    grouped[r.emoji].userIds.push(r.user_id)
  })
  return Object.entries(grouped).map(([emoji, data]) => ({ emoji, ...data }))
}

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i
const URL_REGEX = /(https?:\/\/[^\s]+)/g

function renderMessageContent(content: string, searchQuery?: string): React.ReactNode {
  // Collect image URLs
  const imageUrls: string[] = []
  const urlMatches = content.match(URL_REGEX) || []
  urlMatches.forEach(url => {
    if (IMAGE_EXTENSIONS.test(url)) imageUrls.push(url)
  })

  // Split content into tokens: bold, mention, url, plain text
  // Process in one pass using a combined regex
  const tokenRegex = /(\*\*(.+?)\*\*)|(@\S+)|(https?:\/\/[^\s]+)/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(content)) !== null) {
    const [full, boldFull, boldInner, mention, url] = match
    const start = match.index

    // Plain text before this match
    if (start > lastIndex) {
      nodes.push(highlightSearch(content.slice(lastIndex, start), searchQuery, `plain-${lastIndex}`))
    }

    if (boldFull && boldInner) {
      nodes.push(
        <strong key={`bold-${start}`}>{highlightSearch(boldInner, searchQuery, `bold-inner-${start}`)}</strong>
      )
    } else if (mention) {
      nodes.push(
        <span key={`mention-${start}`} className="mention-tag">{mention}</span>
      )
    } else if (url) {
      const isImage = IMAGE_EXTENSIONS.test(url)
      if (!isImage) {
        nodes.push(
          <a
            key={`url-${start}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-600 hover:text-cyan-700 break-all"
          >
            {highlightSearch(url, searchQuery, `url-text-${start}`)}
          </a>
        )
      } else {
        // Image URLs - render inline text as link, image shown below
        nodes.push(
          <a
            key={`url-${start}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-600 hover:text-cyan-700 break-all"
          >
            {highlightSearch(url, searchQuery, `img-url-text-${start}`)}
          </a>
        )
      }
    }

    lastIndex = start + full.length
  }

  // Remaining plain text
  if (lastIndex < content.length) {
    nodes.push(highlightSearch(content.slice(lastIndex), searchQuery, `plain-end-${lastIndex}`))
  }

  return (
    <>
      <p className="whitespace-pre-wrap break-words">{nodes}</p>
      {/* Inline image previews */}
      {imageUrls.map((imgUrl, i) => (
        <a key={`img-${i}`} href={imgUrl} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt="תמונה מהצ׳אט"
            className="mt-2 rounded-xl max-w-[300px] max-h-[300px] object-cover border border-border/40 shadow-sm hover:opacity-90 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </a>
      ))}
    </>
  )
}

function highlightSearch(text: string, searchQuery: string | undefined, key: string): React.ReactNode {
  if (!searchQuery || !text) return <span key={key}>{text}</span>
  const lowerText = text.toLowerCase()
  const lowerQuery = searchQuery.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return <span key={key}>{text}</span>

  return (
    <span key={key}>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + searchQuery.length)}</mark>
      {text.slice(idx + searchQuery.length)}
    </span>
  )
}

export function ChatMessageComponent({
  message,
  currentUser,
  onDelete,
  onPin,
  onReact,
  onUserClick,
  onReply,
  searchQuery
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [copied, setCopied] = useState(false)
  const isOwn = message.user_id === currentUser?.id
  const isAdmin = currentUser?.user_type === 'admin'
  const user = message.user as ChatUser | undefined
  const groupedReactions = groupReactions(message.reactions || [])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReport = () => {
    alert('הודעה דווחה למנהל')
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-3 group relative px-1 py-0.5 rounded-2xl transition-all message-enter",
        isOwn && "flex-row-reverse",
        message.is_pinned && "bg-amber-500/5 rounded-xl p-2 -mx-2 border border-amber-500/20"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false) }}
    >
      {/* Pinned indicator */}
      {message.is_pinned && (
        <div className="absolute -top-1 right-2 bg-amber-500 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pin className="w-3 h-3" /> נעוץ
        </div>
      )}

      {/* Avatar */}
      <button
        onClick={() => user && onUserClick?.(user)}
        className="w-10 h-10 rounded-full shrink-0 transition-transform hover:scale-105 shadow-lg cursor-pointer hover:ring-2 hover:ring-primary/50 overflow-hidden"
        style={{
          backgroundColor: user?.avatar_color || '#06b6d4',
          boxShadow: `0 4px 14px ${user?.avatar_color || '#06b6d4'}50`
        }}
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-sm font-bold text-white">
            {user ? getInitials(user.name) : '?'}
          </span>
        )}
      </button>

      {/* Message content */}
      <div className={cn("flex flex-col max-w-[78%]", isOwn && "items-end")}>
        {/* User info */}
        <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
          <button
            onClick={() => user && onUserClick?.(user)}
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {user?.name || 'משתמש'}
          </button>
          {user && <UserBadge userType={user.user_type} />}
          <span className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</span>
        </div>

        {/* Bubble */}
        <div className={cn(
          "relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed group/bubble",
          isOwn
            ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-tr-sm shadow-lg shadow-cyan-500/20"
            : "bg-white dark:bg-muted border border-border/60 rounded-tl-sm shadow-sm",
        )}>
          {/* GIF */}
          {message.has_gif && message.gif_url && (
            <img src={message.gif_url} alt="gif" className="rounded-xl max-w-[240px] mb-2" />
          )}

          {renderMessageContent(message.content, searchQuery)}

          {/* Copy button on hover */}
          <button
            onClick={handleCopy}
            className={cn(
              "absolute -top-2 opacity-0 group-hover/bubble:opacity-100 transition-all",
              "bg-white dark:bg-muted border border-border/60 rounded-full p-1 shadow-sm",
              isOwn ? "-left-2" : "-right-2"
            )}
          >
            {copied
              ? <Check className="w-3 h-3 text-emerald-500" />
              : <Copy className="w-3 h-3 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Reactions */}
        {groupedReactions.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1.5", isOwn && "justify-end")}>
            {groupedReactions.map(({ emoji, count, userIds }) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                  "bg-white dark:bg-muted border border-border/50 shadow-sm hover:scale-105",
                  userIds.includes(currentUser?.id || '') && "border-primary/50 bg-primary/10"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={cn(
          "absolute -top-3 flex items-center gap-0.5 z-10",
          "bg-white dark:bg-muted border border-border/60 rounded-full px-1 py-0.5 shadow-lg",
          "animate-in fade-in zoom-in-95 duration-150",
          isOwn ? "left-12" : "right-12"
        )}>
          {/* Reactions */}
          <div className="relative">
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-all text-sm"
              onClick={() => setShowReactions(!showReactions)}
            >😊</button>

            {showReactions && (
              <div className={cn(
                "absolute top-full mt-1 z-50 flex gap-1 p-2 rounded-2xl bg-white border border-border/60 shadow-xl",
                "animate-in fade-in slide-in-from-top-2 duration-200",
                isOwn ? "right-0" : "left-0"
              )}>
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { onReact?.(message.id, emoji); setShowReactions(false) }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-xl transition-all hover:scale-125 text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-all"
            onClick={() => onReply?.(message)}
            title="השב להודעה"
          >
            <Reply className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {/* Report (for non-own messages) */}
          {!isOwn && (
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-full transition-all"
              onClick={handleReport}
              title="דווח על הודעה"
            >
              <Flag className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
            </button>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <>
              <button
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full transition-all",
                  message.is_pinned ? "bg-amber-500/20" : "hover:bg-muted"
                )}
                onClick={() => onPin?.(message.id, message.is_pinned || false)}
              >
                <Pin className={cn("w-3.5 h-3.5", message.is_pinned ? "text-amber-500" : "text-muted-foreground")} />
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-full transition-all"
                onClick={() => onDelete?.(message.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

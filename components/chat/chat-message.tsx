"use client"

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { UserBadge } from './user-badge'
import { Pin, Trash2, Reply, Copy, Check, Flag, Pencil, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage as ChatMessageType, ChatUser, MessageReaction } from '@/lib/chat-types'
import { REACTION_EMOJIS, formatTime } from '@/lib/chat-types'
import { VoiceMessage } from './voice-message'

interface ChatMessageProps {
  message: ChatMessageType
  currentUser?: ChatUser
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string, isPinned: boolean) => void
  onReact?: (messageId: string, emoji: string) => void
  onUserClick?: (user: ChatUser) => void
  onReply?: (message: ChatMessageType) => void
  onEdit?: (messageId: string, newContent: string) => void
  searchQuery?: string
  isBookmarked?: boolean
  onToggleBookmark?: (messageId: string) => void
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

interface HoverCardProps {
  user: ChatUser
  onOpenProfile: () => void
  onClose: () => void
}

function UserHoverCard({ user, onOpenProfile, onClose }: HoverCardProps) {
  return (
    <div
      className="absolute z-50 top-10 right-0 w-52 bg-white dark:bg-muted border border-border/60 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
      onMouseLeave={onClose}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full shrink-0 shadow-md overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: user.avatar_color || '#06b6d4' }}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-white">{getInitials(user.name)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{user.name}</p>
          <UserBadge userType={user.user_type} />
        </div>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground mb-3">
        <span>⭐ {(user as ChatUser & { points?: number }).points ?? 0} נקודות</span>
        <span>🏅 רמה {(user as ChatUser & { level?: number }).level ?? 1}</span>
      </div>
      <button
        onClick={() => { onOpenProfile(); onClose() }}
        className="w-full text-xs bg-primary text-primary-foreground rounded-lg py-1.5 hover:opacity-90 transition"
      >
        פתח פרופיל
      </button>
    </div>
  )
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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative my-2 group/code">
      <pre className="code-block bg-gray-900 dark:bg-black text-gray-100 rounded-xl px-4 py-3 overflow-x-auto text-xs font-mono leading-relaxed border border-border/40">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 left-2 opacity-0 group-hover/code:opacity-100 transition-all bg-white/10 hover:bg-white/20 text-white rounded-md p-1"
        title="העתק קוד"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

function renderMessageContent(content: string, searchQuery?: string, isOwn?: boolean): React.ReactNode {
  // Detect voice messages
  const voiceMatch = content.match(/^\[voice:(https?:\/\/[^\]]+):(\d+)\]$/)
  if (voiceMatch) {
    return <VoiceMessage url={voiceMatch[1]} duration={parseInt(voiceMatch[2])} isOwn={!!isOwn} />
  }

  // Handle triple backtick code blocks first
  const codeBlockRegex = /```([\s\S]*?)```/g
  const segments: { type: 'code' | 'inline' | 'text'; value: string }[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null

  while ((m = codeBlockRegex.exec(content)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ type: 'text', value: content.slice(lastIdx, m.index) })
    }
    segments.push({ type: 'code', value: m[1] })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIdx) })
  }

  const renderTextSegment = (text: string, segKey: string) => {
    // Handle inline code within text segments
    const inlineCodeRegex = /`([^`]+)`/g
    const inlineParts: React.ReactNode[] = []
    let inlineLastIdx = 0
    let im: RegExpExecArray | null
    while ((im = inlineCodeRegex.exec(text)) !== null) {
      if (im.index > inlineLastIdx) {
        inlineParts.push(renderInlineText(text.slice(inlineLastIdx, im.index), searchQuery, `${segKey}-plain-${inlineLastIdx}`))
      }
      inlineParts.push(
        <code key={`${segKey}-inline-${im.index}`} className="inline-code bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">
          {im[1]}
        </code>
      )
      inlineLastIdx = im.index + im[0].length
    }
    if (inlineLastIdx < text.length) {
      inlineParts.push(renderInlineText(text.slice(inlineLastIdx), searchQuery, `${segKey}-plain-end`))
    }
    return inlineParts
  }

  // Collect image URLs for preview
  const imageUrls: string[] = []
  const urlMatches = content.match(URL_REGEX) || []
  urlMatches.forEach(url => {
    if (IMAGE_EXTENSIONS.test(url)) imageUrls.push(url)
  })

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return <CodeBlock key={`code-${i}`} code={seg.value} />
        }
        return (
          <p key={`text-${i}`} className="whitespace-pre-wrap break-words">
            {renderTextSegment(seg.value, `seg-${i}`)}
          </p>
        )
      })}
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

function renderInlineText(content: string, searchQuery: string | undefined, keyPrefix: string): React.ReactNode {
  // Split content into tokens: bold, mention, url, plain text
  const tokenRegex = /(\*\*(.+?)\*\*)|(@\S+)|(https?:\/\/[^\s]+)/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(content)) !== null) {
    const [full, boldFull, boldInner, mention, url] = match
    const start = match.index

    if (start > lastIndex) {
      nodes.push(highlightSearch(content.slice(lastIndex, start), searchQuery, `${keyPrefix}-plain-${lastIndex}`))
    }

    if (boldFull && boldInner) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${start}`}>{highlightSearch(boldInner, searchQuery, `${keyPrefix}-bold-inner-${start}`)}</strong>
      )
    } else if (mention) {
      nodes.push(
        <span key={`${keyPrefix}-mention-${start}`} className="mention-tag">{mention}</span>
      )
    } else if (url) {
      const isImage = IMAGE_EXTENSIONS.test(url)
      nodes.push(
        <a
          key={`${keyPrefix}-url-${start}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-cyan-600 hover:text-cyan-700 break-all"
        >
          {highlightSearch(url, searchQuery, `${keyPrefix}-url-text-${start}`)}
        </a>
      )
      if (isImage) { /* image shown in preview block */ }
    }

    lastIndex = start + full.length
  }

  if (lastIndex < content.length) {
    nodes.push(highlightSearch(content.slice(lastIndex), searchQuery, `${keyPrefix}-plain-end`))
  }

  return <>{nodes}</>
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
  onEdit,
  searchQuery,
  isBookmarked,
  onToggleBookmark,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showHoverCard, setShowHoverCard] = useState(false)
  const hoverCardTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isOwn = message.user_id === currentUser?.id
  const isAdmin = currentUser?.user_type === 'admin'
  const user = message.user as ChatUser | undefined
  const groupedReactions = groupReactions(message.reactions || [])
  const isMentioned = !isOwn && currentUser && message.content.includes(`@${currentUser.name}`)

  const isEdited = message.updated_at && message.updated_at !== message.created_at

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReport = () => {
    alert('הודעה דווחה למנהל')
  }

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      onEdit?.(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleAvatarClick = () => {
    if (hoverCardTimeoutRef.current) clearTimeout(hoverCardTimeoutRef.current)
    setShowHoverCard(true)
  }

  const handleAvatarMouseLeave = () => {
    hoverCardTimeoutRef.current = setTimeout(() => setShowHoverCard(false), 200)
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-3 group relative px-1 py-0.5 rounded-2xl transition-all message-enter",
        isOwn && "flex-row-reverse",
        message.is_pinned && "bg-amber-500/5 rounded-xl p-2 -mx-2 border border-amber-500/20",
        isMentioned && "bg-cyan-500/5 rounded-xl px-2 py-1 -mx-2 border border-cyan-400/30"
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
      {/* Mention indicator */}
      {isMentioned && (
        <div className="absolute -top-1 left-2 bg-cyan-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          @ אוזכרת
        </div>
      )}

      {/* Avatar with presence ring */}
      <div className="relative shrink-0">
        <button
          onClick={handleAvatarClick}
          onMouseLeave={handleAvatarMouseLeave}
          className={cn(
            "w-10 h-10 rounded-full transition-transform hover:scale-105 shadow-lg cursor-pointer overflow-hidden",
            user?.is_online && "avatar-ring"
          )}
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
        {/* Online green dot */}
        {user?.is_online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
        )}
        {/* Hover card */}
        {showHoverCard && user && (
          <UserHoverCard
            user={user}
            onOpenProfile={() => onUserClick?.(user)}
            onClose={() => setShowHoverCard(false)}
          />
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex flex-col max-w-[78%]", isOwn && "items-end")}>
        {/* User info */}
        <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
          <button
            onClick={handleAvatarClick}
            onMouseLeave={handleAvatarMouseLeave}
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {user?.name || 'משתמש'}
          </button>
          {user && <UserBadge userType={user.user_type} />}
          <span className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</span>
          {isEdited && (
            <span className="text-[10px] text-muted-foreground italic">(נערך)</span>
          )}
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

          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-white/10 dark:bg-black/20 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/30 min-h-[60px]"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                  if (e.key === 'Escape') handleCancelEdit()
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="text-xs px-2 py-1 rounded-md bg-white/30 hover:bg-white/40 transition font-medium"
                >
                  שמור
                </button>
              </div>
            </div>
          ) : (
            renderMessageContent(message.content, searchQuery, isOwn)
          )}

          {/* Copy button on hover */}
          {!isEditing && (
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
          )}
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
      {showActions && !isEditing && (
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

          {/* Bookmark */}
          <button
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-full transition-all",
              isBookmarked ? "bg-amber-100 dark:bg-amber-900/30" : "hover:bg-muted"
            )}
            onClick={() => onToggleBookmark?.(message.id)}
            title={isBookmarked ? "הסר מסימניות" : "שמור הודעה"}
          >
            <Bookmark className={cn("w-3.5 h-3.5 transition-colors", isBookmarked ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
          </button>

          {/* Edit (own messages only) */}
          {isOwn && onEdit && (
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-all"
              onClick={() => { setEditContent(message.content); setIsEditing(true) }}
              title="ערוך הודעה"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

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

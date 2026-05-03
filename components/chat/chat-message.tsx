"use client"

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { UserBadge } from './user-badge'
import { Pin, Trash2, Reply, Copy, Check, Flag, Pencil, Bookmark, Forward, UserX, ThumbsUp, VolumeX, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage as ChatMessageType, ChatUser, MessageReaction } from '@/lib/chat-types'
import { REACTION_EMOJIS, formatTime } from '@/lib/chat-types'
import { VoiceMessage } from './voice-message'
import { LinkPreview } from './link-preview'
import { ImageLightbox } from './image-lightbox'
import { YoutubeEmbed, isYoutubeUrl } from './youtube-embed'
import { ReportDialog } from './report-dialog'
import { MessageTranslator } from './message-translator'

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
  onForward?: (content: string) => void
  onBanUser?: (userId: string, userName: string) => void
  isGrouped?: boolean
  onDoubleClick?: () => void
  onUpvote?: (messageId: string) => void
  currentUserUpvoted?: boolean
  isMuted?: boolean
  onToggleMute?: (userId: string) => void
  onDM?: (user: ChatUser) => void
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}

interface HoverCardProps {
  user: ChatUser
  onOpenProfile: () => void
  onClose: () => void
  onDM?: () => void
}

function UserHoverCard({ user, onOpenProfile, onClose, onDM }: HoverCardProps) {
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
          <UserBadge userType={user.user_type} joinedAt={user.created_at} userId={user.id} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
        <span>⭐ {(user as ChatUser & { points?: number }).points ?? 0}</span>
        <span>🏅 Lv.{(user as ChatUser & { level?: number }).level ?? 1}</span>
        {(user as ChatUser & { messages_count?: number }).messages_count ? (
          <span>💬 {(user as ChatUser & { messages_count?: number }).messages_count}</span>
        ) : null}
        {user.created_at && (() => {
          const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
          const label = days >= 365 ? `${Math.floor(days / 365)} שנה` : days >= 30 ? `${Math.floor(days / 30)} חודשים` : `${days} ימים`
          return <span>📅 {label}</span>
        })()}
      </div>
      {/* Status from localStorage */}
      {(() => {
        try {
          const s = JSON.parse(localStorage.getItem(`user_status_${user.id}`) || 'null')
          if (s) return <p className="text-xs text-muted-foreground mb-2">{s.emoji} {s.text}</p>
        } catch {}
        return null
      })()}
      <div className="flex gap-1.5">
        <button
          onClick={() => { onOpenProfile(); onClose() }}
          className="flex-1 text-xs bg-primary text-primary-foreground rounded-lg py-1.5 hover:opacity-90 transition"
        >
          פרופיל
        </button>
        {onDM && (
          <button
            onClick={() => { onDM(); onClose() }}
            className="flex-1 text-xs bg-muted text-muted-foreground rounded-lg py-1.5 hover:bg-muted/80 transition"
          >
            💬 DM
          </button>
        )}
      </div>
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

function renderMessageContent(content: string, searchQuery?: string, isOwn?: boolean, onImageClick?: (src: string) => void): React.ReactNode {
  // Detect voice messages
  const voiceMatch = content.match(/^\[voice:(https?:\/\/[^\]]+):(\d+)\]$/)
  if (voiceMatch) {
    return <VoiceMessage url={voiceMatch[1]} duration={parseInt(voiceMatch[2])} isOwn={!!isOwn} />
  }

  // Detect reply format: ↩️ בתגובה לName: "quoted..."\nactual message
  const replyMatch = content.match(/^↩️ בתגובה ל(.+?): "(.+?)"\n([\s\S]*)$/)
  if (replyMatch) {
    const [, replyToName, quotedText, actualMessage] = replyMatch
    return (
      <div>
        {/* Quote block */}
        <div className={`mb-1.5 rounded-lg px-2.5 py-1.5 border-r-2 ${isOwn ? 'border-white/40 bg-white/10' : 'border-primary/50 bg-primary/5'}`}>
          <p className={`text-[10px] font-semibold mb-0.5 ${isOwn ? 'text-white/70' : 'text-primary'}`}>↩️ {replyToName}</p>
          <p className={`text-xs leading-relaxed line-clamp-2 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>{quotedText}</p>
        </div>
        {/* Actual message */}
        {renderMessageContent(actualMessage.trim(), searchQuery, isOwn, onImageClick)}
      </div>
    )
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
    // Split by lines and handle markdown-like patterns per line
    const lines = text.split('\n')
    const parts: React.ReactNode[] = []

    lines.forEach((line, lineIdx) => {
      const lineKey = `${segKey}-line-${lineIdx}`

      // Heading: ## text
      if (/^#{1,3}\s+/.test(line)) {
        const level = line.match(/^(#{1,3})/)?.[1].length || 1
        const headText = line.replace(/^#{1,3}\s+/, '')
        const cls = level === 1 ? 'text-base font-bold' : level === 2 ? 'text-sm font-bold' : 'text-sm font-semibold'
        parts.push(<p key={lineKey} className={cls}>{renderInlineLine(headText, searchQuery, lineKey)}</p>)
        return
      }

      // Bullet list: - item or * item
      if (/^[-*]\s+/.test(line)) {
        const itemText = line.replace(/^[-*]\s+/, '')
        parts.push(
          <div key={lineKey} className="flex items-start gap-1.5 my-0.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
            <span>{renderInlineLine(itemText, searchQuery, lineKey)}</span>
          </div>
        )
        return
      }

      // Numbered list: 1. item
      if (/^\d+\.\s+/.test(line)) {
        const num = line.match(/^(\d+)\./)?.[1]
        const itemText = line.replace(/^\d+\.\s+/, '')
        parts.push(
          <div key={lineKey} className="flex items-start gap-1.5 my-0.5">
            <span className="shrink-0 opacity-60 text-xs font-mono min-w-[1.2rem]">{num}.</span>
            <span>{renderInlineLine(itemText, searchQuery, lineKey)}</span>
          </div>
        )
        return
      }

      // Horizontal rule: ---
      if (/^-{3,}$/.test(line.trim())) {
        parts.push(<hr key={lineKey} className="border-current opacity-20 my-1" />)
        return
      }

      // Quote: > text
      if (/^>\s+/.test(line)) {
        const qText = line.replace(/^>\s+/, '')
        parts.push(
          <div key={lineKey} className="border-r-2 border-current opacity-70 pr-2 my-0.5 italic text-xs">
            {renderInlineLine(qText, searchQuery, lineKey)}
          </div>
        )
        return
      }

      // Normal line — handle inline code
      const inlineCodeRegex = /`([^`]+)`/g
      const inlineParts: React.ReactNode[] = []
      let inlineLastIdx = 0
      let im: RegExpExecArray | null
      while ((im = inlineCodeRegex.exec(line)) !== null) {
        if (im.index > inlineLastIdx) {
          inlineParts.push(renderInlineText(line.slice(inlineLastIdx, im.index), searchQuery, `${lineKey}-plain-${inlineLastIdx}`))
        }
        inlineParts.push(
          <code key={`${lineKey}-inline-${im.index}`} className="inline-code bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">
            {im[1]}
          </code>
        )
        inlineLastIdx = im.index + im[0].length
      }
      if (inlineLastIdx < line.length) {
        inlineParts.push(renderInlineText(line.slice(inlineLastIdx), searchQuery, `${lineKey}-plain-end`))
      }
      if (inlineParts.length > 0 || line) {
        parts.push(<span key={lineKey} className="block">{inlineParts}</span>)
      }
    })

    return parts
  }

  const renderInlineLine = (text: string, sq: string | undefined, key: string): React.ReactNode => {
    return renderInlineText(text, sq, key)
  }

  // Collect image URLs and non-image URLs for preview
  const imageUrls: string[] = []
  const linkUrls: string[] = []
  const urlMatches = content.match(URL_REGEX) || []
  urlMatches.forEach(url => {
    if (IMAGE_EXTENSIONS.test(url)) { imageUrls.push(url) }
    else { linkUrls.push(url) }
  })

  // Check for YouTube URL first
  const youtubeUrl = linkUrls.find(u => isYoutubeUrl(u)) || null
  // Only show link preview for the first non-image, non-youtube URL
  const previewUrl = youtubeUrl ? null : (linkUrls[0] || null)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return <CodeBlock key={`code-${i}`} code={seg.value} />
        }
        return (
          <div key={`text-${i}`} className="break-words">
            {renderTextSegment(seg.value, `seg-${i}`)}
          </div>
        )
      })}
      {/* Inline image previews */}
      {imageUrls.map((imgUrl, i) => (
        <button
          key={`img-${i}`}
          type="button"
          onClick={() => onImageClick ? onImageClick(imgUrl) : window.open(imgUrl, '_blank')}
          className="block mt-2 rounded-xl overflow-hidden hover:opacity-90 transition-opacity cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt="תמונה מהצ׳אט"
            className="max-w-[300px] max-h-[300px] object-cover border border-border/40 shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </button>
      ))}
      {/* YouTube embed */}
      {youtubeUrl && <YoutubeEmbed url={youtubeUrl} isOwn={!!isOwn} />}
      {/* Link preview for first non-image, non-youtube URL */}
      {previewUrl && <LinkPreview url={previewUrl} isOwn={!!isOwn} />}
    </>
  )
}

// Provider links
const PROVIDER_LINKS: Record<string, { url: string; icon: string }> = {
  'פרטנר': { url: 'https://www.partner.co.il', icon: '🔴' },
  'סלקום': { url: 'https://www.cellcom.co.il', icon: '🔵' },
  'פלאפון': { url: 'https://www.pelephone.co.il', icon: '🟢' },
  'הוט מובייל': { url: 'https://www.hot.net.il', icon: '🟠' },
  'גולן טלקום': { url: 'https://www.golantelecom.co.il', icon: '🟡' },
  'רמי לוי': { url: 'https://www.ramilevi.co.il', icon: '🟣' },
  '019': { url: 'https://www.019.net.il', icon: '⚫' },
}

function renderInlineText(content: string, searchQuery: string | undefined, keyPrefix: string): React.ReactNode {
  // Split content into tokens: bold, mention, url, phone, provider, plain text
  // Israeli phone: 05X-XXXXXXX, 0X-XXXXXXX, +972-XX-XXXXXXX
  const tokenRegex = /(\*\*(.+?)\*\*)|(@\S+)|(https?:\/\/[^\s]+)|((?:\+972|0)[-\s]?(?:5[0-9]|[2-9])[-\s]?\d{7})/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(content)) !== null) {
    const [full, boldFull, boldInner, mention, url, phone] = match
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
    } else if (phone) {
      const tel = phone.replace(/[-\s]/g, '')
      nodes.push(
        <a
          key={`${keyPrefix}-phone-${start}`}
          href={`tel:${tel}`}
          className="underline text-emerald-600 hover:text-emerald-700 font-medium"
          dir="ltr"
        >
          📞 {phone}
        </a>
      )
    }

    lastIndex = start + full.length
  }

  if (lastIndex < content.length) {
    nodes.push(highlightSearch(content.slice(lastIndex), searchQuery, `${keyPrefix}-plain-end`))
  }

  return <>{nodes}</>
}

function highlightSearch(text: string, searchQuery: string | undefined, key: string): React.ReactNode {
  // Check for provider mentions first
  for (const [providerName, info] of Object.entries(PROVIDER_LINKS)) {
    const idx = text.indexOf(providerName)
    if (idx !== -1) {
      return (
        <span key={key}>
          {idx > 0 && highlightSearch(text.slice(0, idx), searchQuery, `${key}-pre`)}
          <a href={info.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium" title={`פתח אתר ${providerName}`}>
            <span>{info.icon}</span>{providerName}
          </a>
          {idx + providerName.length < text.length && highlightSearch(text.slice(idx + providerName.length), searchQuery, `${key}-post`)}
        </span>
      )
    }
  }

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
  onForward,
  onBanUser,
  isGrouped,
  onDoubleClick,
  onUpvote,
  currentUserUpvoted,
  isMuted,
  onToggleMute,
  onDM,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showHoverCard, setShowHoverCard] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [heartBurst, setHeartBurst] = useState(false)
  const hoverCardTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showTranslator, setShowTranslator] = useState(false)
  const [showDM, setShowDM] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    // Double-tap detection
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double tap → ❤️ react
      onReact?.(message.id, '❤️')
      setHeartBurst(true)
      setTimeout(() => setHeartBurst(false), 600)
    }
    lastTapRef.current = now
    // Long press → context menu
    longPressTimerRef.current = setTimeout(() => {
      setShowContextMenu(true)
      setShowActions(true)
      if ('vibrate' in navigator) navigator.vibrate(50)
    }, 600)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const dx = e.touches[0].clientX - touchStartXRef.current
    // Swipe right = reply (rtl layout, left swipe = reply for own messages)
    const swipeDir = isOwn ? -1 : 1
    const offset = Math.max(0, Math.min(60, dx * swipeDir))
    setSwipeOffset(offset)
  }
  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    if (swipeOffset > 40) onDoubleClick?.()
    setSwipeOffset(0)
    touchStartXRef.current = null
  }

  const handleTouchMoveCancel = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }
  const COLLAPSE_THRESHOLD = 300 // chars
  const isLong = !message.content.startsWith('[voice:') && message.content.length > COLLAPSE_THRESHOLD
  const displayContent = isLong && !expanded ? message.content.slice(0, COLLAPSE_THRESHOLD) + '…' : message.content

  const isOwn = message.user_id === currentUser?.id
  const isAdmin = currentUser?.user_type === 'admin'
  const user = message.user as ChatUser | undefined
  const groupedReactions = groupReactions(message.reactions || [])
  const isMentioned = !isOwn && currentUser && message.content.includes(`@${currentUser.name}`)
  const isDeal = !message.content.startsWith('[voice:') && /[₪%]|\d+\s*ש"ח|מבצע|חבילה|הנחה|עסקה|חינם|discount|sale/i.test(message.content)

  // Auto-detect message category
  type MsgCategory = { label: string; icon: string; color: string } | null
  const msgCategory: MsgCategory = (() => {
    if (message.content.startsWith('[voice:')) return null
    const c = message.content
    if (/\?|מה|איך|האם|למה|מתי|איפה|כמה|מי /i.test(c)) return { label: 'שאלה', icon: '❓', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
    if (/[₪%]|\d+\s*ש"ח|מבצע|חבילה|הנחה|עסקה|חינם/i.test(c)) return { label: 'עסקה', icon: '💰', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
    if (/עזרה|בעיה|לא עובד|תקוע|שגיאה|error|פיתרון|help/i.test(c)) return { label: 'עזרה', icon: '🆘', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' }
    if (/תודה|יישר כח|עזרת|מעולה|כל הכבוד|ברכות|מזל טוב/i.test(c)) return { label: 'הכרת תודה', icon: '🙏', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' }
    if (/סיפור|הצלחה|חסכתי|שדרגתי|עברתי|ניצחתי/i.test(c)) return { label: 'סיפור הצלחה', icon: '⭐', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
    if (/טיפ|עצה|המלצה|מומלץ|כדאי|tip|advice/i.test(c)) return { label: 'טיפ', icon: '💡', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' }
    return null
  })()

  const isEdited = message.updated_at && message.updated_at !== message.created_at

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#message-${message.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReport = () => {
    setShowReportDialog(true)
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

  // Muted user: show collapsed stub
  if (isMuted) {
    return (
      <div className={cn("flex gap-3 group relative px-1 py-1", isOwn && "flex-row-reverse")}>
        <div className="shrink-0 w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center">
          <VolumeX className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <div className={cn("flex items-center gap-2 opacity-40", isOwn && "flex-row-reverse")}>
          <span className="text-xs text-muted-foreground">{user?.name || 'משתמש'}</span>
          <span className="text-xs text-muted-foreground italic">הודעה מושתקת</span>
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => onToggleMute?.(message.user_id)}
          >הצג</button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-3 group relative px-1 rounded-2xl transition-all message-enter",
        isGrouped ? "py-0.5 mt-0.5" : "py-1.5 mt-1",
        isOwn && "flex-row-reverse",
        message.is_pinned && "bg-amber-500/5 rounded-xl p-2 -mx-2 border border-amber-500/20",
        isMentioned && "bg-cyan-500/5 rounded-xl px-2 py-1 -mx-2 border border-cyan-400/30",
        isDeal && !isOwn && "deal-message"
      )}
      onMouseEnter={() => setShowActions(true)}
      onDoubleClick={onDoubleClick}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false) }}
      onTouchStart={handleTouchStart}
      onTouchMove={e => { handleTouchMove(e); handleTouchMoveCancel() }}
      onTouchEnd={handleTouchEnd}
      style={swipeOffset > 0 ? { transform: `translateX(${isOwn ? -swipeOffset : swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s' : 'none' } : undefined}
    >
      {/* Heart burst on double-tap */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-5xl reaction-burst">❤️</span>
        </div>
      )}

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

      {/* Avatar with presence ring — hidden for grouped messages */}
      <div className={cn("relative shrink-0", isGrouped && "invisible w-10")}>
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
            onDM={!isOwn && currentUser ? () => { onDM?.(user) } : undefined}
          />
        )}
      </div>

      {/* Message content */}
      <div className={cn("flex flex-col max-w-[78%]", isOwn && "items-end")}>
        {/* User info — hidden for grouped messages */}
        <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse", isGrouped && "hidden")}>
          <button
            onClick={handleAvatarClick}
            onMouseLeave={handleAvatarMouseLeave}
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {user?.name || 'משתמש'}
          </button>
          {user && <UserBadge userType={user.user_type} joinedAt={user.created_at} userId={user.id} />}
          {user && user.level > 1 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-400/20">
              Lv.{user.level}
            </span>
          )}
          <span
            className="text-[10px] text-muted-foreground cursor-default"
            title={new Date(message.created_at).toLocaleString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          >{formatTime(message.created_at)}</span>
          {isEdited && (
            <span className="text-[10px] text-muted-foreground italic">(נערך)</span>
          )}
          {msgCategory && !isGrouped && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${msgCategory.color}`}>
              {msgCategory.icon} {msgCategory.label}
            </span>
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
            <>
              {renderMessageContent(displayContent, searchQuery, isOwn, setLightboxSrc)}
              {isLong && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className={`text-[11px] font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 transition ${isOwn ? 'text-white' : 'text-primary'}`}
                  >
                    {expanded ? 'הצג פחות ▲' : 'קרא עוד ▼'}
                  </button>
                  {expanded && (() => {
                    const words = message.content.split(/\s+/).length
                    const mins = Math.max(1, Math.round(words / 200))
                    return (
                      <span className={`text-[10px] opacity-60 ${isOwn ? 'text-white' : 'text-muted-foreground'}`}>
                        {words} מילים · ~{mins} דק׳ קריאה
                      </span>
                    )
                  })()}
                </div>
              )}
              {/* Translate button for long or non-Hebrew text */}
              {!message.content.startsWith('[voice:') && !message.has_gif && (
                <button
                  onClick={() => setShowTranslator(v => !v)}
                  className={`text-[10px] opacity-0 group-hover/bubble:opacity-60 hover:!opacity-100 transition mt-0.5 ${isOwn ? 'text-white' : 'text-muted-foreground'}`}
                  title="תרגם הודעה"
                >
                  🌐 תרגם
                </button>
              )}
              {showTranslator && (
                <MessageTranslator content={message.content} onClose={() => setShowTranslator(false)} />
              )}
            </>
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
            {groupedReactions.map(({ emoji, count, userIds }) => {
              const reacters = (message.reactions || [])
                .filter(r => r.emoji === emoji)
                .map(r => r.user?.name || 'מישהו')
                .join(', ')
              return (
                <button
                  key={emoji}
                  onClick={() => onReact?.(message.id, emoji)}
                  title={reacters}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                    "bg-white dark:bg-muted border border-border/50 shadow-sm hover:scale-105",
                    userIds.includes(currentUser?.id || '') && "border-primary/50 bg-primary/10"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground font-medium">{count}</span>
                </button>
              )
            })}
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
                    onClick={(e) => {
                      onReact?.(message.id, emoji)
                      setShowReactions(false)
                      // Burst animation on the clicked button
                      const el = e.currentTarget
                      el.classList.remove('reaction-burst')
                      void el.offsetWidth // reflow
                      el.classList.add('reaction-burst')
                    }}
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

          {/* Upvote/Helpful */}
          {!isOwn && onUpvote && !message.content.startsWith('[voice:') && (
            <button
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full transition-all gap-0.5",
                currentUserUpvoted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "hover:bg-muted text-muted-foreground"
              )}
              onClick={() => onUpvote(message.id)}
              title="סמן כמועיל"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mute user (for non-own messages) */}
          {!isOwn && onToggleMute && user && (
            <button
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full transition-all",
                isMuted ? "bg-orange-100 dark:bg-orange-900/30" : "hover:bg-muted"
              )}
              onClick={() => onToggleMute(message.user_id)}
              title={isMuted ? `הסר השתקה ל-${user.name}` : `השתק את ${user.name}`}
            >
              {isMuted
                ? <Volume2 className="w-3.5 h-3.5 text-orange-500" />
                : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>
          )}

          {/* WhatsApp share */}
          {!message.content.startsWith('[voice:') && (
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-green-50 rounded-full transition-all"
              onClick={() => {
                const text = encodeURIComponent(`${user?.name || 'משתמש'}: "${message.content.slice(0, 200)}"`)
                window.open(`https://wa.me/?text=${text}`, '_blank')
              }}
              title="שתף בוואצאפ"
            >
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          )}

          {/* Forward */}
          {onForward && !message.content.startsWith('[voice:') && (
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-full transition-all"
              onClick={() => onForward(`↪️ ${user?.name || 'משתמש'}: "${message.content.slice(0, 100)}${message.content.length > 100 ? '...' : ''}" `)}
              title="העבר הודעה"
            >
              <Forward className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

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
                title={message.is_pinned ? 'בטל נעיצה' : 'נעץ הודעה'}
              >
                <Pin className={cn("w-3.5 h-3.5", message.is_pinned ? "text-amber-500" : "text-muted-foreground")} />
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-full transition-all"
                onClick={() => onDelete?.(message.id)}
                title="מחק הודעה"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
              {/* Quick ban (only for non-own, non-admin messages) */}
              {!isOwn && user && onBanUser && (
                <button
                  className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-full transition-all"
                  onClick={() => {
                    if (window.confirm(`חסום את ${user.name}?`)) onBanUser(user.id, user.name)
                  }}
                  title={`חסום את ${user.name}`}
                >
                  <UserX className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}
    {/* Mobile long-press context menu */}
    {showContextMenu && (
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={() => setShowContextMenu(false)}>
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-4 animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{message.content.slice(0, 60)}{message.content.length > 60 ? '...' : ''}</p>
          {/* Quick reactions */}
          <div className="flex gap-3 justify-center mb-4">
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => { onReact?.(message.id, emoji); setShowContextMenu(false) }}
                className="text-2xl hover:scale-125 transition-transform active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { onReply?.(message); setShowContextMenu(false) }} className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl text-sm hover:bg-muted">
              <Reply className="w-4 h-4" /> השב
            </button>
            <button onClick={() => { navigator.clipboard.writeText(message.content); setShowContextMenu(false) }} className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl text-sm hover:bg-muted">
              <Copy className="w-4 h-4" /> העתק טקסט
            </button>
            <button onClick={() => { handleCopyLink(); setShowContextMenu(false) }} className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl text-sm hover:bg-muted">
              <Copy className="w-4 h-4" /> העתק קישור
            </button>
            <button onClick={() => { onToggleBookmark?.(message.id); setShowContextMenu(false) }} className={cn("flex items-center gap-2 p-3 rounded-xl text-sm", isBookmarked ? "bg-amber-100 text-amber-700" : "bg-muted/40 hover:bg-muted")}>
              <Bookmark className="w-4 h-4" /> {isBookmarked ? 'הסר שמירה' : 'שמור'}
            </button>
            {!isOwn && onToggleMute && user && (
              <button onClick={() => { onToggleMute(message.user_id); setShowContextMenu(false) }} className={cn("flex items-center gap-2 p-3 rounded-xl text-sm", isMuted ? "bg-orange-50 text-orange-600" : "bg-muted/40 hover:bg-muted")}>
                {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} {isMuted ? 'הסר השתקה' : 'השתק'}
              </button>
            )}
            {!isOwn && (
              <button onClick={() => { setShowReportDialog(true); setShowContextMenu(false) }} className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                <Flag className="w-4 h-4" /> דווח
              </button>
            )}
            {isOwn && onEdit && (
              <button onClick={() => { setEditContent(message.content); setIsEditing(true); setShowContextMenu(false) }} className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl text-sm hover:bg-muted">
                <Pencil className="w-4 h-4" /> ערוך
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    {showReportDialog && (
      <ReportDialog
        messageContent={message.content}
        userName={user?.name || 'משתמש'}
        onSubmit={(reason) => {
          // Store report in localStorage for now; admin can view later
          const reports = JSON.parse(localStorage.getItem('reported_messages') || '[]')
          reports.push({ messageId: message.id, reason, time: new Date().toISOString() })
          localStorage.setItem('reported_messages', JSON.stringify(reports.slice(-50)))
        }}
        onClose={() => setShowReportDialog(false)}
      />
    )}
  </>
  )
}

"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Smile, X, Reply, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { QUICK_EMOJIS } from '@/lib/chat-types'
import type { ChatMessage } from '@/lib/chat-types'

interface MentionUser {
  id: string
  name: string
  avatar_color: string
}

interface ChatInputProps {
  onSend: (message: string) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  disabled?: boolean
  placeholder?: string
  replyTo?: ChatMessage | null
  onCancelReply?: () => void
  onlineUsers?: MentionUser[]
}

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
  placeholder = "כתבו הודעה...",
  replyTo,
  onCancelReply,
  onlineUsers = []
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getMentionQuery = (text: string, cursorPos: number): string | null => {
    const before = text.slice(0, cursorPos)
    const match = before.match(/@(\w*)$/)
    return match ? match[1] : null
  }

  // ── Image upload ────────────────────────────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'שגיאה בהעלאה'); return }
      // Send image URL as message — the auto-preview will render it
      onSend(data.url)
    } catch {
      alert('שגיאה בהעלאת התמונה')
    } finally {
      setIsUploading(false)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled) return
    const finalMessage = replyTo
      ? `↩️ בתגובה ל${replyTo.user?.name || 'משתמש'}: "${replyTo.content.slice(0, 50)}${replyTo.content.length > 50 ? '...' : ''}"\n${message}`
      : message
    onSend(finalMessage)
    setMessage('')
    setShowEmojis(false)
    setMentionQuery(null)
    setMentionResults([])
    onTypingStop?.()
    onCancelReply?.()
  }

  const selectMention = (user: MentionUser) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const before = message.slice(0, cursorPos)
    const after = message.slice(cursorPos)
    // Replace @query with @name + space
    const newBefore = before.replace(/@\w*$/, `@${user.name} `)
    setMessage(newBefore + after)
    setMentionQuery(null)
    setMentionResults([])
    setTimeout(() => {
      textarea.focus()
      const newPos = newBefore.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(i => Math.min(i + 1, mentionResults.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectMention(mentionResults[selectedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setMentionQuery(null)
        setMentionResults([])
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.()
    }
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)
    onTypingStart?.()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTypingStop?.(), 2000)

    const cursorPos = e.target.selectionStart
    const query = getMentionQuery(val, cursorPos)
    if (query !== null) {
      setMentionQuery(query)
      const filtered = onlineUsers
        .filter(u => u.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
      setMentionResults(filtered)
      setSelectedMentionIndex(0)
    } else {
      setMentionQuery(null)
      setMentionResults([])
    }
  }, [onTypingStart, onTypingStop, onlineUsers])

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current) }
  }, [])

  // Focus on reply
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus()
  }, [replyTo])

  return (
    <div className="relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-2 animate-in slide-in-from-bottom-2 duration-200">
          <Reply className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">
              תגובה ל-{replyTo.user?.name || 'משתמש'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border border-border/60 rounded-2xl p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">אימוג׳ים מהירים</span>
            <button onClick={() => setShowEmojis(false)} className="hover:bg-muted rounded-full p-0.5 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap max-w-[240px]">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-all text-xl hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mention autocomplete dropdown */}
      {mentionResults.length > 0 && mentionQuery !== null && (
        <div className="absolute bottom-full mb-2 right-0 left-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className="rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
            style={{
              background: 'oklch(1 0 0 / 0.85)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">אזכור משתמש</span>
            </div>
            {mentionResults.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectMention(user)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-right",
                  idx === selectedMentionIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/60 text-foreground"
                )}
              >
                {/* Avatar circle */}
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold shadow"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">@{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input for image/camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={undefined}
        className="hidden"
        onChange={handleImageSelect}
      />

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Emoji */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-11 w-11 shrink-0 rounded-xl", showEmojis && "bg-primary/10 text-primary")}
          onClick={() => setShowEmojis(!showEmojis)}
        >
          <Smile className="w-5 h-5" />
        </Button>

        {/* Image upload */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          title="שלח תמונה מהגלריה או מצלמה"
        >
          {isUploading
            ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
            : <ImagePlus className="w-5 h-5" />
          }
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => onTypingStop?.()}
            placeholder={replyTo ? `השב ל-${replyTo.user?.name}...` : placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl px-4 py-3 text-sm",
              "bg-white border-2 border-border/50 shadow-sm",
              "focus:outline-none focus:border-primary/50",
              "placeholder:text-muted-foreground transition-all",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl transition-all",
            "bg-gradient-to-br from-cyan-500 to-purple-600",
            "hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Smile, X, Reply, ImagePlus, Loader2, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { QUICK_EMOJIS } from '@/lib/chat-types'
import type { ChatMessage } from '@/lib/chat-types'
import { VoiceRecorder } from './voice-recorder'

// Emoji shortcode map
const EMOJI_MAP: Record<string, string> = {
  fire: '🔥', heart: '❤️', thumbsup: '+1', thumbs_up: '👍', laugh: '😂', cry: '😢',
  wow: '😮', party: '🎉', clap: '👏', star: '⭐', check: '✅', x: '❌',
  rocket: '🚀', money: '💰', deal: '🛒', phone: '📱', sun: '☀️', moon: '🌙',
  eyes: '👀', think: '🤔', idea: '💡', warning: '⚠️', lock: '🔒', key: '🔑',
  crown: '👑', trophy: '🏆', muscle: '💪', ok: '👌', wave: '👋', pray: '🙏',
  smile: '😊', joy: '😂', wink: '😉', cool: '😎', angel: '😇', devil: '😈',
  shrug: '🤷', facepalm: '🤦', exploding_head: '🤯', zzz: '😴', sparkles: '✨',
}

const TEMPLATES_KEY = 'chat_message_templates'
const DEFAULT_TEMPLATES = [
  'חיפשתי ומצאתי עסקה מדהימה! 🔥',
  'מישהו יכול לעזור? יש לי שאלה על ',
  'שמעתם על המבצע של ? שווה לבדוק!',
  'תודה לכולם על העזרה! 🙏',
]

const SLASH_COMMANDS = [
  { cmd: '/shrug', desc: '¯\\_(ツ)_/¯' },
  { cmd: '/flip', desc: 'הפוך שולחן' },
  { cmd: '/unflip', desc: 'החזר שולחן' },
  { cmd: '/lenny', desc: '( ͡° ͜ʖ ͡°)' },
  { cmd: '/bear', desc: 'ʕ•ᴥ•ʔ' },
  { cmd: '/hi', desc: 'ברכה לכולם' },
  { cmd: '/deal', desc: 'הודעת עסקה' },
  { cmd: '/thanks', desc: 'תודה לכולם' },
  { cmd: '/joke', desc: 'בדיחה אקראית' },
  { cmd: '/tip', desc: 'טיפ חסכון' },
  { cmd: '/aitip', desc: 'טיפ AI חכם לחיסכון' },
  { cmd: '/poll', desc: 'צור סקר: /poll שאלה | א | ב' },
  { cmd: '/help', desc: 'רשימת פקודות' },
]

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
  forwardedContent?: string | null
  onClearForward?: () => void
}

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
  placeholder = "כתבו הודעה...",
  replyTo,
  onCancelReply,
  onlineUsers = [],
  forwardedContent,
  onClearForward,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [slowModeRemaining, setSlowModeRemaining] = useState(0)
  const [emojiQuery, setEmojiQuery] = useState<string | null>(null)
  const [emojiResults, setEmojiResults] = useState<{ name: string; emoji: string }[]>([])
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0)
  const [slashHints, setSlashHints] = useState<typeof SLASH_COMMANDS>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || 'null') || DEFAULT_TEMPLATES } catch { return DEFAULT_TEMPLATES }
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const slowModeTimerRef = useRef<NodeJS.Timeout | null>(null)

  const getMentionQuery = (text: string, cursorPos: number): string | null => {
    const before = text.slice(0, cursorPos)
    const match = before.match(/@(\w*)$/)
    return match ? match[1] : null
  }

  // Slow mode: check on mount and after sends
  const checkSlowMode = useCallback(() => {
    const seconds = parseInt(localStorage.getItem('slow_mode_seconds') || '0', 10)
    if (!seconds) { setSlowModeRemaining(0); return }
    const lastSent = parseInt(localStorage.getItem('slow_mode_last_sent') || '0', 10)
    const elapsed = Math.floor((Date.now() - lastSent) / 1000)
    const remaining = Math.max(0, seconds - elapsed)
    setSlowModeRemaining(remaining)
    if (remaining > 0) {
      if (slowModeTimerRef.current) clearInterval(slowModeTimerRef.current)
      slowModeTimerRef.current = setInterval(() => {
        setSlowModeRemaining(r => {
          if (r <= 1) { clearInterval(slowModeTimerRef.current!); return 0 }
          return r - 1
        })
      }, 1000)
    }
  }, [])

  useEffect(() => { checkSlowMode() }, [checkSlowMode])
  useEffect(() => () => { if (slowModeTimerRef.current) clearInterval(slowModeTimerRef.current) }, [])

  const handleVoiceSend = (url: string, dur: number) => {
    onSend(`[voice:${url}:${dur}]`)
  }

  // ── Image compression + upload ──────────────────────────────────────────
  const compressImage = async (file: File, maxDimension = 1200, quality = 0.85): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width <= maxDimension && height <= maxDimension) { resolve(file); return }
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio); height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      img.onerror = () => resolve(file)
      img.src = url
    })
  }

  const uploadImageFile = async (file: File) => {
    setIsUploading(true)
    try {
      // Compress large images before upload
      const compressed = file.type.startsWith('image/') && file.size > 500 * 1024
        ? await compressImage(file)
        : file
      const fd = new FormData()
      fd.append('file', compressed)
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'שגיאה בהעלאה'); return }
      onSend(data.url)
    } catch {
      alert('שגיאה בהעלאת התמונה')
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await uploadImageFile(file)
  }

  // Ctrl+V / paste image from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(i => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) await uploadImageFile(file)
    }
  }, [onSend])
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled || slowModeRemaining > 0) return
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
    localStorage.removeItem(DRAFT_KEY)
    // Record send time for slow mode
    localStorage.setItem('slow_mode_last_sent', Date.now().toString())
    checkSlowMode()
  }

  const selectEmoji = (name: string, emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const before = message.slice(0, cursorPos)
    const after = message.slice(cursorPos)
    const newBefore = before.replace(/:(\w+)$/, emoji + ' ')
    setMessage(newBefore + after)
    setEmojiQuery(null); setEmojiResults([])
    setTimeout(() => { textarea.focus(); const p = newBefore.length; textarea.setSelectionRange(p, p) }, 0)
  }

  const selectSlashCommand = (cmd: string) => {
    setMessage(cmd)
    setSlashHints([])
    setTimeout(() => textareaRef.current?.focus(), 0)
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
    // Emoji shortcode navigation
    if (emojiResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedEmojiIndex(i => Math.min(i + 1, emojiResults.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedEmojiIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const r = emojiResults[selectedEmojiIndex]; selectEmoji(r.name, r.emoji); return }
      if (e.key === 'Escape') { setEmojiQuery(null); setEmojiResults([]); return }
    }

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

    // Ctrl+B → bold, Ctrl+I → italic, Ctrl+` → code
    if ((e.ctrlKey || e.metaKey) && ['b', 'i'].includes(e.key.toLowerCase())) {
      e.preventDefault()
      const ta = textareaRef.current
      if (!ta) return
      const wrap = e.key.toLowerCase() === 'b' ? '**' : '_'
      const start = ta.selectionStart; const end = ta.selectionEnd
      const sel = message.slice(start, end) || 'טקסט'
      const newMsg = message.slice(0, start) + wrap + sel + wrap + message.slice(end)
      setMessage(newMsg)
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + wrap.length, start + wrap.length + sel.length) }, 0)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.()
    }
  }

  const getEmojiQuery = (text: string, cursorPos: number): string | null => {
    const before = text.slice(0, cursorPos)
    const match = before.match(/:(\w+)$/)
    return match ? match[1] : null
  }

  const getSlashQuery = (text: string): string | null => {
    if (text.startsWith('/') && !text.includes(' ')) return text
    return null
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)
    onTypingStart?.()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTypingStop?.(), 2000)

    const cursorPos = e.target.selectionStart

    // Mention autocomplete
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

    // Emoji shortcode autocomplete
    const eQuery = getEmojiQuery(val, cursorPos)
    if (eQuery && eQuery.length >= 2) {
      const matches = Object.entries(EMOJI_MAP)
        .filter(([name]) => name.includes(eQuery.toLowerCase()))
        .slice(0, 6)
        .map(([name, emoji]) => ({ name, emoji }))
      setEmojiQuery(eQuery)
      setEmojiResults(matches)
      setSelectedEmojiIndex(0)
    } else {
      setEmojiQuery(null)
      setEmojiResults([])
    }

    // Slash command hints
    const sQuery = getSlashQuery(val)
    if (sQuery) {
      const hints = SLASH_COMMANDS.filter(c => c.cmd.startsWith(sQuery)).slice(0, 5)
      setSlashHints(hints)
    } else {
      setSlashHints([])
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

  // Pre-fill on forward
  useEffect(() => {
    if (forwardedContent) {
      setMessage(forwardedContent)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [forwardedContent])

  // Auto-save draft
  const DRAFT_KEY = 'chat_input_draft'
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved && !forwardedContent) setMessage(saved)
  }, [])
  useEffect(() => {
    if (message) {
      localStorage.setItem(DRAFT_KEY, message)
    } else {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [message])

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

      {/* Emoji shortcode autocomplete */}
      {emojiResults.length > 0 && emojiQuery && (
        <div className="absolute bottom-full mb-2 right-0 left-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="rounded-2xl border border-border/60 shadow-2xl overflow-hidden bg-white dark:bg-muted backdrop-blur-lg">
            <div className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              :{emojiQuery} — אימוג׳י
            </div>
            {emojiResults.map((r, idx) => (
              <button
                key={r.name}
                type="button"
                onClick={() => selectEmoji(r.name, r.emoji)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-right",
                  idx === selectedEmojiIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                )}
              >
                <span className="text-lg">{r.emoji}</span>
                <span className="text-muted-foreground">:{r.name}:</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slash command hints */}
      {slashHints.length > 0 && (
        <div className="absolute bottom-full mb-2 right-0 left-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="rounded-2xl border border-border/60 shadow-2xl overflow-hidden bg-white dark:bg-muted backdrop-blur-lg">
            <div className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">פקודות</div>
            {slashHints.map(hint => (
              <button
                key={hint.cmd}
                type="button"
                onClick={() => selectSlashCommand(hint.cmd)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60 text-right transition-colors"
              >
                <span className="font-mono font-medium text-primary">{hint.cmd}</span>
                <span className="text-muted-foreground text-xs">{hint.desc}</span>
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

        {/* Voice recorder - show only when message is empty */}
        {!message && (
          <VoiceRecorder onSend={handleVoiceSend} disabled={disabled} />
        )}

        <div className="flex-1 relative">
          {/* Formatting toolbar - shown when message has content */}
          {message.length > 0 && (
            <div className="absolute -top-8 right-0 flex items-center gap-0.5 bg-white dark:bg-muted border border-border/50 rounded-lg px-1 py-0.5 shadow-sm z-10">
              {[
                { label: 'B', wrap: '**', title: 'מודגש (Ctrl+B)' },
                { label: 'I', wrap: '_', title: 'נטוי' },
                { label: '`', wrap: '`', title: 'קוד' },
                { label: '📋', wrap: '', title: 'תבניות שמורות', isTemplate: true },
              ].map(({ label, wrap, title, isTemplate }) => (
                <button
                  key={label}
                  type="button"
                  title={title}
                  onClick={() => {
                    if (isTemplate) { setShowTemplates(t => !t); return }
                    const ta = textareaRef.current
                    if (!ta) return
                    const start = ta.selectionStart; const end = ta.selectionEnd
                    const sel = message.slice(start, end)
                    const newMsg = message.slice(0, start) + wrap + (sel || 'טקסט') + wrap + message.slice(end)
                    setMessage(newMsg)
                    setTimeout(() => { ta.focus(); const p = start + wrap.length; ta.setSelectionRange(p, p + (sel || 'טקסט').length) }, 0)
                  }}
                  className={`w-6 h-6 text-[11px] hover:bg-muted rounded flex items-center justify-center transition ${label === 'B' ? 'font-black' : label === 'I' ? 'italic font-medium' : label === '📋' ? 'text-base' : 'font-mono'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {/* Templates dropdown */}
          {showTemplates && (
            <div className="absolute -top-36 right-0 z-50 bg-white dark:bg-muted border border-border/50 rounded-xl shadow-xl p-2 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
              <p className="text-[10px] text-muted-foreground font-semibold px-2 mb-1.5 uppercase">תבניות הודעה</p>
              {templates.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setMessage(t); setShowTemplates(false); setTimeout(() => textareaRef.current?.focus(), 0) }}
                  className="w-full text-right text-xs px-2 py-1.5 hover:bg-muted/60 rounded-lg truncate transition"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => onTypingStop?.()}
            onPaste={handlePaste}
            dir={/^[֐-׿יִ-ﭏ\s\d!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(message.slice(0, 3)) ? 'rtl' : message.length > 2 ? 'ltr' : 'auto'}
            placeholder={replyTo ? `השב ל-${replyTo.user?.name}...` : placeholder}
            disabled={disabled}
            rows={1}
            maxLength={1000}
            className={cn(
              "w-full resize-none rounded-2xl px-4 py-3 text-sm",
              "bg-white border-2 border-border/50 shadow-sm",
              "focus:outline-none focus:border-primary/50",
              "placeholder:text-muted-foreground transition-all",
              disabled && "opacity-50 cursor-not-allowed",
              message.length > 800 && "border-orange-300 focus:border-orange-400"
            )}
          />
          {/* Character counter */}
          {message.length > 200 && (
            <span className={cn(
              "absolute bottom-2 left-3 text-[10px] font-mono transition-colors",
              message.length > 800 ? "text-red-500" : message.length > 500 ? "text-orange-500" : "text-muted-foreground"
            )}>
              {message.length}/1000
            </span>
          )}
        </div>

        {slowModeRemaining > 0 ? (
          <div className="h-11 w-11 shrink-0 rounded-xl bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 flex flex-col items-center justify-center" title={`מצב איטי: המתן ${slowModeRemaining} שניות`}>
            <Timer className="w-3.5 h-3.5 text-orange-500 mb-0.5" />
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 leading-none">{slowModeRemaining}</span>
          </div>
        ) : (
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
        )}
      </form>
    </div>
  )
}

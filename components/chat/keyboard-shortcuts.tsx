"use client"

import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onSearch: () => void
  onEscape: () => void
  onEditLastMessage?: () => void
  onShowShortcuts?: () => void
  onReactToLast?: (emoji: string) => void
  onScrollToBottom?: () => void
  onToggleFocusMode?: () => void
}

const REACTION_KEYS = ['1', '2', '3', '4', '5', '6']
const REACTION_EMOJIS_MAP: Record<string, string> = {
  '1': '👍', '2': '❤️', '3': '😂', '4': '😮', '5': '😢', '6': '🔥'
}

export function KeyboardShortcuts({
  onSearch, onEscape, onEditLastMessage, onShowShortcuts,
  onReactToLast, onScrollToBottom, onToggleFocusMode,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA'

      // Ctrl+F or Cmd+F → search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); onSearch(); return
      }

      // Ctrl+End → scroll to bottom
      if ((e.ctrlKey || e.metaKey) && e.key === 'End') {
        e.preventDefault(); onScrollToBottom?.(); return
      }

      // Ctrl+Shift+F → focus mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault(); onToggleFocusMode?.(); return
      }

      // Escape → close search/reply/modal
      if (e.key === 'Escape') { onEscape(); return }

      // ? when not in input → show shortcuts
      if (e.key === '?' && !inInput) {
        e.preventDefault(); onShowShortcuts?.(); return
      }

      // Up arrow when input empty → edit last message
      if (e.key === 'ArrowUp' && inInput) {
        const ta = e.target as HTMLTextAreaElement
        if (ta.value === '' || ta.selectionStart === 0) {
          e.preventDefault(); onEditLastMessage?.()
        }
      }

      // 1-6 when not in input → react to last message
      if (!inInput && !e.ctrlKey && !e.metaKey && !e.altKey && REACTION_KEYS.includes(e.key)) {
        e.preventDefault()
        onReactToLast?.(REACTION_EMOJIS_MAP[e.key])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSearch, onEscape, onEditLastMessage, onShowShortcuts, onReactToLast, onScrollToBottom, onToggleFocusMode])

  return null
}

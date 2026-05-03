"use client"

import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onSearch: () => void
  onEscape: () => void
  onEditLastMessage?: () => void
  onShowShortcuts?: () => void
}

export function KeyboardShortcuts({ onSearch, onEscape, onEditLastMessage, onShowShortcuts }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA'

      // Ctrl+F or Cmd+F → search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        onSearch()
        return
      }

      // Escape → close search/reply/modal
      if (e.key === 'Escape') {
        onEscape()
        return
      }

      // ? when not in input → show shortcuts
      if (e.key === '?' && !inInput) {
        e.preventDefault()
        onShowShortcuts?.()
        return
      }

      // Up arrow when input is empty → edit last message
      if (e.key === 'ArrowUp' && inInput) {
        const ta = e.target as HTMLTextAreaElement
        if (ta.value === '' || ta.selectionStart === 0) {
          e.preventDefault()
          onEditLastMessage?.()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSearch, onEscape, onEditLastMessage, onShowShortcuts])

  return null
}

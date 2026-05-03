"use client"

import { useState } from 'react'
import { Star, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { ChatMessage } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

interface Story {
  id: string
  userName: string
  avatarColor: string
  text: string
  savings: number
  time: string
}

// Stories detected from messages that mention savings
function extractStories(messages: ChatMessage[]): Story[] {
  const savingsRegex = /חסכתי[^.!?]*?(\d+)\s*₪/gi
  const stories: Story[] = []

  messages.forEach(m => {
    if (!m.user || m.content.length < 20) return
    const match = savingsRegex.exec(m.content)
    savingsRegex.lastIndex = 0
    if (match && parseInt(match[1]) > 20) {
      stories.push({
        id: m.id,
        userName: m.user.name,
        avatarColor: m.user.avatar_color,
        text: m.content.slice(0, 120),
        savings: parseInt(match[1]),
        time: m.created_at,
      })
    }
  })

  return stories.sort((a, b) => b.savings - a.savings).slice(0, 5)
}

interface SuccessStoriesFeedProps {
  messages: ChatMessage[]
  onShareStory?: (text: string) => void
}

export function SuccessStoriesFeed({ messages, onShareStory }: SuccessStoriesFeedProps) {
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [savings, setSavings] = useState('')

  const stories = extractStories(messages)
  const totalSaved = stories.reduce((s, story) => s + story.savings, 0)

  const handleShare = () => {
    if (!storyText.trim()) return
    const text = savings
      ? `⭐ סיפור הצלחה: ${storyText} חסכתי ${savings}₪! 🎉`
      : `⭐ ${storyText}`
    onShareStory?.(text)
    setStoryText(''); setSavings(''); setShowForm(false)
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-400/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition"
      >
        <Star className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold">סיפורי הצלחה</p>
          {totalSaved > 0 && <p className="text-xs text-amber-600">הקהילה חסכה {totalSaved.toLocaleString()}₪ לאחרונה</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-amber-400/20">
          {stories.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground">
              <Star className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs">היה הראשון לשתף סיפור הצלחה!</p>
            </div>
          ) : (
            <div className="divide-y divide-amber-400/10">
              {stories.map(story => (
                <div key={story.id} className="px-4 py-3 flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: story.avatarColor }}
                  >
                    {story.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold">{story.userName}</span>
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 rounded-full font-bold">
                        חסך {story.savings}₪
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{story.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(story.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Share your story */}
          {!showForm ? (
            <div className="px-4 py-3 border-t border-amber-400/10">
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 text-xs text-amber-600 hover:text-amber-700 transition border border-dashed border-amber-400/40 rounded-lg py-2 hover:bg-amber-500/5"
              >
                <Plus className="w-3.5 h-3.5" /> שתף את הסיפור שלך
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-amber-400/10 space-y-2">
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                placeholder="ספר לקהילה איך חסכת..."
                rows={3}
                className="w-full text-sm bg-background border border-amber-300/50 rounded-lg px-3 py-2 focus:outline-none resize-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={savings}
                  onChange={e => setSavings(e.target.value)}
                  placeholder="כמה ₪ חסכת?"
                  className="w-28 text-sm bg-background border border-amber-300/50 rounded-lg px-2 py-1.5 focus:outline-none"
                />
                <button onClick={handleShare} className="flex-1 bg-amber-500 text-white text-xs rounded-lg py-2 hover:bg-amber-600 transition font-medium">
                  שתף! ⭐
                </button>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

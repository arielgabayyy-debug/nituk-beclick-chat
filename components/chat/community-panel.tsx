"use client"

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendingKeywords } from './trending-keywords'
import { HotMessages } from './hot-messages'
import { CommunityFAQ } from './community-faq'
import { ChatStats } from './chat-stats'
import { ReactionLeaderboard } from './reaction-leaderboard'
import { ProviderComparison } from './provider-comparison'
import { Icebreaker } from './icebreaker'
import { ActivityFeed } from './activity-feed'
import { SuccessStoriesFeed } from './success-stories-feed'
import { MyStats } from './my-stats'
import { SavingsCalculator } from './savings-calculator'
import { CommunityChallenge } from './community-challenge'
import { UserOfWeekWidget } from './user-of-week'
import type { ChatUser, ChatMessage } from '@/lib/chat-types'

interface CommunityPanelProps {
  messages: ChatMessage[]
  onlineUsers: ChatUser[]
  currentUser: ChatUser
  onClose: () => void
  onSearch: (query: string) => void
  onJumpToMessage: (id: string) => void
  onSendMessage: (content: string) => void
  onShareDeal: (text: string) => void
  onViewProfile: (user: ChatUser) => void
  onShowPriceAlerts: () => void
}

export function CommunityPanel({
  messages,
  onlineUsers,
  currentUser,
  onClose,
  onSearch,
  onJumpToMessage,
  onSendMessage,
  onShareDeal,
  onViewProfile,
  onShowPriceAlerts,
}: CommunityPanelProps) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const userMessagesThisWeek = messages.filter(
    m => m.user_id === currentUser.id && new Date(m.created_at).getTime() > weekAgo
  ).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex flex-col w-full h-full max-w-2xl mx-auto bg-white dark:bg-gray-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 sm:rounded-none sm:inset-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/30 backdrop-blur-sm shrink-0">
          <h2 className="font-bold text-lg">קהילה</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
          {/* Weekly challenge */}
          <CommunityChallenge userMessagesThisWeek={userMessagesThisWeek} />

          {/* My personal stats */}
          <MyStats messages={messages} currentUser={currentUser} />

          {/* Savings calculator */}
          <SavingsCalculator onShareSaving={onSendMessage} />

          {/* Trending keywords */}
          <TrendingKeywords
            messages={messages}
            onSearch={(kw) => { onSearch(kw); onClose() }}
          />

          {/* Hot messages */}
          <HotMessages
            messages={messages}
            onJumpToMessage={(id) => { onJumpToMessage(id); onClose() }}
          />

          {/* Activity feed */}
          <ActivityFeed messages={messages} onlineUsers={onlineUsers} />

          {/* Success stories */}
          <SuccessStoriesFeed messages={messages} onShareStory={onSendMessage} />

          {/* Reaction leaderboard */}
          <ReactionLeaderboard
            messages={messages}
            onJumpToMessage={(id) => { onJumpToMessage(id); onClose() }}
          />

          {/* Provider comparison */}
          <ProviderComparison onShareDeal={onShareDeal} />

          {/* Icebreaker */}
          <Icebreaker onAsk={onSendMessage} />

          {/* Chat statistics */}
          <ChatStats messages={messages} onlineUsers={onlineUsers} />

          {/* Community FAQ */}
          <CommunityFAQ />

          {/* User of the week */}
          <UserOfWeekWidget
            messages={messages}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            onViewProfile={(user) => { onViewProfile(user); onClose() }}
          />

          {/* Price alerts */}
          <button
            onClick={() => { onShowPriceAlerts(); onClose() }}
            className="w-full flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3 transition hover:bg-amber-500/15"
          >
            🔔 <span className="font-medium">התראות מחיר</span>
            <span className={cn("mr-auto text-muted-foreground")}>קבל עדכון על עסקאות ←</span>
          </button>
        </div>
      </div>
    </div>
  )
}

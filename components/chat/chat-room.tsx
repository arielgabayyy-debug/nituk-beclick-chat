"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSwipe } from '@/hooks/use-swipe'
import { Volume2, VolumeX, Bell, Users, Flame, Trophy, X, ChevronLeft, ChevronRight, Search, MessageCircle, ChevronDown, Bookmark, Download, ArrowUp, ArrowDown, Images, Keyboard, Maximize2, Minimize2, Star, Clock, Settings, Globe } from 'lucide-react'
import { ChatHeader } from './chat-header'
import { SmartSettingsPanel } from './smart-settings-panel'
import { ChatMessageComponent } from './chat-message'
import { ChatInput } from './chat-input'
import { OnlineUsers } from './online-users'
import { TypingIndicator } from './typing-indicator'
import { PinnedMessages } from './pinned-messages'
import { SystemMessageComponent } from './system-message'
import { Leaderboard } from './leaderboard'
import { PollCard, CreatePollForm } from './poll-card'
import { HotDeals } from './hot-deals'
import { DailyQuestionCard, DailyTipCard, UpcomingEventsCard } from './daily-widgets'
import { UserProfile } from './user-profile'
import { KeyboardShortcuts } from './keyboard-shortcuts'
import { WelcomeToast } from './welcome-toast'
import { Confetti } from './confetti'
import { useBookmarks, useMutedUsers, BookmarksPanel } from './message-bookmarks'
import { OfflineIndicator } from './offline-indicator'
import { ChatExport } from './chat-export'
import { CelebrationButton } from './celebration-button'
import { useNotificationCenter, NotificationCenter } from './notification-center'
import { PointsShop } from './points-shop'
import { AdvancedSearch } from './advanced-search'
import { useScheduledMessages, ScheduledMessagesPanel } from './scheduled-messages'
import { PriceAlertsPanel } from './price-alerts'
import { OnboardingChecklist } from './onboarding-checklist'
import { PWAInstallBanner } from './pwa-install'
import { MessageThread } from './message-thread'
import { DirectMessages } from './direct-messages'
import { Pinboard } from './pinboard'
import { ChatRulesCard } from './chat-rules'
import { QuickDeal } from './quick-deal'
import { CommunityPanel } from './community-panel'
import { trackMessageActivity } from './streak-calendar'
import { AnnouncementBar } from './announcement-bar'
import { AchievementToast } from './achievement-toast'
import { MessageSkeleton } from './message-skeleton'
import { ImageGallery } from './image-gallery'
import { ShortcutsModal } from './shortcuts-modal'
import { useNotificationPermission, NotificationBanner } from './notification-permission'
import { useChat } from '@/hooks/use-chat'
import { useCommunity } from '@/hooks/use-community'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatUser, SystemMessage, ChatMessage } from '@/lib/chat-types'

interface ChatRoomProps {
  currentUser: ChatUser
  onLogout: () => void
}

type SidebarTab = 'users' | 'leaderboard' | 'polls' | 'deals'
const MOBILE_PANELS_ORDER: Array<SidebarTab | null> = [null, 'leaderboard', 'deals', 'users']
type MobileTab = 'chat' | 'community' | 'deals' | 'profile'
const CHAT_PAGE_SIZE = 80

export function ChatRoom({ currentUser, onLogout }: ChatRoomProps) {
  const {
    messages,
    pinnedMessages,
    systemMessages,
    onlineUsers,
    typingUsers,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
    addReaction,
    startTyping,
    stopTyping,
    sendAnnouncement,
    banUser,
    upvoteMessage,
    markMessagesRead,
    unreadCount: dbUnreadCount,
    onlineCount
  } = useChat(currentUser)

  const {
    polls,
    hotDeals,
    dailyQuestion,
    dailyTip,
    upcomingEvents,
    leaderboard,
    userAchievements,
    votePoll,
    createPoll,
    shareDeal,
    voteDeal,
  } = useCommunity(currentUser)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // ── Visual Viewport: keep chat above keyboard on mobile ─────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const onResize = () => {
      const isKeyboardOpen = vv.height < window.innerHeight * 0.8
      if (isKeyboardOpen) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      }
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.3)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [announcementText, setAnnouncementText] = useState('')
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('users')
  const [showUserProfile, setShowUserProfile] = useState<ChatUser | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUserFilter, setSearchUserFilter] = useState('')
  const [showMentionsOnly, setShowMentionsOnly] = useState(false)
  const [searchResultIndex, setSearchResultIndex] = useState(0)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadSinceScroll, setUnreadSinceScroll] = useState(0)
  const [unreadMentions, setUnreadMentions] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<SidebarTab | null>(null)

  const mobilePanelSwipe = useSwipe({
    // RTL: swipe right = go forward (next panel), swipe left = go back (towards chat)
    onSwipeRight: () => setMobilePanel(p => {
      const idx = MOBILE_PANELS_ORDER.indexOf(p)
      return MOBILE_PANELS_ORDER[(idx + 1) % MOBILE_PANELS_ORDER.length]
    }),
    onSwipeLeft: () => setMobilePanel(p => {
      const idx = MOBILE_PANELS_ORDER.indexOf(p)
      return MOBILE_PANELS_ORDER[(idx - 1 + MOBILE_PANELS_ORDER.length) % MOBILE_PANELS_ORDER.length]
    }),
    onSwipeDown: () => setMobilePanel(null),
    threshold: 60,
  })
  const [showQuickDeal, setShowQuickDeal] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [showPointsShop, setShowPointsShop] = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [dmTarget, setDmTarget] = useState<ChatUser | null>(null)
  const [showPinboard, setShowPinboard] = useState(false)
  const [showPriceAlerts, setShowPriceAlerts] = useState(false)
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null)
  const [displayedCount, setDisplayedCount] = useState(80)
  const [showScheduled, setShowScheduled] = useState(false)
  const [showMobileTools, setShowMobileTools] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSmartSettings, setShowSmartSettings] = useState(false)
  const [showCommunityPanel, setShowCommunityPanel] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const { notifications, addNotification, markRead, markAllRead, clearAll: clearNotifications, unreadCount } = useNotificationCenter()
  const sendMessageRef = useRef<(content: string) => void>(() => {})
  const { scheduled, schedule: scheduleMessage, cancel: cancelScheduled, pendingCount: scheduledCount } = useScheduledMessages(useCallback((content: string) => sendMessageRef.current(content), []))
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null)
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  const { permission, sendNotification } = useNotificationPermission()
  const [forwardedContent, setForwardedContent] = useState<string | null>(null)
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks()
  const { toggleMute, isMuted } = useMutedUsers()
  const prevMessagesLengthRef = useRef(messages.length)

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80
    setIsAtBottom(atBottom)
    if (atBottom) {
      setUnreadSinceScroll(0)
      markMessagesRead()
    }
  }, [markMessagesRead])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    } else if (messages.length > prevMessagesLengthRef.current && !isAtBottom) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.user_id !== currentUser.id) {
        setUnreadSinceScroll(c => c + 1)
      }
    }
  }, [messages, isAtBottom, currentUser.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setUnreadSinceScroll(0)
    setIsAtBottom(true)
    markMessagesRead()
  }

  // Play sound on new message (not own) and track prev length
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && soundEnabled) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.user_id !== currentUser.id) {
        const isMention = lastMessage.content.includes(`@${currentUser.name}`)
        const audio = new Audio('/notification.mp3')
        audio.volume = isMention ? Math.min(soundVolume * 2, 1) : soundVolume
        // Browser notification + vibration for @mention (only if permission granted)
        if (isMention && permission === 'granted') {
          sendNotification(
            `${lastMessage.user?.name || 'מישהו'} אזכר אותך`,
            lastMessage.content.slice(0, 100)
          )
          if ('vibrate' in navigator) navigator.vibrate([100, 50, 100])
        }
        // Speed up for mention (higher pitch feel)
        if (isMention && 'playbackRate' in audio) audio.playbackRate = 1.5
        audio.play().catch(() => {})
        // In-app notification
        if (isMention) {
          addNotification({
            type: 'mention',
            title: `${lastMessage.user?.name || 'מישהו'} אזכר אותך`,
            body: lastMessage.content.slice(0, 100),
            messageId: lastMessage.id,
          })
          setUnreadMentions(c => c + 1)
        }
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages, currentUser.id, currentUser.name, soundEnabled, addNotification])

  // Show notification permission banner after 30s if not granted
  useEffect(() => {
    if (permission === 'default' && !localStorage.getItem('notif_banner_dismissed')) {
      const t = setTimeout(() => setShowNotifBanner(true), 30000)
      return () => clearTimeout(t)
    }
  }, [permission])

  // Achievement confetti
  useEffect(() => {
    const handler = () => setShowConfetti(true)
    window.addEventListener('achievement_unlocked', handler)
    return () => window.removeEventListener('achievement_unlocked', handler)
  }, [])

  // Milestone celebrations
  useEffect(() => {
    const total = messages.length
    const milestones: Record<number, string> = {
      100: '🎉 100 הודעות בקהילה!',
      500: '🚀 500 הודעות — קהילה פעילה!',
      1000: '🏆 1,000 הודעות! מדהים!',
      5000: '🌟 5,000 הודעות — אגדה!',
    }
    if (milestones[total]) {
      const seenKey = `milestone_${total}`
      if (!localStorage.getItem(seenKey)) {
        localStorage.setItem(seenKey, '1')
        setMilestoneToast(milestones[total])
        setShowConfetti(true)
        setTimeout(() => setMilestoneToast(null), 6000)
      }
    }
  }, [messages.length])

  // Update browser tab title with unread count
  useEffect(() => {
    const base = 'חיבור וניתוק בקליק'
    if (unreadSinceScroll > 0) {
      document.title = `(${unreadSinceScroll}) ${base}`
    } else {
      document.title = base
    }
    return () => { document.title = base }
  }, [unreadSinceScroll])

  const jumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight-message')
      setTimeout(() => element.classList.remove('highlight-message'), 2000)
    }
  }

  const baseItems = [
    ...messages.map(m => ({ type: 'message' as const, data: m, time: new Date(m.created_at).getTime() })),
    ...systemMessages
      .filter(s => s.message_type === 'announcement')
      .map(s => ({ type: 'system' as const, data: s, time: new Date(s.created_at).getTime() }))
  ]
    .sort((a, b) => a.time - b.time)
    .filter(item => {
      if (item.type !== 'message') return !searchQuery.trim() && !showMentionsOnly
      const textMatch = !searchQuery.trim() || item.data.content.toLowerCase().includes(searchQuery.toLowerCase())
      const userMatch = !searchUserFilter || (item.data.user?.name || '').toLowerCase().includes(searchUserFilter.toLowerCase())
      const mentionMatch = !showMentionsOnly || item.data.content.includes(`@${currentUser.name}`)
      return textMatch && userMatch && mentionMatch
    })

  // Inject date separators between messages from different days
  const formatDateLabel = (ts: number) => {
    const d = new Date(ts)
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    d.setHours(0,0,0,0)
    if (d.getTime() === today.getTime()) return 'היום'
    if (d.getTime() === yesterday.getTime()) return 'אתמול'
    return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  type AllItem = (typeof baseItems)[0] | { type: 'date'; label: string; time: number }
  const allItemsFull: AllItem[] = []
  let lastDate = ''
  for (const item of baseItems) {
    const d = new Date(item.time); d.setHours(0,0,0,0)
    const dateKey = d.toISOString()
    if (dateKey !== lastDate) {
      allItemsFull.push({ type: 'date', label: formatDateLabel(item.time), time: item.time - 1 })
      lastDate = dateKey
    }
    allItemsFull.push(item)
  }

  // Lazy loading: show last PAGE_SIZE items, reveal more on scroll to top
  const PAGE_SIZE = 80
  const allItems = allItemsFull.slice(-displayedCount)
  const hasMore = allItemsFull.length > displayedCount

  const handleLoadMore = useCallback(() => {
    setDisplayedCount(c => Math.min(c + PAGE_SIZE, allItemsFull.length))
  }, [allItemsFull.length])

  // Reset lazy load when filter changes
  useEffect(() => {
    setDisplayedCount(80)
  }, [searchQuery, searchUserFilter, showMentionsOnly])

  const handleSendAnnouncement = () => {
    if (announcementText.trim()) {
      sendAnnouncement(announcementText)
      setAnnouncementText('')
      setShowAnnouncement(false)
    }
  }

  const handleUserClick = (user: ChatUser) => {
    setShowUserProfile(user)
  }

  // Export chat — opens modal
  const handleExportChat = () => setShowExport(true)

  // Confetti on first-ever message
  const handleSendMessage = useCallback((content: string) => {
    const key = `first_msg_${currentUser.id}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      setShowConfetti(true)
    }
    trackMessageActivity(currentUser.id)
    sendMessage(content)
  }, [currentUser.id, sendMessage])

  // Keep ref in sync for scheduled messages
  useEffect(() => { sendMessageRef.current = handleSendMessage }, [handleSendMessage])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) handleSendMessage(data.url)
    } catch {}
  }

  return (
    <div
      className="h-screen flex flex-col bg-gray-100/80 dark:bg-gray-950 relative overflow-hidden"
      onDragOver={e => { e.preventDefault(); setIsDraggingFile(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingFile(false) }}
      onDrop={handleDrop}
    >
      {/* Drag & drop overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-[90] bg-primary/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary/60 pointer-events-none">
          <div className="text-center">
            <div className="text-5xl mb-3">📁</div>
            <p className="text-xl font-bold text-primary">שחרר לשליחת תמונה</p>
          </div>
        </div>
      )}
      <KeyboardShortcuts
        onSearch={() => { setShowSearch(s => !s); setSearchQuery('') }}
        onEscape={() => { setShowSearch(false); setSearchQuery(''); setReplyTo(null); setShowShortcuts(false); setShowNotificationCenter(false); setShowPinboard(false) }}
        onShowShortcuts={() => setShowShortcuts(s => !s)}
        onScrollToBottom={scrollToBottom}
        onToggleFocusMode={() => setFocusMode(f => !f)}
        onReactToLast={(emoji) => {
          const lastMsg = [...messages].reverse().find(m => m.user_id !== currentUser.id)
          if (lastMsg) addReaction(lastMsg.id, emoji)
        }}
        onEditLastMessage={() => {
          const lastOwn = [...messages].reverse().find(m => m.user_id === currentUser.id)
          if (lastOwn) {
            document.getElementById(`message-${lastOwn.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }}
      />
      <WelcomeToast user={currentUser} />
      <Confetti trigger={showConfetti} onDone={() => setShowConfetti(false)} />
      <OfflineIndicator />
      <AchievementToast user={currentUser} achievements={userAchievements} />
      {milestoneToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-500">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl px-6 py-4 shadow-2xl font-bold text-base">
            {milestoneToast}
          </div>
        </div>
      )}
      {/* Header */}
      <ChatHeader
        currentUser={currentUser}
        onlineCount={onlineCount}
        onLogout={onLogout}
        onToggleSearch={() => { setShowSearch(prev => !prev); setSearchQuery('') }}
        onAvatarColorChange={() => setTimeout(() => window.location.reload(), 500)}
        onShowOnboarding={currentUser.messages_count < 20 ? () => setShowOnboarding(true) : undefined}
        onShowSmartSettings={() => setShowSmartSettings(true)}
        unreadCount={dbUnreadCount}
        onMarkRead={markMessagesRead}
      />

      {/* Main content */}
      <div className="flex-1 flex gap-0 sm:gap-3 lg:gap-4 p-0 sm:p-2 lg:p-4 w-full mobile-pb-safe lg:pb-0 overflow-hidden">
        {/* Left sidebar - Community features (hidden on mobile/tablet, visible on xl+) */}
        <div className={cn(
          "hidden xl:flex flex-col gap-3 transition-all duration-300 overflow-y-auto scrollbar-none",
          sidebarCollapsed || focusMode ? "w-0 overflow-hidden opacity-0 p-0" : "w-72 2xl:w-80 shrink-0"
        )}>
          {/* Daily widgets */}
          <DailyQuestionCard question={dailyQuestion} />
          <DailyTipCard tip={dailyTip} />

          {/* Polls */}
          {polls.length > 0 && (
            <div className="space-y-3">
              {polls.slice(0, 2).map(poll => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUser={currentUser}
                  onVote={votePoll}
                />
              ))}
            </div>
          )}

          {/* Create poll button */}
          {(currentUser.user_type === 'admin' || currentUser.user_type === 'subscriber') && (
            <>
              {showCreatePoll ? (
                <CreatePollForm
                  onSubmit={(q, opts) => {
                    createPoll(q, opts)
                    setShowCreatePoll(false)
                  }}
                  onCancel={() => setShowCreatePoll(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePoll(true)}
                  className="w-full border-dashed border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  <Globe className="h-4 w-4 ml-2" />
                  צור סקר חדש
                </Button>
              )}
            </>
          )}

          {/* Upcoming events */}
          <UpcomingEventsCard events={upcomingEvents} />

          {/* Community button — opens full panel */}
          <button
            onClick={() => setShowCommunityPanel(true)}
            className="w-full flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-cyan-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 border border-cyan-200/50 dark:border-cyan-800/30 rounded-2xl px-4 py-3 transition text-cyan-700 dark:text-cyan-400 shadow-sm"
          >
            <Globe className="w-4 h-4" />
            קהילה — כלים ותוכן נוסף
            <ChevronRight className="w-4 h-4 mr-auto" />
          </button>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden xl:flex h-8 w-5 shrink-0 self-start mt-4 p-0"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-none sm:rounded-2xl overflow-hidden sm:border sm:border-gray-200/70 dark:sm:border-gray-800 sm:shadow-md min-w-0">
          {/* Pinned messages */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <PinnedMessages messages={pinnedMessages} onJumpToMessage={jumpToMessage} />
            </div>
            {pinnedMessages.length > 1 && (
              <button
                onClick={() => setShowPinboard(true)}
                className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400 hover:underline px-2 py-1"
                title="כל ההודעות הנעוצות"
              >
                הכל ({pinnedMessages.length})
              </button>
            )}
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="px-4 py-2 border-b border-border/30 bg-card/20 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchResultIndex(0) }}
                  placeholder="חיפוש בהודעות..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                />
                {/* Mentions filter */}
                <button
                  onClick={() => setShowMentionsOnly(m => !m)}
                  className={cn("text-xs px-2 py-0.5 rounded-full transition shrink-0 font-medium", showMentionsOnly ? "bg-cyan-500 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted")}
                  title="הצג רק הודעות שאזכרו אותי"
                >
                  @אני
                </button>
                {/* My messages filter */}
                <button
                  onClick={() => setSearchUserFilter(f => f === currentUser.name ? '' : currentUser.name)}
                  className={cn("text-xs px-2 py-0.5 rounded-full transition shrink-0 font-medium", searchUserFilter === currentUser.name ? "bg-primary text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted")}
                  title="הצג רק ההודעות שלי"
                >
                  שלי
                </button>
                {/* User filter */}
                <input
                  type="text"
                  value={searchUserFilter}
                  onChange={e => { setSearchUserFilter(e.target.value); setSearchResultIndex(0) }}
                  placeholder="@משתמש..."
                  className="w-20 bg-muted/40 rounded-lg px-2 py-0.5 text-xs focus:outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => setShowAdvancedSearch(true)}
                  className="text-[10px] text-primary hover:underline shrink-0 whitespace-nowrap"
                  title="חיפוש מתקדם"
                >
                  חיפוש מתקדם
                </button>
                {searchQuery && (() => {
                  const results = allItems.filter(i => i.type === 'message')
                  const count = results.length
                  const navigate = (delta: number) => {
                    const nextIdx = ((searchResultIndex + delta) % count + count) % count
                    setSearchResultIndex(nextIdx)
                    const item = results[nextIdx]
                    if (item && 'data' in item) jumpToMessage(item.data.id)
                  }
                  return (
                    <>
                      <span className="text-xs text-muted-foreground shrink-0">{searchResultIndex + 1}/{count}</span>
                      <button onClick={() => navigate(-1)} className="p-0.5 hover:bg-muted rounded" title="תוצאה קודמת"><ArrowUp className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => navigate(1)} className="p-0.5 hover:bg-muted rounded" title="תוצאה הבאה"><ArrowDown className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => { setSearchQuery(''); setSearchResultIndex(0) }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Admin announcement input */}
          {currentUser.user_type === 'admin' && showAnnouncement && (
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 space-y-2">
              {/* Quick templates */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🎉 ברוכים הבאים לצ׳אט!',
                  '🔥 יש עסקה חדשה! בדקו',
                  '📢 עדכון חשוב לכולם',
                  '⚡ שעת מומחה כבר עכשיו!',
                  '🏆 כל הכבוד למשתמש השבוע!',
                ].map(template => (
                  <button
                    key={template}
                    onClick={() => setAnnouncementText(template)}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-2 py-1 transition text-amber-700 dark:text-amber-400"
                  >
                    {template}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="כתוב הודעה לכולם..."
                  className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAnnouncement()}
                />
                <Button onClick={handleSendAnnouncement} className="bg-amber-500 hover:bg-amber-600 text-black">
                  שלח
                </Button>
              </div>
            </div>
          )}

          {/* Pinned announcement bar */}
          <AnnouncementBar isAdmin={currentUser.user_type === 'admin'} />

          {/* Community rules card */}
          <ChatRulesCard />

          {/* Slow mode banner */}
          {(() => {
            const slowSecs = parseInt(typeof window !== 'undefined' ? localStorage.getItem('slow_mode_seconds') || '0' : '0', 10)
            if (!slowSecs) return null
            return (
              <div className="mx-3 mt-2 flex items-center gap-2 bg-orange-500/10 border border-orange-400/20 rounded-xl px-3 py-1.5 text-xs text-orange-600 dark:text-orange-400">
                <span>🐢</span>
                <span>מצב איטי פעיל — {slowSecs} שניות בין הודעות</span>
              </div>
            )
          })()}

          {/* Messages */}
          <div id="chat-messages" className="relative flex-1 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-950/30">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-0.5 chat-scroll chat-scrollbar">
            {isLoading ? (
              <MessageSkeleton />
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-destructive text-lg mb-2">{error}</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>נסה שוב</Button>
                </div>
              </div>
            ) : allItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-6 animate-pulse">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  ברוכים הבאים לצ&apos;אט!
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs mb-6">
                  היו הראשונים לשלוח הודעה ולהתחיל את השיחה בקהילה
                </p>
                {/* Conversation starters */}
                <div className="space-y-2 w-full max-w-xs">
                  <p className="text-xs text-muted-foreground font-medium">💡 רעיונות להתחלה:</p>
                  {[
                    '👋 שלום לכולם! חדש/ה כאן',
                    '🔥 יש מישהו שיודע על מבצע טוב?',
                    '📱 עוברים ספק? ספרו לי',
                    '💡 /aitip לטיפ חכם',
                  ].map(starter => (
                    <button
                      key={starter}
                      onClick={() => handleSendMessage(starter)}
                      className="w-full text-sm bg-muted/40 hover:bg-muted border border-border/30 rounded-xl px-4 py-2.5 text-right transition hover:scale-[1.01]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Load more older messages */}
                {hasMore && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={handleLoadMore}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary bg-muted/40 hover:bg-muted/70 border border-border/40 rounded-full px-4 py-1.5 transition"
                    >
                      <ArrowUp className="w-3 h-3" />
                      טען {Math.min(PAGE_SIZE, allItemsFull.length - displayedCount)} הודעות ישנות יותר
                    </button>
                  </div>
                )}
                {allItems.map((item, idx) => {
                  if (item.type === 'date') {
                    return (
                      <div key={`date-${item.time}`} className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold px-3 py-1 bg-white dark:bg-gray-800 rounded-full shrink-0 shadow-sm border border-gray-100 dark:border-gray-700">
                          {item.label}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                      </div>
                    )
                  }
                  if (item.type === 'message') {
                    // Check if this message should be grouped (same user, within 5 min)
                    const prevItem = allItems[idx - 1]
                    const isGrouped = !!(
                      prevItem &&
                      prevItem.type === 'message' &&
                      prevItem.data.user_id === item.data.user_id &&
                      item.time - prevItem.time < 5 * 60 * 1000
                    )
                    return (
                      <div key={item.data.id} id={`message-${item.data.id}`}>
                        <ChatMessageComponent
                          message={item.data}
                          currentUser={currentUser}
                          onDelete={deleteMessage}
                          onPin={togglePinMessage}
                          onReact={addReaction}
                          onUserClick={handleUserClick}
                          onReply={(msg) => {
                            setReplyTo(msg)
                            // Auto-mention the user being replied to (if not own)
                            if (msg.user_id !== currentUser.id && msg.user?.name) {
                              setForwardedContent(`@${msg.user.name} `)
                            }
                          }}
                          onEdit={editMessage}
                          searchQuery={searchQuery || undefined}
                          isBookmarked={isBookmarked(item.data.id)}
                          onToggleBookmark={toggleBookmark}
                          onForward={(content) => { setForwardedContent(content); scrollToBottom() }}
                          onBanUser={currentUser.user_type === 'admin' ? banUser : undefined}
                          isGrouped={isGrouped}
                          onDoubleClick={() => setReplyTo(item.data)}
                          onUpvote={upvoteMessage}
                          currentUserUpvoted={JSON.parse(typeof window !== 'undefined' ? localStorage.getItem(`upvoted_${currentUser.id}`) || '[]' : '[]').includes(item.data.id)}
                          isMuted={item.data.user_id !== currentUser.id && isMuted(item.data.user_id)}
                          onToggleMute={item.data.user_id !== currentUser.id ? toggleMute : undefined}
                          onDM={item.data.user_id !== currentUser.id ? setDmTarget : undefined}
                          onViewThread={(msg) => setThreadMessage(msg)}
                          threadCount={messages.filter(m => {
                            if (m.id === item.data.id) return false
                            const rootTime = new Date(item.data.created_at).getTime()
                            const msgTime = new Date(m.created_at).getTime()
                            if (msgTime < rootTime || msgTime - rootTime > 4 * 60 * 60 * 1000) return false
                            return m.content.startsWith('↩️ בתגובה ל') && item.data.user?.name ? m.content.includes(item.data.user.name) : false
                          }).length}
                        />
                      </div>
                    )
                  }
                  return (
                    <SystemMessageComponent key={(item as {data: SystemMessage}).data.id} message={(item as {data: SystemMessage}).data} />
                  )
                })}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Scroll buttons */}
          {!isAtBottom && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
              {/* Scroll to top */}
              <button
                onClick={() => { messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="flex items-center gap-1 bg-muted/80 text-muted-foreground text-[10px] font-medium px-2.5 py-1 rounded-full shadow hover:opacity-90 transition animate-in fade-in duration-200"
                title="גלול לתחילת הצ'אט"
              >
                ⬆ לתחילה
              </button>
              {/* Scroll to bottom */}
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:opacity-90 transition animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                {unreadSinceScroll > 0 ? `${unreadSinceScroll} הודעות חדשות` : 'גלול למטה'}
              </button>
            </div>
          )}
          </div>

          {/* Typing indicator */}
          <TypingIndicator typingUsers={typingUsers} />

          {/* Input area */}
          <div className="border-t border-gray-200/70 dark:border-gray-800 p-2 sm:p-3 bg-white dark:bg-gray-900 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
            <ChatInput
              onSend={handleSendMessage}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onlineUsers={onlineUsers.map(u => ({ id: u.id, name: u.name, avatar_color: u.avatar_color }))}
              forwardedContent={forwardedContent}
              onClearForward={() => setForwardedContent(null)}
            />
          </div>
        </div>

        {/* Right sidebar - Users & Leaderboard (hidden in focus mode) */}
        <div className={cn("hidden lg:flex flex-col w-60 xl:w-72 2xl:w-80 shrink-0 gap-3 transition-all duration-300 overflow-y-auto scrollbar-none", focusMode && "!hidden")}>
          {/* Sidebar tabs */}
          <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-800 shadow-sm">
            <button
              onClick={() => setSidebarTab('users')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                sidebarTab === 'users'
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              מחוברים
            </button>
            <button
              onClick={() => setSidebarTab('leaderboard')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                sidebarTab === 'leaderboard'
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground"
              )}
            >
              <Trophy className="h-3 w-3" />
              מובילים
            </button>
            <button
              onClick={() => setSidebarTab('deals')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                sidebarTab === 'deals'
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground"
              )}
            >
              <Flame className="h-3 w-3" />
              עסקאות
            </button>
          </div>

          {/* Tab content */}
          {sidebarTab === 'users' && (
            <OnlineUsers users={onlineUsers} currentUserId={currentUser.id} onUserClick={handleUserClick} />
          )}
          {sidebarTab === 'leaderboard' && (
            <Leaderboard users={leaderboard} currentUserId={currentUser.id} />
          )}
          {sidebarTab === 'deals' && (
            <HotDeals deals={hotDeals} currentUser={currentUser} onVote={voteDeal} onShare={shareDeal} />
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/97 dark:bg-gray-950/97 backdrop-blur-lg border-t border-gray-200/80 dark:border-gray-800 z-40 shadow-[0_-2px_16px_rgba(0,0,0,0.06)]"
        aria-label="ניווט תחתון"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)', minHeight: '60px' }}
      >
        <div className="flex h-14">
          <button
            onClick={() => { setMobileTab('chat'); setMobilePanel(null); setShowCommunityPanel(false) }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all relative",
              mobileTab === 'chat' && !showCommunityPanel
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-gray-400 dark:text-gray-500"
            )}
          >
            <MessageCircle className={cn("w-5 h-5 transition-transform", mobileTab === 'chat' && !showCommunityPanel && "scale-110")} />
            <span>צ׳אט</span>
            {mobileTab === 'chat' && !showCommunityPanel && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => { setMobileTab('community'); setShowCommunityPanel(true); setMobilePanel(null) }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all relative",
              showCommunityPanel ? "text-cyan-600 dark:text-cyan-400" : "text-gray-400 dark:text-gray-500"
            )}
          >
            <Globe className={cn("w-5 h-5 transition-transform", showCommunityPanel && "scale-110")} />
            <span>קהילה</span>
            {showCommunityPanel && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => { setMobileTab('deals'); setMobilePanel(p => p === 'deals' ? null : 'deals'); setShowCommunityPanel(false) }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all relative",
              mobilePanel === 'deals' ? "text-orange-500" : "text-gray-400 dark:text-gray-500"
            )}
          >
            <Flame className={cn("w-5 h-5 transition-transform", mobilePanel === 'deals' && "scale-110")} />
            <span>עסקאות</span>
            {mobilePanel === 'deals' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => { setMobileTab('profile'); setShowUserProfile(currentUser); setMobilePanel(null); setShowCommunityPanel(false) }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all relative",
              mobileTab === 'profile' && !showCommunityPanel && !mobilePanel
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-gray-400 dark:text-gray-500"
            )}
          >
            <Users className={cn("w-5 h-5 transition-transform", mobileTab === 'profile' && !showCommunityPanel && !mobilePanel && "scale-110")} />
            <span>פרופיל</span>
            {mobileTab === 'profile' && !showCommunityPanel && !mobilePanel && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-t-full" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile panel sheet (deals only now) */}
      {mobilePanel && (
        <div
          className="lg:hidden fixed inset-x-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200/70 dark:border-gray-800 shadow-2xl rounded-t-2xl max-h-[62vh] overflow-y-auto p-3 animate-in slide-in-from-bottom-4 duration-300"
          style={{ bottom: 'calc(3.75rem + max(env(safe-area-inset-bottom, 0px), 4px))' }}
          {...mobilePanelSwipe}
        >
          {/* Drag handle + close */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button onClick={() => setMobilePanel(null)} className="p-1.5 rounded-lg hover:bg-muted transition" aria-label="סגור">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-1.5">
              {MOBILE_PANELS_ORDER.filter(p => p !== null).map((p, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${mobilePanel === p ? 'w-6 bg-gradient-to-r from-cyan-500 to-purple-600' : 'w-1.5 bg-muted'}`}
                />
              ))}
            </div>
            <div className="w-7" />
          </div>
          {mobilePanel === 'leaderboard' && <Leaderboard users={leaderboard} currentUserId={currentUser.id} />}
          {mobilePanel === 'deals' && <HotDeals deals={hotDeals} currentUser={currentUser} onVote={voteDeal} onShare={shareDeal} />}
          {mobilePanel === 'users' && <OnlineUsers users={onlineUsers} currentUserId={currentUser.id} onUserClick={u => { handleUserClick(u); setMobilePanel(null) }} />}
        </div>
      )}

      {/* Quick deal modal */}
      {showQuickDeal && (
        <QuickDeal
          onShare={(title, description, provider, savingsAmount) => {
            shareDeal(title, description, provider, savingsAmount ?? 0)
            handleSendMessage(`🔥 עסקה חמה: ${title} — ${provider}${savingsAmount ? ` (חיסכון: ${savingsAmount}₪)` : ''}`)
          }}
          onClose={() => setShowQuickDeal(false)}
        />
      )}

      {/* Shortcuts modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {/* Notification permission banner */}
      {showNotifBanner && (
        <NotificationBanner onDismiss={() => {
          setShowNotifBanner(false)
          localStorage.setItem('notif_banner_dismissed', '1')
        }} />
      )}

      {/* Image Gallery Panel */}
      {showGallery && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowGallery(false)} />
          <ImageGallery messages={messages} onClose={() => setShowGallery(false)} />
        </>
      )}

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowBookmarks(false)} />
          <BookmarksPanel
            messages={messages}
            bookmarkedIds={bookmarkedIds}
            onClose={() => setShowBookmarks(false)}
            onJumpToMessage={jumpToMessage}
          />
        </>
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUserProfile(null)}>
          <div onClick={e => e.stopPropagation()}>
            <UserProfile
              user={showUserProfile}
              achievements={showUserProfile.id === currentUser.id ? userAchievements : []}
              rank={leaderboard.findIndex(u => u.id === showUserProfile.id) + 1 || undefined}
              onClose={() => setShowUserProfile(null)}
              recentMessages={messages.filter(m => m.user_id === showUserProfile.id).slice(-5).reverse()}
              currentUser={currentUser}
              isCurrentUser={showUserProfile.id === currentUser.id}
            />
          </div>
        </div>
      )}

      {/* Chat Export Modal */}
      {showExport && (
        <ChatExport
          messages={messages}
          currentUser={currentUser}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClearAll={clearNotifications}
          onJumpToMessage={jumpToMessage}
          onClose={() => setShowNotificationCenter(false)}
        />
      )}

      {/* Message thread panel */}
      {threadMessage && (
        <MessageThread
          rootMessage={threadMessage}
          allMessages={messages}
          currentUser={currentUser}
          onClose={() => setThreadMessage(null)}
          onReply={(msg) => { setReplyTo(msg); setThreadMessage(null) }}
        />
      )}

      {/* Onboarding checklist modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowOnboarding(false)}>
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <OnboardingChecklist
              user={currentUser}
              messagesCount={messages.filter(m => m.user_id === currentUser.id).length}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      )}

      {/* PWA install banner */}
      <PWAInstallBanner />

      {/* Price alerts panel */}
      {showPriceAlerts && (
        <PriceAlertsPanel onClose={() => setShowPriceAlerts(false)} />
      )}

      {/* Community panel */}
      {showCommunityPanel && (
        <CommunityPanel
          messages={messages}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          onClose={() => { setShowCommunityPanel(false); setMobileTab('chat') }}
          onSearch={(kw) => { setSearchQuery(kw); setShowSearch(true) }}
          onJumpToMessage={jumpToMessage}
          onSendMessage={handleSendMessage}
          onShareDeal={(text) => sendMessage(text)}
          onViewProfile={handleUserClick}
          onShowPriceAlerts={() => setShowPriceAlerts(true)}
        />
      )}

      {/* Smart settings panel */}
      {showSmartSettings && (
        <SmartSettingsPanel
          currentUser={currentUser}
          messages={messages}
          onClose={() => setShowSmartSettings(false)}
        />
      )}

      {/* Pinboard */}
      {showPinboard && (
        <Pinboard
          messages={messages}
          onJumpToMessage={jumpToMessage}
          onUnpin={currentUser.user_type === 'admin' ? (id) => togglePinMessage(id, true) : undefined}
          isAdmin={currentUser.user_type === 'admin'}
          onClose={() => setShowPinboard(false)}
        />
      )}

      {/* Direct Messages */}
      {dmTarget && (
        <DirectMessages
          currentUser={currentUser}
          targetUser={dmTarget}
          onClose={() => setDmTarget(null)}
        />
      )}

      {/* Advanced Search */}
      {showAdvancedSearch && (
        <AdvancedSearch
          messages={messages}
          onlineUsers={onlineUsers}
          onJumpToMessage={(id) => { jumpToMessage(id); setShowAdvancedSearch(false) }}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}

      {/* Scheduled Messages Panel */}
      {showScheduled && (
        <ScheduledMessagesPanel
          scheduled={scheduled}
          onCancel={cancelScheduled}
          onSchedule={scheduleMessage}
          onClose={() => setShowScheduled(false)}
        />
      )}

      {/* Points Shop */}
      {showPointsShop && (
        <PointsShop
          currentUser={currentUser}
          onClose={() => setShowPointsShop(false)}
          onPurchase={(item, newPoints) => {
            addNotification({
              type: 'achievement',
              title: `רכשת: ${item.name}!`,
              body: `השתמשת ב-${item.cost} נקודות. יתרה: ${newPoints}`,
            })
          }}
        />
      )}

      {/* Mobile tools sheet */}
      {showMobileTools && (
        <div className="fixed inset-0 z-[55] flex flex-col justify-end sm:hidden" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileTools(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-4 pt-2 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">כלים</h3>
                <button onClick={() => setShowMobileTools(false)} className="p-1.5 rounded-lg hover:bg-muted transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => { setShowGallery(true); setShowMobileTools(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  <Images className="w-5 h-5" />
                  גלריה
                </button>
                <button onClick={() => { setShowQuickDeal(true); setShowMobileTools(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium text-orange-500">
                  <Flame className="w-5 h-5" />
                  עסקה 🔥
                </button>
                <button onClick={() => { setShowPointsShop(true); setShowMobileTools(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium text-amber-500">
                  <Star className="w-5 h-5" />
                  {currentUser.points} נק׳
                </button>
                <button onClick={() => { setShowScheduled(true); setShowMobileTools(false) }} className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  <Clock className="w-5 h-5" />
                  מתוזמן
                  {scheduledCount > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{scheduledCount}</span>}
                </button>
                <button onClick={() => { setFocusMode(f => !f); setShowMobileTools(false) }} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl transition text-xs font-medium", focusMode ? "bg-primary/10 text-primary" : "bg-muted/40 hover:bg-muted")}>
                  {focusMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  {focusMode ? 'רגיל' : 'פוקוס'}
                </button>
                <button onClick={() => { setShowPriceAlerts(true); setShowMobileTools(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Bell className="w-5 h-5" />
                  התראת מחיר
                </button>
                <button onClick={() => { setShowPinboard(true); setShowMobileTools(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  <Bookmark className="w-5 h-5" />
                  נעוצות
                </button>
                <button onClick={() => { setShowExport(true); setShowMobileTools(false) }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted transition text-xs font-medium">
                  <Download className="w-5 h-5" />
                  ייצוא
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

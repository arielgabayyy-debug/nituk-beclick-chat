"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Volume2, VolumeX, Bell, BarChart3, Flame, Trophy, X, ChevronLeft, ChevronRight, Search, MessageCircle, ChevronDown, Bookmark, Download, ArrowUp, ArrowDown, Images, Keyboard } from 'lucide-react'
import { ChatHeader } from './chat-header'
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
import { useBookmarks, BookmarksPanel } from './message-bookmarks'
import { OfflineIndicator } from './offline-indicator'
import { ChatStats } from './chat-stats'
import { ChatRulesCard } from './chat-rules'
import { AchievementToast } from './achievement-toast'
import { MessageSkeleton } from './message-skeleton'
import { ImageGallery } from './image-gallery'
import { ShortcutsModal } from './shortcuts-modal'
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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [announcementText, setAnnouncementText] = useState('')
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('users')
  const [showUserProfile, setShowUserProfile] = useState<ChatUser | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultIndex, setSearchResultIndex] = useState(0)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadSinceScroll, setUnreadSinceScroll] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [forwardedContent, setForwardedContent] = useState<string | null>(null)
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks()
  const prevMessagesLengthRef = useRef(messages.length)

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80
    setIsAtBottom(atBottom)
    if (atBottom) setUnreadSinceScroll(0)
  }, [])

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
  }

  // Play sound on new message (not own) and track prev length
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && soundEnabled) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.user_id !== currentUser.id) {
        const isMention = lastMessage.content.includes(`@${currentUser.name}`)
        const audio = new Audio('/notification.mp3')
        audio.volume = isMention ? 0.7 : 0.3
        // Speed up for mention (higher pitch feel)
        if (isMention && 'playbackRate' in audio) audio.playbackRate = 1.5
        audio.play().catch(() => {})
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages, currentUser.id, currentUser.name, soundEnabled])

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
      if (!searchQuery.trim()) return true
      if (item.type === 'message') {
        return item.data.content.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
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
  const allItems: AllItem[] = []
  let lastDate = ''
  for (const item of baseItems) {
    const d = new Date(item.time); d.setHours(0,0,0,0)
    const dateKey = d.toISOString()
    if (dateKey !== lastDate) {
      allItems.push({ type: 'date', label: formatDateLabel(item.time), time: item.time - 1 })
      lastDate = dateKey
    }
    allItems.push(item)
  }

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

  // Export chat as .txt
  const handleExportChat = () => {
    const lines = messages.map(m => {
      const time = new Date(m.created_at).toLocaleString('he-IL')
      const name = m.user?.name || 'משתמש'
      const content = m.content.startsWith('[voice:') ? '[הודעה קולית]' : m.content
      return `[${time}] ${name}: ${content}`
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Confetti on first-ever message
  const handleSendMessage = (content: string) => {
    const key = `first_msg_${currentUser.id}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      setShowConfetti(true)
    }
    sendMessage(content)
  }

  return (
    <div className="min-h-screen flex flex-col chat-bg-animated">
      <KeyboardShortcuts
        onSearch={() => { setShowSearch(s => !s); setSearchQuery('') }}
        onEscape={() => { setShowSearch(false); setSearchQuery(''); setReplyTo(null); setShowShortcuts(false) }}
        onShowShortcuts={() => setShowShortcuts(s => !s)}
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
      {/* Header */}
      <ChatHeader
        currentUser={currentUser}
        onlineCount={onlineCount}
        onLogout={onLogout}
        onToggleSearch={() => { setShowSearch(prev => !prev); setSearchQuery('') }}
      />

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 max-w-[1600px] mx-auto w-full">
        {/* Left sidebar - Community features (hidden on mobile) */}
        <div className={cn(
          "hidden xl:flex flex-col gap-4 transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden opacity-0" : "w-80 shrink-0"
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
                  <BarChart3 className="h-4 w-4 ml-2" />
                  צור סקר חדש
                </Button>
              )}
            </>
          )}

          {/* Upcoming events */}
          <UpcomingEventsCard events={upcomingEvents} />

          {/* Chat statistics */}
          <ChatStats messages={messages} onlineUsers={onlineUsers} />
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden xl:flex h-8 w-8 shrink-0 self-start mt-4"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Chat area */}
        <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden border border-border/30 shadow-2xl min-w-0">
          {/* Pinned messages */}
          <PinnedMessages messages={pinnedMessages} onJumpToMessage={jumpToMessage} />

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
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
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

          {/* Community rules card */}
          <ChatRulesCard />

          {/* Messages */}
          <div id="chat-messages" className="relative flex-1 flex flex-col overflow-hidden">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
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
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-6 animate-pulse">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  ברוכים הבאים לצ&apos;אט!
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  היו הראשונים לשלוח הודעה ולהתחיל את השיחה בקהילה
                </p>
              </div>
            ) : (
              <>
                {allItems.map((item, idx) => {
                  if (item.type === 'date') {
                    return (
                      <div key={`date-${item.time}`} className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 bg-muted/50 rounded-full shrink-0">
                          {item.label}
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
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
                          onReply={(msg) => setReplyTo(msg)}
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
          {/* Scroll to bottom button */}
          {!isAtBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:opacity-90 transition animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              {unreadSinceScroll > 0 ? `${unreadSinceScroll} הודעות חדשות` : 'גלול למטה'}
            </button>
          )}
          </div>

          {/* Typing indicator */}
          <TypingIndicator typingUsers={typingUsers} />

          {/* Input area */}
          <div className="border-t border-border/30 p-4 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "השתק צלילים" : "הפעל צלילים"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              </Button>

              {/* Bookmarks */}
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 shrink-0 relative", showBookmarks && "bg-amber-500/10 text-amber-500")}
                onClick={() => setShowBookmarks(!showBookmarks)}
                title="הודעות שמורות"
              >
                <Bookmark className={cn("w-4 h-4", showBookmarks ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                {bookmarkedIds.size > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none">
                    {bookmarkedIds.size > 9 ? '9+' : bookmarkedIds.size}
                  </span>
                )}
              </Button>

              {currentUser.user_type === 'admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 shrink-0", showAnnouncement && "bg-amber-500/20 text-amber-400")}
                  onClick={() => setShowAnnouncement(!showAnnouncement)}
                  title="שלח הודעה לכולם"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              )}

              {/* Keyboard shortcuts */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowShortcuts(s => !s)}
                title="קיצורי דרך (?)"
              >
                <Keyboard className="w-4 h-4 text-muted-foreground" />
              </Button>

              {/* Image gallery */}
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 shrink-0", showGallery && "bg-primary/10 text-primary")}
                onClick={() => setShowGallery(!showGallery)}
                title="גלריית תמונות"
              >
                <Images className="w-4 h-4 text-muted-foreground" />
              </Button>

              {/* Export chat */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleExportChat}
                title="ייצא שיחה כקובץ טקסט"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
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

        {/* Right sidebar - Users & Leaderboard */}
        <div className="hidden lg:flex flex-col w-80 shrink-0 gap-4">
          {/* Sidebar tabs */}
          <div className="flex gap-1 p-1 bg-card/30 backdrop-blur-xl rounded-xl border border-border/30">
            <button
              onClick={() => setSidebarTab('users')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                sidebarTab === 'users' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
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
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                sidebarTab === 'leaderboard' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Trophy className="h-3.5 w-3.5" />
              מובילים
            </button>
            <button
              onClick={() => setSidebarTab('deals')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                sidebarTab === 'deals' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Flame className="h-3.5 w-3.5" />
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border/30 safe-area-inset-bottom z-40 flex" aria-label="ניווט תחתון">
        <button onClick={() => {}} className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-primary"><MessageCircle className="w-5 h-5" /><span>צ׳אט</span></button>
        <button onClick={() => setSidebarTab('leaderboard')} className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"><Trophy className="w-5 h-5" /><span>מובילים</span></button>
        <button onClick={() => setSidebarTab('deals')} className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"><Flame className="w-5 h-5" /><span>עסקאות</span></button>
        <button onClick={() => setSidebarTab('polls')} className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"><BarChart3 className="w-5 h-5" /><span>סקרים</span></button>
      </nav>

      {/* Shortcuts modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

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
            />
          </div>
        </div>
      )}

    </div>
  )
}

"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Volume2, VolumeX, Bell, BarChart3, Flame, Trophy, X, ChevronLeft, ChevronRight, Search, MessageCircle, ChevronDown } from 'lucide-react'
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
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadSinceScroll, setUnreadSinceScroll] = useState(0)
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
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {})
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages, currentUser.id, soundEnabled])

  const jumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight-message')
      setTimeout(() => element.classList.remove('highlight-message'), 2000)
    }
  }

  const allItems = [
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

  return (
    <div className="min-h-screen flex flex-col chat-bg-animated">
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
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="חיפוש בהודעות..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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

          {/* Messages */}
          <div id="chat-messages" className="relative flex-1 flex flex-col overflow-hidden">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">טוען הודעות...</p>
                </div>
              </div>
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
                {allItems.map((item) => (
                  item.type === 'message' ? (
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
                      />
                    </div>
                  ) : (
                    <SystemMessageComponent key={item.data.id} message={item.data as SystemMessage} />
                  )
                ))}
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
            </div>
            <ChatInput
              onSend={sendMessage}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onlineUsers={onlineUsers.map(u => ({ id: u.id, name: u.name, avatar_color: u.avatar_color }))}
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

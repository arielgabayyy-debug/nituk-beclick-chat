"use client"

// ── AvatarActionsSheet ─────────────────────────────────────────────────────────
// WhatsApp-style bottom sheet triggered by long-pressing a user avatar.
// Shows: Follow/Unfollow · Direct Message · View Profile
// On desktop: appears as a centered modal.

import { useEffect, useRef } from 'react'
import { UserPlus, UserCheck, MessageCircle, User, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatUser } from '@/lib/chat-types'
import { useFollow } from '@/hooks/use-follow'
import { UserBadge } from './user-badge'

interface AvatarActionsSheetProps {
  user: ChatUser
  currentUser: ChatUser
  onViewProfile: () => void
  onDM: () => void
  onClose: () => void
}

function getInitials(name: string) { return name.charAt(0).toUpperCase() }

export function AvatarActionsSheet({
  user, currentUser, onViewProfile, onDM, onClose,
}: AvatarActionsSheetProps) {
  const { isFollowing, toggleFollow, loading, stats, canFollow } = useFollow(currentUser.id, user.id)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on outside click/tap
  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose()
    }
    // Small delay so the triggering touch doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handle)
      document.addEventListener('touchstart', handle)
    }, 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [onClose])

  // Swipe-down to close
  const swipeStartY = useRef<number | null>(null)
  const handleSheetTouchStart = (e: React.TouchEvent) => { swipeStartY.current = e.touches[0].clientY }
  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartY.current !== null && e.changedTouches[0].clientY - swipeStartY.current > 60) onClose()
    swipeStartY.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px]"
      dir="rtl"
    >
      <div
        ref={sheetRef}
        className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border/30
                   animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-250 overflow-hidden"
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1.5 bg-muted-foreground/25 rounded-full" />
        </div>

        {/* Close button — desktop */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── User header ─────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ backgroundColor: user.avatar_color }}
            >
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                : getInitials(user.name)
              }
            </div>
            {/* Online dot */}
            {user.is_online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card" />
            )}
          </div>

          {/* Name + badge + stats */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate leading-tight">{user.name}</h3>
            <UserBadge userType={user.user_type} joinedAt={user.created_at} userId={user.id} />
            <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
              <button
                className="hover:text-foreground transition-colors"
                onClick={onViewProfile}
              >
                <strong className="text-foreground font-semibold">{stats.followers}</strong> עוקבים
              </button>
              <button
                className="hover:text-foreground transition-colors"
                onClick={onViewProfile}
              >
                <strong className="text-foreground font-semibold">{stats.following}</strong> עוקב
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40 mx-5" />

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="p-3 pb-2 space-y-1">

          {/* Follow / Unfollow */}
          {canFollow && (
            <button
              onClick={toggleFollow}
              disabled={loading}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] touch-manipulation select-none",
                isFollowing
                  ? "bg-muted/70 hover:bg-muted"
                  : "bg-primary/10 hover:bg-primary/15"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                isFollowing ? "bg-muted" : "bg-primary/20"
              )}>
                {loading
                  ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  : isFollowing
                    ? <UserCheck className="w-5 h-5 text-primary" />
                    : <UserPlus  className="w-5 h-5 text-primary" />
                }
              </div>
              <div className="text-right flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {isFollowing ? '✓ עוקב — לחץ להפסיק' : 'עקוב'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isFollowing
                    ? `אתה עוקב אחרי ${user.name}`
                    : `קבל עדכונים מ-${user.name}`}
                </p>
              </div>
            </button>
          )}

          {/* Direct Message */}
          <button
            onClick={() => { onDM(); onClose() }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/70 transition-all active:scale-[0.98] touch-manipulation select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-right flex-1">
              <p className="text-sm font-semibold leading-tight">הודעה אישית</p>
              <p className="text-xs text-muted-foreground mt-0.5">שלח הודעה פרטית ל-{user.name}</p>
            </div>
          </button>

          {/* View Profile */}
          <button
            onClick={() => { onViewProfile(); onClose() }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/70 transition-all active:scale-[0.98] touch-manipulation select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-right flex-1">
              <p className="text-sm font-semibold leading-tight">ראה פרופיל מלא</p>
              <p className="text-xs text-muted-foreground mt-0.5">הישגים · נקודות · היסטוריה</p>
            </div>
          </button>
        </div>

        {/* iOS safe-area spacer */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} className="sm:pb-2" />
      </div>
    </div>
  )
}

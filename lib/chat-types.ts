export type UserType = 'guest' | 'subscriber' | 'newsletter' | 'admin' | 'blocked'

export interface ChatUser {
  id: string
  name: string
  email: string | null
  user_type: UserType
  avatar_color: string
  avatar_url?: string | null
  is_online: boolean
  last_seen: string
  created_at: string
  // Gamification
  points: number
  level: number
  messages_count: number
  helpful_count: number
  weekly_points: number
  is_user_of_week: boolean
  achievements?: UserAchievement[]
}

export interface ChatMessage {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at?: string
  is_pinned?: boolean
  mentions?: string[]
  has_gif?: boolean
  gif_url?: string
  user?: ChatUser
  reactions?: MessageReaction[]
  upvotes_count?: number
  user_upvoted?: boolean
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: ChatUser
}

export interface SystemMessage {
  id: string
  user_id?: string
  message_type: 'join' | 'leave' | 'announcement'
  content: string
  created_at: string
  user?: ChatUser
}

export interface TypingUser {
  user_id: string
  started_at: string
  user?: ChatUser
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_type: AchievementType
  earned_at: string
}

export type AchievementType = 
  | 'first_message'      // שלח הודעה ראשונה
  | 'helpful_10'         // עזר ל-10 אנשים
  | 'helpful_50'         // עזר ל-50 אנשים
  | 'messages_100'       // שלח 100 הודעות
  | 'messages_500'       // שלח 500 הודעות
  | 'week_champion'      // משתמש השבוע
  | 'deal_hunter'        // שיתף 10 עסקאות
  | 'community_veteran'  // בקהילה 30 יום
  | 'poll_creator'       // יצר סקר
  | 'story_teller'       // שיתף סיפור הצלחה

export interface Poll {
  id: string
  question: string
  created_by: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
  options?: PollOption[]
  total_votes?: number
  user_voted_option?: string | null
  creator?: ChatUser
}

export interface PollOption {
  id: string
  poll_id: string
  option_text: string
  votes_count: number
  percentage?: number
}

export interface DailyQuestion {
  id: string
  question: string
  is_active: boolean
  responses_count: number
  created_at: string
}

export interface HotDeal {
  id: string
  user_id: string
  title: string
  description: string | null
  provider: string | null
  savings_amount: number | null
  upvotes: number
  created_at: string
  user?: ChatUser
  user_voted?: 'up' | 'down' | null
}

export interface DailyTip {
  id: string
  tip_text: string
  category: string | null
  is_active: boolean
  created_at: string
}

export interface SuccessStory {
  id: string
  user_id: string
  title: string
  story: string
  savings_amount: number | null
  likes_count: number
  created_at: string
  user?: ChatUser
}

export interface CommunityEvent {
  id: string
  title: string
  description: string | null
  event_type: 'expert_hour' | 'quiz' | 'special'
  starts_at: string
  ends_at: string | null
  is_active: boolean
  created_at: string
}

export interface PresenceState {
  [key: string]: {
    user_id: string
    user_name: string
    user_type: UserType
    avatar_color: string
    online_at: string
  }[]
}

// Level thresholds
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2500,   // Level 7
  4000,   // Level 8
  6000,   // Level 9
  10000,  // Level 10
]

export const LEVEL_NAMES: Record<number, string> = {
  1: 'מתחיל',
  2: 'פעיל',
  3: 'תורם',
  4: 'מומחה מתחיל',
  5: 'מומחה',
  6: 'מומחה בכיר',
  7: 'אלוף',
  8: 'אגדה',
  9: 'גורו',
  10: 'אלוף העל',
}

export const ACHIEVEMENT_INFO: Record<AchievementType, { name: string; icon: string; description: string }> = {
  first_message: { name: 'צעד ראשון', icon: '🎯', description: 'שלחת את ההודעה הראשונה שלך' },
  helpful_10: { name: 'עוזר', icon: '🤝', description: 'עזרת ל-10 אנשים בקהילה' },
  helpful_50: { name: 'מלאך שומר', icon: '👼', description: 'עזרת ל-50 אנשים בקהילה' },
  messages_100: { name: 'פטפטן', icon: '💬', description: 'שלחת 100 הודעות' },
  messages_500: { name: 'דובר הקהילה', icon: '🎤', description: 'שלחת 500 הודעות' },
  week_champion: { name: 'אלוף השבוע', icon: '🏆', description: 'נבחרת כמשתמש השבוע' },
  deal_hunter: { name: 'צייד עסקאות', icon: '🎯', description: 'שיתפת 10 עסקאות חמות' },
  community_veteran: { name: 'ותיק הקהילה', icon: '🏅', description: 'בקהילה כבר 30 יום' },
  poll_creator: { name: 'יוצר סקרים', icon: '📊', description: 'יצרת סקר בקהילה' },
  story_teller: { name: 'מספר סיפורים', icon: '📖', description: 'שיתפת סיפור הצלחה' },
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  guest: 'אורח',
  subscriber: 'מנוי',
  newsletter: 'ניוזלטר',
  admin: 'מנהל',
  blocked: 'חסום'
}

export const USER_TYPE_COLORS: Record<UserType, string> = {
  guest: 'bg-muted text-muted-foreground',
  subscriber: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
  newsletter: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  admin: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  blocked: 'bg-red-100 text-red-600'
}

export const PROVIDER_LIST = [
  'פרטנר',
  'סלקום',
  'פלאפון',
  'הוט מובייל',
  'גולן טלקום',
  'רמי לוי',
  '019',
  'אחר'
]

export const AVATAR_COLORS = [
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#3b82f6', // blue
  '#ef4444', // red
  '#84cc16', // lime
]

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '💡', '🙏', '✅', '💰', '⭐', '🤔', '👎', '😍']

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

// ── GIF Categories — 16 categories, 8 GIFs each ────────────────────────────
// All URLs are from GIPHY CDN (free, no auth for display)
export const GIF_CATEGORIES = [
  {
    id: 'celebrate', name: '🎉 חגיגה', gifs: [
      'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
      'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
      'https://media.giphy.com/media/3oz8xRF0v9WMAUVLNK/giphy.gif',
      'https://media.giphy.com/media/YTbZzCkRQCEJa/giphy.gif',
      'https://media.giphy.com/media/kaBU6pgv0OsPHz2yxy/giphy.gif',
      'https://media.giphy.com/media/l4JyOs9bCIAFVHUpq/giphy.gif',
      'https://media.giphy.com/media/3ohhwF34cGDoFFhRfy/giphy.gif',
    ],
  },
  {
    id: 'happy', name: '😊 שמח', gifs: [
      'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
      'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif',
      'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
      'https://media.giphy.com/media/XR9Dp54ZC4dji/giphy.gif',
      'https://media.giphy.com/media/l3q2wJsC23ikJg9xe/giphy.gif',
      'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
      'https://media.giphy.com/media/GStLeae4F7VIs/giphy.gif',
      'https://media.giphy.com/media/ely3apij36BJhoZ234/giphy.gif',
    ],
  },
  {
    id: 'thanks', name: '🙏 תודה', gifs: [
      'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif',
      'https://media.giphy.com/media/ZfK4cXKJTTay1Ava29/giphy.gif',
      'https://media.giphy.com/media/l4Jz3a8jO92crUlWM/giphy.gif',
      'https://media.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif',
      'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif',
      'https://media.giphy.com/media/3oEjHI7SkzZBL1FnHi/giphy.gif',
      'https://media.giphy.com/media/KJ1f5iTl4Oo7u/giphy.gif',
      'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif',
    ],
  },
  {
    id: 'lol', name: '😂 מצחיק', gifs: [
      'https://media.giphy.com/media/oYtVHSxngR3lC/giphy.gif',
      'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
      'https://media.giphy.com/media/3oKIPCSX4UHmuS41TG/giphy.gif',
      'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
      'https://media.giphy.com/media/SvFocn0wNMx0iv2rYz/giphy.gif',
      'https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif',
      'https://media.giphy.com/media/h4OGa0npayrJX2NYOR/giphy.gif',
      'https://media.giphy.com/media/ylyUQkj19AYDaGMvie/giphy.gif',
    ],
  },
  {
    id: 'wow', name: '🤯 וואו', gifs: [
      'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
      'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
      'https://media.giphy.com/media/l0Exk8EUzSLsrErEQ/giphy.gif',
      'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif',
      'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif',
      'https://media.giphy.com/media/ToMjGpjpXMFPshSYGLm/giphy.gif',
    ],
  },
  {
    id: 'fire', name: '🔥 מעולה', gifs: [
      'https://media.giphy.com/media/3o7aTLkyh3yAhQmBmE/giphy.gif',
      'https://media.giphy.com/media/26tknCqiJrBQG6bxC/giphy.gif',
      'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif',
      'https://media.giphy.com/media/BpGWitbFZflfSUYuZ9/giphy.gif',
      'https://media.giphy.com/media/Xx2Z4TYbMCNHq/giphy.gif',
      'https://media.giphy.com/media/2A6ND13YqHIOFAn8e0/giphy.gif',
      'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
      'https://media.giphy.com/media/j2pWZpr5RlpCodOB0d/giphy.gif',
    ],
  },
  {
    id: 'money', name: '💰 עסקאות', gifs: [
      'https://media.giphy.com/media/dQHBToMtA3TKyhXoYr/giphy.gif',
      'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif',
      'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif',
      'https://media.giphy.com/media/l0MYM98IwMwhqhjss/giphy.gif',
      'https://media.giphy.com/media/3o7TKSx0g7RqRniGFG/giphy.gif',
      'https://media.giphy.com/media/xUPGcEliCc7bETyfO8/giphy.gif',
      'https://media.giphy.com/media/ZEkSRqSUNxiZBTt7TF/giphy.gif',
      'https://media.giphy.com/media/l3vRhblMlMOZn3BVm/giphy.gif',
    ],
  },
  {
    id: 'love', name: '❤️ אהבה', gifs: [
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      'https://media.giphy.com/media/l1J9wJ2GKBA8nzjlm/giphy.gif',
      'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
      'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif',
      'https://media.giphy.com/media/YWf50NNii3r4k/giphy.gif',
      'https://media.giphy.com/media/bLWPFuGkVZ5FkXUeZO/giphy.gif',
      'https://media.giphy.com/media/26BRBupa6nRXMGBQs/giphy.gif',
      'https://media.giphy.com/media/xT9IgG50Lg7rusNZ6A/giphy.gif',
    ],
  },
  {
    id: 'thinking', name: '🤔 חושב', gifs: [
      'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif',
      'https://media.giphy.com/media/TPl5N4Ci49ZQY/giphy.gif',
      'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif',
      'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif',
      'https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif',
      'https://media.giphy.com/media/3oEjI5VtIhAfQv8pza/giphy.gif',
      'https://media.giphy.com/media/xUPGcz59f5YtDaHKLm/giphy.gif',
      'https://media.giphy.com/media/3oEjHSbF9rEpXCOSEU/giphy.gif',
    ],
  },
  {
    id: 'deal', name: '🤝 סגרנו', gifs: [
      'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif',
      'https://media.giphy.com/media/l0ExncehJzexFpRHq/giphy.gif',
      'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
      'https://media.giphy.com/media/1wqqlaQ7IX7dYlVDlT/giphy.gif',
      'https://media.giphy.com/media/l3q2QmluNoXLnYGIM/giphy.gif',
      'https://media.giphy.com/media/26BRzozg4TCBXv6QU/giphy.gif',
      'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif',
      'https://media.giphy.com/media/QAcRMEUzWOiF4wLpL5/giphy.gif',
    ],
  },
  {
    id: 'nope', name: '🙅 לא', gifs: [
      'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif',
      'https://media.giphy.com/media/CF4nMIQkA8pAA/giphy.gif',
      'https://media.giphy.com/media/d2ZcfODrNWlA5Gg0/giphy.gif',
      'https://media.giphy.com/media/3oFzmtYCMbpqWTgF0A/giphy.gif',
      'https://media.giphy.com/media/ToMjGpx9dUfL2LJv1sm/giphy.gif',
      'https://media.giphy.com/media/l2SpUoAPo0CBnXjO8/giphy.gif',
      'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
      'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif',
    ],
  },
  {
    id: 'run', name: '🏃 מהר', gifs: [
      'https://media.giphy.com/media/CjmvTCZf2U3p09Cn0h/giphy.gif',
      'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
      'https://media.giphy.com/media/iigDJjPirYKTe/giphy.gif',
      'https://media.giphy.com/media/l4FGBrGvFGWYxsKxO/giphy.gif',
      'https://media.giphy.com/media/4No8JxHkq8E5q/giphy.gif',
      'https://media.giphy.com/media/26uflBNKwHiNqFqJq/giphy.gif',
      'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif',
      'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    ],
  },
  {
    id: 'dance', name: '💃 ריקוד', gifs: [
      'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif',
      'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif',
      'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
      'https://media.giphy.com/media/4bWWKmUnn5E4M/giphy.gif',
      'https://media.giphy.com/media/26DNioenMF55ocuaA/giphy.gif',
      'https://media.giphy.com/media/l0HlOBZcl7sbV6LnO/giphy.gif',
      'https://media.giphy.com/media/RkDTsaWFDxwQE/giphy.gif',
      'https://media.giphy.com/media/KIFUMLePt83kI/giphy.gif',
    ],
  },
  {
    id: 'facepalm', name: '🤦 אוף', gifs: [
      'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif',
      'https://media.giphy.com/media/14aUO0Mf7dWDXW/giphy.gif',
      'https://media.giphy.com/media/5ZZSYqvcH6QppFQnx5/giphy.gif',
      'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif',
      'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif',
      'https://media.giphy.com/media/6uGhT1O4sxpi8/giphy.gif',
      'https://media.giphy.com/media/sDcfxFDozb3bO/giphy.gif',
      'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif',
    ],
  },
  {
    id: 'clap', name: '👏 כל הכבוד', gifs: [
      'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif',
      'https://media.giphy.com/media/l3q2zbskZp2j8wniE/giphy.gif',
      'https://media.giphy.com/media/3oEduLztanCdSSdVd2/giphy.gif',
      'https://media.giphy.com/media/GlFy5PNQHt5mI/giphy.gif',
      'https://media.giphy.com/media/6tHy8UAbv3zgs/giphy.gif',
      'https://media.giphy.com/media/26AHAw0aMmWwRI4Hm/giphy.gif',
      'https://media.giphy.com/media/xT1XH3yj7ujmm6sE1i/giphy.gif',
      'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif',
    ],
  },
  {
    id: 'help', name: '🆘 עזרה', gifs: [
      'https://media.giphy.com/media/phJ6eMRFYI6CQ/giphy.gif',
      'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif',
      'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
      'https://media.giphy.com/media/3oEdv9R0cMkMkkJRLq/giphy.gif',
      'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif',
      'https://media.giphy.com/media/3oKIPCSX4UHmuS41TG/giphy.gif',
      'https://media.giphy.com/media/bFgbL0YFkZeIY/giphy.gif',
      'https://media.giphy.com/media/1BXa2alBjrCXC/giphy.gif',
    ],
  },
]

export function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

export function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1
    }
  }
  return 1
}

export function getPointsToNextLevel(points: number, level: number): { current: number; needed: number; percentage: number } {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const current = points - currentThreshold
  const needed = nextThreshold - currentThreshold
  const percentage = Math.min((current / needed) * 100, 100)
  return { current, needed, percentage }
}

export function formatTimeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'עכשיו'
  if (diffMins < 60) return `לפני ${diffMins} דק׳`
  if (diffHours < 24) return `לפני ${diffHours} שע׳`
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  return past.toLocaleDateString('he-IL')
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount)
}

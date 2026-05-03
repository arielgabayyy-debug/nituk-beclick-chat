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

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export const GIF_CATEGORIES = [
  { id: 'celebrate', name: 'חגיגה', gifs: [
    'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
  ]},
  { id: 'thanks', name: 'תודה', gifs: [
    'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif',
    'https://media.giphy.com/media/ZfK4cXKJTTay1Ava29/giphy.gif',
  ]},
  { id: 'happy', name: 'שמח', gifs: [
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif',
  ]},
  { id: 'thinking', name: 'חושב', gifs: [
    'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif',
    'https://media.giphy.com/media/TPl5N4Ci49ZQY/giphy.gif',
  ]},
]

export const ADMIN_PASSWORD = 'nituk2024'

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

// Auto-moderation hook — client-side content checking
// Flags messages before sending; admins can configure rules

const SPAM_PATTERNS = [
  /(.)\1{6,}/g,              // Repeated characters: aaaaaaa
  /https?:\/\/.+https?:\/\//g, // Multiple URLs
  /\b(קזינו|הגרלה|הימור|porn|xxx)\b/gi, // Gambling/adult
  /(\d{4}[\s-]){3}\d{4}/g,   // Credit card numbers
]

const CAPS_THRESHOLD = 0.7  // If >70% of letters are uppercase → warn
const REPEAT_THRESHOLD = 3  // Same message 3 times in 10 min → warn

const recentMessages: { content: string; time: number }[] = []

export type ModResult = {
  allowed: boolean
  reason?: string
  severity: 'ok' | 'warn' | 'block'
}

export function checkMessage(content: string): ModResult {
  if (!content.trim()) return { allowed: true, severity: 'ok' }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: 'ההודעה מכילה תוכן שאינו מותר בקהילה',
        severity: 'block',
      }
    }
  }

  // Check all-caps (only for Hebrew/English strings > 10 chars)
  const letters = content.replace(/[^a-zA-Zא-ת]/g, '')
  if (letters.length > 10) {
    const upperCount = (content.match(/[A-Z]/g) || []).length
    const lowerCount = (content.match(/[a-z]/g) || []).length
    if (lowerCount === 0 && upperCount > 5) {
      return { allowed: true, reason: '⚠️ הימנע משימוש בכל האותיות הגדולות', severity: 'warn' }
    }
  }

  // Check repeat messages
  const now = Date.now()
  const tenMinAgo = now - 10 * 60 * 1000
  const recent = recentMessages.filter(m => m.time > tenMinAgo && m.content === content)
  if (recent.length >= REPEAT_THRESHOLD) {
    return {
      allowed: false,
      reason: 'שלחת את אותה ההודעה יותר מדי פעמים. אנא המתן.',
      severity: 'block',
    }
  }

  // Log this message
  recentMessages.push({ content, time: now })
  // Keep array small
  while (recentMessages.length > 50) recentMessages.shift()

  return { allowed: true, severity: 'ok' }
}

export function useAutoMod() {
  return { checkMessage }
}

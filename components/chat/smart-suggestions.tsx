"use client"

import { useMemo } from 'react'
import { Zap } from 'lucide-react'

// Context-aware suggestions for the Israeli telecom community
const SUGGESTION_RULES: Array<{ trigger: RegExp; suggestions: string[] }> = [
  {
    trigger: /עברתי ל/i,
    suggestions: ['פרטנר ומאוד מרוצה', 'גולן ב-39₪ לחודש', 'רמי לוי וחסכתי הרבה', '019 ומשלם 25₪'],
  },
  {
    trigger: /חבילה ב/i,
    suggestions: ['30₪ לחודש', '40₪ עם 50GB', '25₪ עם קו נייד', '55₪ בלי הגבלה'],
  },
  {
    trigger: /מישהו יודע/i,
    suggestions: [
      'כמה עולה חבילה ב-019?',
      'מה הכיסוי של גולן בתל אביב?',
      'אם eSIM עובד בסלקום?',
      'מה הכי זול עם 2 קווים?',
    ],
  },
  {
    trigger: /מחיר.*(פרטנר|סלקום|פלאפון|גולן|רמי|019|הוט)/i,
    suggestions: ['הכי זול שמצאתי הוא ', 'בדקתי ומצאתי ', 'לפי האתר שלהם '],
  },
  {
    trigger: /עזרה|לא עובד|בעיה/i,
    suggestions: [
      'עם חיבור לרשת?',
      'עם eSIM?',
      'עם העברת מספר?',
      'עם שירות הלקוחות?',
    ],
  },
  {
    trigger: /חסכתי/i,
    suggestions: [
      '80₪ בחודש בזכות הקהילה!',
      'מעל 1000₪ בשנה!',
      'על ידי מעבר לגולן טלקום',
      'אחרי שיחה עם שימור לקוחות',
    ],
  },
  {
    trigger: /^שלום|^היי|^הי |^מה שלום/i,
    suggestions: ['לכולם!', 'קהילה 👋', 'צ\'אט 😊', 'לכל הצוות!'],
  },
  {
    trigger: /תודה/i,
    suggestions: [
      'ענקית לכל הקהילה!',
      'לכולם על העזרה!',
      'מיוחדת — עזרתם לי לחסוך!',
    ],
  },
]

interface SmartSuggestionsProps {
  message: string
  onSelect: (suffix: string) => void
}

export function SmartSuggestions({ message, onSelect }: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (message.length < 4) return []
    for (const rule of SUGGESTION_RULES) {
      if (rule.trigger.test(message)) {
        return rule.suggestions.slice(0, 3)
      }
    }
    return []
  }, [message])

  if (suggestions.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 mt-1 animate-in fade-in duration-200">
      <Zap className="w-3 h-3 text-amber-500 shrink-0" />
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(s)}
          className="shrink-0 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-300/40 dark:border-amber-700/40 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition whitespace-nowrap"
        >
          {s}
        </button>
      ))}
    </div>
  )
}

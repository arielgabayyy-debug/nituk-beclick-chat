"use client"

import { useState } from 'react'
import { Shuffle, MessageCircle } from 'lucide-react'

const QUESTIONS = [
  'מה הסיבה הכי גדולה שעזרה לך לחסוך בחשבון הסלולרי? 📱',
  'איזה ספק לדעתך נותן את השירות הכי טוב ב-2024? 🏆',
  'כמה שילמת לסלולרי לפני שהצטרפת לקהילה לעומת אחרי? 💰',
  'מהו הטיפ הכי שימושי שקיבלת בקהילה שלנו? 💡',
  'מה הכי מעצבן אותך בחברות הסלולר? 😤',
  'האם פנקסת מישהו מהמשפחה להחליף ספק? 👨‍👩‍👧',
  'מה הייתה הפעולה הכי קלה שעשית וחסכת הכי הרבה? ✨',
  'כמה שעות בשנה אתה מבלה בשיחות עם שירות לקוחות? 📞',
  'מה הייתה החבילה הכי טובה שמצאת? 📦',
  'איזה אפליקציה הכי שימושית לבדיקת עסקאות סלולר? 📲',
  'מה דעתך על מספרים נייחים בעידן הסלולרי? 🔢',
  'כמה גיגה בממוצע אתה צורך בחודש? 📊',
]

interface IcebreakerProps {
  onAsk?: (question: string) => void
}

export function Icebreaker({ onAsk }: IcebreakerProps) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUESTIONS.length))

  const next = () => setIdx(i => (i + 1) % QUESTIONS.length)

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/20 rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-4 h-4 text-purple-500 shrink-0" />
        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">שאלת הקרח 🧊</p>
      </div>
      <p className="text-sm leading-relaxed mb-3">{QUESTIONS[idx]}</p>
      <div className="flex gap-2">
        <button
          onClick={next}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <Shuffle className="w-3.5 h-3.5" /> שאלה אחרת
        </button>
        {onAsk && (
          <button
            onClick={() => onAsk(QUESTIONS[idx])}
            className="flex-1 text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-lg py-1.5 hover:bg-purple-500/30 transition font-medium"
          >
            שאל את הקהילה →
          </button>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp, Copy, Send } from 'lucide-react'

interface AdminTemplate {
  id: string
  title: string
  content: string
  category: 'welcome' | 'warning' | 'info' | 'promo'
}

const DEFAULT_TEMPLATES: AdminTemplate[] = [
  { id: '1', title: 'ברוכים הבאים', category: 'welcome', content: '👋 ברוכים הבאים לקהילת חיבור וניתוק בקליק! כאן תמצאו עסקאות מצוינות, טיפים שימושיים ואנשים נפלאים. אם יש שאלות — פשוט שאלו! 😊' },
  { id: '2', title: 'זכרו את הכללים', category: 'warning', content: '⚠️ תזכורת ידידותית: נשמח לשמור על שיח מכבד וחיובי. אנא הימנעו מפרסום קישורים חשודים, ספאם ותוכן לא רלוונטי. תודה! 🙏' },
  { id: '3', title: 'עסקה חמה', category: 'promo', content: '🔥 עסקת בלעדי לחברי הקהילה! אם ראיתם עסקה ששווה שיתוף — שתפו כאן ועזרו לחברים לחסוך!' },
  { id: '4', title: 'שאלת שבוע', category: 'info', content: '❓ שאלת השבוע: איזה ספק לדעתכם נותן הכי טוב ערך לכסף בחודש הזה? שתפו בתגובות!' },
  { id: '5', title: 'סגירת נושא', category: 'warning', content: '🔒 הנושא הזה נסגר לדיון. אם יש שאלות נוספות, אנא פתחו שיחה חדשה. תודה על ההבנה!' },
  { id: '6', title: 'טיפ שבועי', category: 'info', content: '💡 טיפ השבוע: תמיד בקשו מנציג שירות לקוחות "הצעת שימור" לפני ביטול — לרוב תקבלו הנחה משמעותית!' },
  { id: '7', title: 'עדכון קהילה', content: '📢 עדכון חשוב לחברי הקהילה: שיפרנו את הצ\'אט עם פיצ\'רים חדשים! בדקו את הכפתור "מה חדש?" בפינה העליונה. תהנו! 🚀', category: 'info' },
  { id: '8', title: 'בקשת משוב', content: '📊 שנייה אחת — נשמח לשמוע! מה הפיצ\'ר שהכי עוזר לכם בצ\'אט? ענו עם מספר:\n1️⃣ חיפוש עסקאות\n2️⃣ השוואת ספקים\n3️⃣ קהילה ועזרה הדדית', category: 'info' },
]

const CATEGORY_COLORS: Record<AdminTemplate['category'], string> = {
  welcome: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  warning: 'bg-red-100 text-red-700 dark:bg-red-900/30',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  promo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
}

const CATEGORY_LABELS: Record<AdminTemplate['category'], string> = {
  welcome: '👋 ברכות',
  warning: '⚠️ אזהרה',
  info: '📢 מידע',
  promo: '🔥 פרומו',
}

interface AdminTemplatesProps {
  onSend: (content: string) => void
}

export function AdminTemplates({ onSend }: AdminTemplatesProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<AdminTemplate['category'] | 'all'>('all')

  const filtered = filter === 'all' ? DEFAULT_TEMPLATES : DEFAULT_TEMPLATES.filter(t => t.category === filter)

  return (
    <div className="border border-purple-400/20 rounded-xl overflow-hidden bg-purple-500/5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-purple-500/5 transition"
      >
        <Shield className="w-4 h-4 text-purple-500 shrink-0" />
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">תבניות אדמין</span>
        <span className="mr-auto text-xs text-muted-foreground">{DEFAULT_TEMPLATES.length} תבניות</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-purple-400/20">
          {/* Category filter */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto">
            {(['all', 'welcome', 'info', 'promo', 'warning'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full transition ${filter === cat ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80'}`}
              >
                {cat === 'all' ? 'הכל' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Templates */}
          <div className="divide-y divide-purple-400/10 max-h-48 overflow-y-auto">
            {filtered.map(tpl => (
              <div key={tpl.id} className="px-3 py-2.5 hover:bg-purple-500/5 transition group">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[tpl.category]}`}>
                    {CATEGORY_LABELS[tpl.category]}
                  </span>
                  <span className="text-xs font-medium">{tpl.title}</span>
                  <div className="flex gap-1 mr-auto opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => { navigator.clipboard.writeText(tpl.content); setCopied(tpl.id); setTimeout(() => setCopied(null), 1500) }}
                      className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition"
                      title="העתק"
                    >
                      <Copy className="w-3 h-3 text-purple-500" />
                    </button>
                    <button
                      onClick={() => onSend(tpl.content)}
                      className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition"
                      title="שלח"
                    >
                      <Send className="w-3 h-3 text-purple-500" />
                    </button>
                  </div>
                  {copied === tpl.id && <span className="text-[10px] text-emerald-500 font-medium">הועתק!</span>}
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{tpl.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

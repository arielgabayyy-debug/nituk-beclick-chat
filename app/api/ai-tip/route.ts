import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// Per-IP rate limit: 10 AI queries / 60s (prevents API cost abuse)
const aiRateMap = new Map<string, { count: number; reset: number }>()
function checkAiRate(ip: string): boolean {
  const now = Date.now()
  const entry = aiRateMap.get(ip)
  if (!entry || now > entry.reset) { aiRateMap.set(ip, { count: 1, reset: now + 60_000 }); return true }
  if (entry.count >= 10) return false
  entry.count++; return true
}

const SYSTEM_PROMPT = `אתה עוזר AI של קהילת "חיבור וניתוק בקליק" — קהילת השוואת מחירים סלולר בישראל.
תפקידך לעזור לחברים לחסוך כסף על חבילות סלולר, אינטרנט, וטלפון.

כללים:
- ענה תמיד בעברית, קצר ולעניין (מקסימום 3-4 משפטים)
- ציין מחירים בשקלים (₪) בלבד
- המלץ רק על ספקים ישראלים: פרטנר, סלקום, פלאפון, הוט מובייל, גולן טלקום, רמי לוי, 019, HOT
- תן טיפים ספציפיים וניתנים לפעולה
- אם אינך יודע — אמור בכנות
- אל תבטיח מחירים — אמור "סביב" או "בממוצע"`

const MAX_QUESTION_LENGTH = 500

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkAiRate(ip)) return NextResponse.json({ error: 'יותר מדי שאלות — נסה שוב עוד דקה', source: 'fallback' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 }) }
  const { question } = body as { question?: unknown }

  if (!question || typeof question !== 'string' || !question.trim()) {
    return NextResponse.json({ error: 'שאלה ריקה' }, { status: 400 })
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: 'שאלה ארוכה מדי (מקסימום 500 תווים)' }, { status: 400 })
  }

  const sanitizedQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH)
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Return a smart fallback without AI
    const fallback = generateFallbackTip(sanitizedQuestion)
    return NextResponse.json({ answer: fallback, source: 'fallback' })
  }

  try {
    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: sanitizedQuestion },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      })

      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const answer = data.choices[0]?.message?.content?.trim()
        if (answer) return NextResponse.json({ answer, source: 'openai' })
      }
    }

    // Fallback
    return NextResponse.json({ answer: generateFallbackTip(sanitizedQuestion), source: 'fallback' })
  } catch {
    return NextResponse.json({ answer: generateFallbackTip(sanitizedQuestion), source: 'fallback' })
  }
}

function generateFallbackTip(question: string): string {
  const q = question.toLowerCase()

  if (q.includes('זול') || q.includes('חסכ') || q.includes('מחיר')) {
    return '💡 לחיסכון מקסימלי: בדוק את רמי לוי ו-019 — לרוב הזולים ביותר. גם גולן טלקום ידועה במחירים טובים. תמיד בקש "הצעת שימור" לפני ביטול — זה עובד 80% מהמקרים!'
  }
  if (q.includes('גולן') || q.includes('010') || q.includes('מסנן')) {
    return '📱 גולן טלקום: חבילות ב-39-55₪ עם נפח נדיב. פועלים על רשת Cellcom — כיסוי טוב רוב הארץ. מתאים למשתמשים שרוצים מחיר ולא רוצים לחשוב יותר מדי.'
  }
  if (q.includes('שימור') || q.includes('הנחה') || q.includes('עזוב')) {
    return '🎯 טיפ מוכח: התקשר לשימור לקוחות ואמור שאתה שוקל לעבור. בקש "מה הכי טוב שאתם יכולים להציע". לרוב תקבל הנחה של 20-40% מיד! עובד בכל החברות.'
  }
  if (q.includes('esim') || q.includes('sim')) {
    return '📲 eSIM זמין היום ברוב החברות הגדולות. היתרון: אין צורך בכרטיס פיזי, מעבר תוך דקות. חיסרון: חלק מהמכשירים הישנים לא תומכים. בדוק במפרט הטכני של המכשיר שלך.'
  }
  if (q.includes('חבילה') || q.includes('גיגה') || q.includes('נפח')) {
    return '📊 הכלל: לא צריך לשלם על גיגות שלא תשתמש בהן. בדוק בהגדרות הטלפון כמה צרכת בחודש האחרון ובחר בהתאם. מרוב הספקים אפשר לשנות חבילה כל חודש בלי קנס.'
  }
  return '💡 טיפ כללי: השווה מחירים לפחות פעם בשנה — השוק משתנה! הקהילה שלנו תמיד מעודכנת בעסקאות הכי טובות. שאל כאן ותמיד תמצא עזרה 😊'
}

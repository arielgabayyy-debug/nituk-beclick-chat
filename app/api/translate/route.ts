import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimitDB } from '@/lib/rate-limit-db'

// Language codes for MyMemory API
const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar',
  ru: 'ru-RU',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  uk: 'uk-UA',
  he: 'he-IL',
}

// Detect if text is Hebrew/RTL
function detectLang(text: string): string {
  const hebrewChars = (text.match(/[֐-׿]/g) || []).length
  const arabicChars = (text.match(/[؀-ۿ]/g) || []).length
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length
  const russianChars = (text.match(/[Ѐ-ӿ]/g) || []).length

  if (hebrewChars > 2) return 'he'
  if (arabicChars > latinChars) return 'ar'
  if (russianChars > latinChars) return 'ru'
  return 'en'
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimitDB(ip, 'translate', 20, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'יותר מדי בקשות תרגום — נסה שוב בעוד דקה' }, { status: 429 })
  }

  try {
    const { text, targetLang, sourceLang } = await request.json() as {
      text: string
      targetLang: string
      sourceLang?: string
    }

    if (!text?.trim() || !targetLang) {
      return NextResponse.json({ error: 'חסר טקסט או שפת יעד' }, { status: 400 })
    }

    const cleanText = text.trim().slice(0, 500) // limit length
    const from = sourceLang || detectLang(cleanText)
    const to = targetLang

    if (from === to) {
      return NextResponse.json({ translated: cleanText, from, to })
    }

    const fromCode = LANG_MAP[from] || from
    const toCode = LANG_MAP[to] || to

    // ── Primary: MyMemory API (free, reliable, no key needed) ─────────────
    try {
      const myMemoryEmail = process.env.MYMEMORY_EMAIL || ''
      const deParam = myMemoryEmail ? `&de=${encodeURIComponent(myMemoryEmail)}` : ''
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${fromCode}|${toCode}${deParam}`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })

      if (res.ok) {
        const data = await res.json() as {
          responseStatus: number
          responseData: { translatedText: string }
          quotaFinished?: boolean
        }

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText
          // MyMemory sometimes returns the original on failure
          if (translated !== cleanText && !translated.includes('MYMEMORY WARNING')) {
            return NextResponse.json(
              { translated, from, to, source: 'mymemory' },
              { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
            )
          }
        }
      }
    } catch { /* fall through to next provider */ }

    // ── Fallback: LibreTranslate public instance ───────────────────────────
    try {
      const res = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: cleanText, source: from, target: to, format: 'text' }),
        signal: AbortSignal.timeout(6000),
      })

      if (res.ok) {
        const data = await res.json() as { translatedText?: string }
        if (data.translatedText) {
          return NextResponse.json(
            { translated: data.translatedText, from, to, source: 'libretranslate' },
            { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
          )
        }
      }
    } catch { /* fall through */ }

    // ── Final fallback: indicate failure cleanly ───────────────────────────
    return NextResponse.json(
      { error: 'שירות התרגום לא זמין כרגע. נסה שוב מאוחר יותר.' },
      { status: 503 }
    )
  } catch (err) {
    console.error('translate error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}

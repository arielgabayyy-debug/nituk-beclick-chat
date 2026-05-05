/**
 * Distributed rate limiting via Supabase — works across all serverless instances.
 * Falls back to allowing the request if Supabase is unavailable (fail-open).
 *
 * Uses a sliding window: counts rows in rate_limits for (ip, endpoint)
 * within the last `windowSeconds` seconds.
 * A 5% random cleanup runs on insert to keep the table small.
 */

import { createClient } from '@supabase/supabase-js'

// Module-level singleton — reused across warm invocations
let _supabase: ReturnType<typeof createClient> | null = null
function getClient() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _supabase
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

/**
 * Check and record a rate-limited request.
 * @param ip       Client IP address
 * @param endpoint Short identifier for the route, e.g. 'link-preview'
 * @param max      Max requests per window
 * @param windowSeconds  Window size in seconds
 */
export async function checkRateLimitDB(
  ip: string,
  endpoint: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const sb = getClient()
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString()

    // Count existing requests in window
    const { count, error: countErr } = await sb
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', since)

    if (countErr) {
      console.error('[rate-limit-db] count error:', countErr.message)
      return { allowed: true, remaining: max, limit: max } // fail-open
    }

    const current = count ?? 0

    if (current >= max) {
      return { allowed: false, remaining: 0, limit: max }
    }

    // Record this request (fire-and-forget — don't await)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.from('rate_limits').insert({ ip, endpoint } as any).then(({ error }) => {
      if (error) console.error('[rate-limit-db] insert error:', error.message)
    })

    return { allowed: true, remaining: max - current - 1, limit: max }
  } catch (err) {
    console.error('[rate-limit-db] unexpected error:', err)
    return { allowed: true, remaining: max, limit: max } // fail-open
  }
}

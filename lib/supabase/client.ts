import { createBrowserClient } from '@supabase/ssr'

// Module-level singleton — reuse the same client across all imports
// (avoids creating redundant WebSocket connections and auth listeners)
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _client
}

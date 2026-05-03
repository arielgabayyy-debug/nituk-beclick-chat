"use client"

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LoadingScreen } from '@/components/chat/loading-screen'

export default function LoginPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const provider = params.get('provider') as 'google' | 'facebook' | null
    const returnTo = params.get('return') || 'https://nitukbeclick.co.il/צאט-קהילתי'

    if (!provider) {
      window.location.href = '/'
      return
    }

    const doLogin = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `https://nituk-beclick-chat.vercel.app/auth/callback?return=${encodeURIComponent(returnTo)}`,
          skipBrowserRedirect: true,
        }
      })
      if (data?.url) {
        window.location.href = data.url
      }
    }

    doLogin()
  }, [])

  return <LoadingScreen message="מתחבר..." />
}

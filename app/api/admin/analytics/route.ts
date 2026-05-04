import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Messages per day
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('created_at, user_id')
      .gte('created_at', since)
      .order('created_at')

    // Users total + recent
    const { count: totalUsers } = await supabase
      .from('chat_users')
      .select('*', { count: 'exact', head: true })

    const { count: newUsers } = await supabase
      .from('chat_users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    // Active users (sent at least 1 message)
    const activeUserIds = [...new Set((messages || []).map(m => m.user_id))]

    // Messages per day aggregation
    const byDay: Record<string, number> = {}
    const byHour: Record<number, number> = {}
    ;(messages || []).forEach(m => {
      const day = m.created_at.slice(0, 10)
      byDay[day] = (byDay[day] || 0) + 1
      const hour = new Date(m.created_at).getHours()
      byHour[hour] = (byHour[hour] || 0) + 1
    })

    // Peak hour
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]?.[0]

    // Daily chart data (fill missing days)
    const dailyData: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      dailyData.push({ date: key, count: byDay[key] || 0 })
    }

    // Top users by message count
    const userMsgCount: Record<string, number> = {}
    ;(messages || []).forEach(m => {
      userMsgCount[m.user_id] = (userMsgCount[m.user_id] || 0) + 1
    })
    const topUserIds = Object.entries(userMsgCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    const { data: topUsers } = topUserIds.length > 0
      ? await supabase.from('chat_users').select('id, name, user_type, avatar_color, messages_count').in('id', topUserIds)
      : { data: [] }

    const topUsersWithCount = (topUsers || []).map(u => ({
      ...u,
      recentMessages: userMsgCount[u.id] || 0,
    })).sort((a, b) => b.recentMessages - a.recentMessages)

    return NextResponse.json({
      totalMessages: (messages || []).length,
      totalUsers: totalUsers || 0,
      newUsers: newUsers || 0,
      activeUsers: activeUserIds.length,
      peakHour: peakHour ? parseInt(peakHour) : null,
      avgMessagesPerDay: Math.round((messages || []).length / days),
      dailyData,
      topUsers: topUsersWithCount,
      hourlyData: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: byHour[i] || 0 })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

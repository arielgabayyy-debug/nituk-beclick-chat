import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminRequest } from '@/lib/admin-auth'

const VALID_USER_TYPES = new Set(['guest', 'subscriber', 'newsletter', 'admin', 'blocked'])

// Points limits for award operations
const MIN_POINTS_DELTA = -10000
const MAX_POINTS_DELTA = 10000
const MAX_ABSOLUTE_POINTS = 999999

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function logAudit(
  supabase: ReturnType<typeof admin>,
  action: string,
  target_id: string,
  target_type: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('admin_audit_log').insert({ action, target_id, target_type, details })
  } catch { /* non-fatal */ }
}

export async function PATCH(req: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action, userId, value } = body as {
    action?: unknown; userId?: unknown; value?: unknown
  }

  // Validate userId
  if (!userId || typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  const supabase = admin()

  switch (action) {
    case 'block_user': {
      // Prevent self-block
      const { data: targetUser } = await supabase
        .from('chat_users')
        .select('email, name, user_type')
        .eq('id', userId)
        .single()

      if (targetUser?.email?.toLowerCase() === auth.email.toLowerCase()) {
        return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
      }
      if (targetUser?.user_type === 'admin') {
        return NextResponse.json({ error: 'Cannot block another admin' }, { status: 400 })
      }

      const { error } = await supabase
        .from('chat_users')
        .update({ user_type: 'blocked', is_online: false })
        .eq('id', userId)
      if (error) { console.error('[users/block]', error); return NextResponse.json({ error: 'Failed to block user' }, { status: 500 }) }

      await logAudit(supabase, 'block_user', userId, 'user', {
        admin_email: auth.email,
        target_name: targetUser?.name,
        target_email: targetUser?.email,
        previous_type: targetUser?.user_type,
      })
      return NextResponse.json({ ok: true })
    }

    case 'unblock_user': {
      const { data: targetUser } = await supabase
        .from('chat_users')
        .select('email, name, user_type')
        .eq('id', userId)
        .single()

      const { error } = await supabase
        .from('chat_users')
        .update({ user_type: 'guest' })
        .eq('id', userId)
      if (error) { console.error('[users/unblock]', error); return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 }) }

      await logAudit(supabase, 'unblock_user', userId, 'user', {
        admin_email: auth.email,
        target_name: targetUser?.name,
      })
      return NextResponse.json({ ok: true })
    }

    case 'promote_user': {
      if (!value || typeof value !== 'string' || !VALID_USER_TYPES.has(value)) {
        return NextResponse.json({ error: 'Invalid user_type value' }, { status: 400 })
      }

      const { data: targetUser } = await supabase
        .from('chat_users')
        .select('email, name, user_type')
        .eq('id', userId)
        .single()

      const { error } = await supabase
        .from('chat_users')
        .update({ user_type: value })
        .eq('id', userId)
      if (error) { console.error('[users/promote]', error); return NextResponse.json({ error: 'Failed to update user type' }, { status: 500 }) }

      await logAudit(supabase, 'promote_user', userId, 'user', {
        admin_email: auth.email,
        target_name: targetUser?.name,
        previous_type: targetUser?.user_type,
        new_type: value,
      })
      return NextResponse.json({ ok: true })
    }

    case 'award_points': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return NextResponse.json({ error: 'Points delta must be an integer' }, { status: 400 })
      }
      if (value < MIN_POINTS_DELTA || value > MAX_POINTS_DELTA) {
        return NextResponse.json({ error: `Points delta must be between ${MIN_POINTS_DELTA} and ${MAX_POINTS_DELTA}` }, { status: 400 })
      }

      const { data: targetUser } = await supabase
        .from('chat_users')
        .select('name, points')
        .eq('id', userId)
        .single()

      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const newPts = Math.max(0, Math.min(MAX_ABSOLUTE_POINTS, (targetUser.points || 0) + value))
      const { error } = await supabase
        .from('chat_users')
        .update({ points: newPts })
        .eq('id', userId)
      if (error) { console.error('[users/award_points]', error); return NextResponse.json({ error: 'Failed to update points' }, { status: 500 }) }

      await logAudit(supabase, 'award_points', userId, 'user', {
        admin_email: auth.email,
        target_name: targetUser.name,
        delta: value,
        old_points: targetUser.points,
        new_points: newPts,
      })
      return NextResponse.json({ ok: true, newPoints: newPts })
    }

    case 'set_user_of_week': {
      const { data: targetUser } = await supabase
        .from('chat_users')
        .select('name')
        .eq('id', userId)
        .single()

      // Clear all first, then set the winner
      await supabase.from('chat_users').update({ is_user_of_week: false }).neq('id', userId)
      const { error } = await supabase
        .from('chat_users')
        .update({ is_user_of_week: true })
        .eq('id', userId)
      if (error) { console.error('[users/set_user_of_week]', error); return NextResponse.json({ error: 'Failed to set user of week' }, { status: 500 }) }

      await logAudit(supabase, 'set_user_of_week', userId, 'user', {
        admin_email: auth.email,
        target_name: targetUser?.name,
      })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  // Server-side admin verification (defense in depth beyond middleware)
  const auth = await verifyAdminRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('id')

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  const supabase = admin()

  // Get user info before deleting for the audit log
  const { data: targetUser } = await supabase
    .from('chat_users')
    .select('email, name, user_type')
    .eq('id', userId)
    .single()

  // Prevent self-deletion and deletion of other admins
  if (targetUser?.email?.toLowerCase() === auth.email.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }
  if (targetUser?.user_type === 'admin') {
    return NextResponse.json({ error: 'Cannot delete another admin' }, { status: 400 })
  }

  const { error } = await supabase.from('chat_users').delete().eq('id', userId)
  if (error) { console.error('[users/delete]', error); return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 }) }

  await logAudit(supabase, 'delete_user', userId, 'user', {
    admin_email: auth.email,
    deleted_name: targetUser?.name,
    deleted_email: targetUser?.email,
    deleted_type: targetUser?.user_type,
  })

  return NextResponse.json({ ok: true })
}

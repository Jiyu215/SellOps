import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/requireAuth'

const VALID_TYPES   = ['order', 'inventory', 'product', 'system'] as const
const VALID_LEVELS  = ['critical', 'warning', 'info'] as const
const VALID_PERIODS = ['today', '7d', '30d'] as const

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const type   = searchParams.get('type')
    const level  = searchParams.get('level')
    const period = searchParams.get('period')
    const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit  = Math.min(Math.max(1, Number(searchParams.get('limit') ?? 20)), 100)
    const from   = (page - 1) * limit
    const to     = from + limit - 1

    const supabaseAdmin = getSupabaseAdmin()

    // ── 필터 적용 목록 쿼리 ──
    let query = supabaseAdmin
      .from('notifications')
      .select('id, type, level, title, message, link, is_read, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status === 'unread') {
      query = query.eq('is_read', false)
    }
    if (type && (VALID_TYPES as readonly string[]).includes(type)) {
      query = query.eq('type', type)
    }
    if (level && (VALID_LEVELS as readonly string[]).includes(level)) {
      query = query.eq('level', level)
    }
    if (period && (VALID_PERIODS as readonly string[]).includes(period)) {
      if (period === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (period === '7d') {
        query = query.gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
      } else if (period === '30d') {
        query = query.gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      }
    }

    // ── SummaryBar 집계 (필터 무관, 전체 기준) ──
    const [listResult, summaryResult] = await Promise.all([
      query,
      supabaseAdmin
        .from('notifications')
        .select('level, is_read'),
    ])

    if (listResult.error) throw listResult.error

    const summaryRows = summaryResult.data ?? []
    const summary = {
      total:    summaryRows.length,
      unread:   summaryRows.filter((n) => !n.is_read).length,
      critical: summaryRows.filter((n) => n.level === 'critical' && !n.is_read).length,
      warning:  summaryRows.filter((n) => n.level === 'warning'  && !n.is_read).length,
    }

    // 기존 Bell 드롭다운 호환용 summary 필드도 포함
    const items = listResult.data ?? []
    return NextResponse.json({
      items,
      total:   listResult.count ?? 0,
      page,
      limit,
      summary,
    })
  } catch {
    return NextResponse.json(
      { error: '알림 조회에 실패했습니다.' },
      { status: 500 },
    )
  }
}

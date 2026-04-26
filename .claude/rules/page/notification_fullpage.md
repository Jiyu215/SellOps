# 알림 전체보기 페이지 (`/notifications`)

## 0. 페이지 개요

| 항목 | 내용 |
|------|------|
| 경로 | `/notifications` |
| 진입 방식 | Bell 패널 하단 `전체보기` 클릭 |
| 목적 | 전체 알림 이력 탐색, 필터링, 일괄 처리 |
| 레이아웃 | GNB + 사이드바 유지, 컨텐츠 영역 교체 |

---

## 1. 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  GNB (헤더)                                                 │
├──────────┬──────────────────────────────────────────────────┤
│          │  PageHeader                                      │
│          │  알림                    [전체 읽음 처리]        │
│          ├──────────────────────────────────────────────────┤
│  사이드바 │  SummaryBar                                     │
│  (GNB)   │  전체 N | 미확인 N | critical N | warning N     │
│          ├──────────────────────────────────────────────────┤
│          │  FilterBar                                       │
│          │  [전체 | 미확인]  [카테고리▼]  [레벨▼]  [기간▼] │
│          ├──────────────────────────────────────────────────┤
│          │  NotificationList                                │
│          │                                                  │
│          │  ── 오늘 ──────────────────────────────────      │
│          │  [알림 행]                                       │
│          │  [알림 행]                                       │
│          │                                                  │
│          │  ── 어제 ──────────────────────────────────      │
│          │  [알림 행]                                       │
│          │                                                  │
│          │  ── 이전 ──────────────────────────────────      │
│          │  [알림 행]                                       │
│          ├──────────────────────────────────────────────────┤
│          │  Pagination                                      │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 2. PageHeader

```
┌─────────────────────────────────────────────────────────────┐
│  알림                                    [전체 읽음 처리]   │
│  총 128건 · 미확인 12건                                     │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | 설명 |
|------|------|
| 타이틀 | `알림` (h1) |
| 보조 텍스트 | 현재 필터 기준 총 건수 · 미확인 건수 |
| 전체 읽음 처리 | 미확인 알림이 있을 때만 활성화 |

---

## 3. SummaryBar

Shopify Admin의 알림 피드에서는 알림을 읽음/안읽음으로 토글하거나 전체 읽음 처리를 할 수 있다. 이를 기반으로 상태별 집계를 상단에 표시해요.

```
┌──────────┬──────────┬──────────┬──────────┐
│  전체     │  미확인   │  긴급    │  주의    │
│  128건   │  12건    │  3건     │  9건     │
└──────────┴──────────┴──────────┴──────────┘
```

- 클릭 시 해당 필터 즉시 적용
- `critical` 건수가 있으면 빨간 강조
- 현재 활성 탭 하이라이트

---

## 4. FilterBar

```
[전체] [미확인]    [카테고리 ▼]  [레벨 ▼]  [기간 ▼]    [초기화]
```

### 읽음 상태 탭

| 탭 | 필터 조건 |
|----|---------|
| 전체 | 없음 |
| 미확인 | `is_read = false` |

### 카테고리 필터 (Dropdown)

| 옵션 | `type` 값 |
|------|---------|
| 전체 카테고리 | - |
| 주문 | `order` |
| 재고 | `inventory` |
| 상품 | `product` |
| 시스템 | `system` |

### 레벨 필터 (Dropdown)

| 옵션 | `level` 값 |
|------|----------|
| 전체 레벨 | - |
| 긴급 | `critical` |
| 주의 | `warning` |
| 정보 | `info` |

### 기간 필터 (Dropdown)

| 옵션 | 조건 |
|------|------|
| 전체 기간 | - |
| 오늘 | `created_at >= today 00:00` |
| 최근 7일 | `created_at >= now - 7d` |
| 최근 30일 | `created_at >= now - 30d` |

### URL 쿼리 파라미터 동기화

```
/notifications?status=unread&type=inventory&level=critical&period=7d
```

---

## 5. NotificationList

### 날짜 그룹 구분선

효과적인 대시보드 디자인은 정보의 계층 구조를 명확히 해야 하며, 사용자가 필요한 정보를 쉽게 찾을 수 있도록 해야 한다. 알림은 날짜별로 그룹핑하여 시간적 맥락을 제공해요.

```
── 오늘 (2026.04.25) ──────────────────────────────────────
── 어제 ───────────────────────────────────────────────────
── 이번 주 ────────────────────────────────────────────────
── 이전 ───────────────────────────────────────────────────
```

### 알림 행 (NotificationRow)

```
┌──────────────────────────────────────────────────────────────┐
│ ● 🔴  [재고] 나이키 에어맥스 90 재고가 소진되었습니다.       │
│        재고 관리에서 즉시 확인 후 입고 처리해주세요.          │
│        재고 관리로 이동 →                    5분 전  [⋯]    │
├──────────────────────────────────────────────────────────────┤
│   🔵  [주문] 새 주문이 접수되었습니다. (#1042)               │
│        고객: 홍길동 / 금액: ₩89,000                         │
│        주문 관리로 이동 →                    23분 전  [⋯]   │
└──────────────────────────────────────────────────────────────┘
```

### 알림 행 구성 요소

| 요소 | 설명 |
|------|------|
| 미확인 점 `●` | `is_read = false` 시 좌측 파란 점 |
| 레벨 아이콘 | 🔴 critical / 🟡 warning / 🔵 info |
| 카테고리 뱃지 | `[재고]` `[주문]` `[상품]` `[시스템]` |
| 제목 | `title` — bold, 미확인 시 더 진하게 |
| 내용 | `message` — 2줄 말줄임 처리 |
| 바로가기 | `link`가 있을 때만 노출, 클릭 시 해당 페이지 이동 |
| 시간 | 상대 시간 (`5분 전`, `3시간 전`, `2일 전`) |
| 더보기 버튼 `[⋯]` | hover 시 노출 — 읽음 처리 / 삭제 |

### 행 인터랙션

| 동작 | 결과 |
|------|------|
| 행 클릭 | 읽음 처리 + `link` 있으면 이동 |
| `바로가기` 클릭 | 해당 페이지 이동 |
| `[⋯]` → 읽음 처리 | 해당 알림 `is_read = true` |
| `[⋯]` → 삭제 | 해당 알림 삭제 (확인 없이) |
| 미확인 행 배경 | 살짝 다른 배경색으로 구분 |

---

## 6. 빈 상태 (Empty State)

### 필터 적용 후 결과 없음

```
        [알림 아이콘]
   해당 조건의 알림이 없습니다.
  다른 필터 조건으로 검색해보세요.
      [필터 초기화]
```

### 알림 자체가 없음

```
        [체크 아이콘]
   모든 알림을 확인했습니다.
  새로운 알림이 생기면 여기에 표시됩니다.
```

---

## 7. Pagination

```
[20개 ▼]    [이전]  1  2  3  …  [다음]    총 128건
```

| 항목 | 상세 |
|------|------|
| 페이지당 수 | 20 / 50 / 100 (기본 20) |
| URL 반영 | `?page=2&limit=20` |

---

## 8. 성능 요구사항

| 항목 | 목표 |
|------|------|
| 최초 로딩 | < 1초 |
| 필터 갱신 | < 500ms |
| 읽음 처리 응답 | Optimistic Update (즉시 반영) |

---

## 9. 반응형

| Breakpoint | 변화 |
|------------|------|
| `≥ 1024px` | 전체 레이아웃 |
| `768px ~ 1023px` | SummaryBar 2×2 그리드 |
| `< 768px` | SummaryBar 스크롤, 행 내 바로가기 숨김 |

---

## 10. API

### 알림 목록 조회 (기존 route.ts 확장)

```
GET /api/notifications
Query: {
  status?:  'unread'
  type?:    'order' | 'inventory' | 'product' | 'system'
  level?:   'critical' | 'warning' | 'info'
  period?:  'today' | '7d' | '30d'
  page?:    number
  limit?:   number
}
Response: {
  items: Notification[]
  total: number
  page: number
  limit: number
  summary: {
    total: number
    unread: number
    critical: number
    warning: number
  }
}
```

### 개별 삭제 (신규)

```
DELETE /api/notifications/[id]
```

### 기존 API (재사용)

```
PATCH /api/notifications/[id]/read    ← 개별 읽음
PATCH /api/notifications/read-all     ← 전체 읽음
```

---

## 11. Route Handler 추가분

`src/app/api/notifications/route.ts` — GET 핸들러 확장

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')       // 'unread' | null
  const type   = searchParams.get('type')
  const level  = searchParams.get('level')
  const period = searchParams.get('period')
  const page   = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit  = Number(searchParams.get('limit') ?? 20)
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  const supabase = createClient()

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status === 'unread') query = query.eq('is_read', false)
  if (type)   query = query.eq('type', type)
  if (level)  query = query.eq('level', level)

  if (period === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    query = query.gte('created_at', today.toISOString())
  } else if (period === '7d') {
    query = query.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
  } else if (period === '30d') {
    query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  }

  const { data, count, error } = await query
  if (error) throw error

  // SummaryBar용 집계 (필터 무관)
  const { data: summaryData } = await supabase
    .from('notifications')
    .select('level, is_read')

  const summary = {
    total:    summaryData?.length ?? 0,
    unread:   summaryData?.filter(n => !n.is_read).length ?? 0,
    critical: summaryData?.filter(n => n.level === 'critical' && !n.is_read).length ?? 0,
    warning:  summaryData?.filter(n => n.level === 'warning' && !n.is_read).length ?? 0,
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    limit,
    summary,
  })
}
```

`src/app/api/notifications/[id]/route.ts` — DELETE 추가

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

---

## 12. 타입 추가

`src/features/notifications/types/notification.types.ts` 에 추가

```ts
export type NotificationListQuery = {
  status?: 'unread'
  type?: NotificationType
  level?: NotificationLevel
  period?: 'today' | '7d' | '30d'
  page?: number
  limit?: number
}

export type NotificationListResponse = {
  items: Notification[]
  total: number
  page: number
  limit: number
  summary: {
    total: number
    unread: number
    critical: number
    warning: number
  }
}
```

---

## 13. 작업 체크리스트

```
□ GET /api/notifications 필터 파라미터 확장 (type, level, period)
□ DELETE /api/notifications/[id] 신규 생성
□ notification.types.ts — NotificationListQuery, NotificationListResponse 추가
□ notification.api.ts — fetchNotifications, deleteNotification 함수 작성
□ app/(dashboard)/notifications/page.tsx 생성
□ NotificationSummaryBar.tsx — 집계 탭, 클릭 필터 연동
□ NotificationFilterBar.tsx — 읽음상태·카테고리·레벨·기간 필터, URL 동기화
□ NotificationList.tsx — 날짜 그룹 구분선 렌더링
□ NotificationRow.tsx — 레벨 아이콘·뱃지·바로가기·더보기 메뉴
□ NotificationEmptyState.tsx — 필터 결과 없음 / 전체 없음 분기
□ 읽음 처리 Optimistic Update 적용
□ 개별 삭제 적용
□ 전체 읽음 처리 연동
□ URL 쿼리 파라미터 동기화 (필터 상태 ↔ URL)
□ 반응형 처리 (SummaryBar 모바일 대응)
□ 로딩 — Skeleton Row UI 적용
□ Bell 패널 `전체보기` 링크 → /notifications 연결
```
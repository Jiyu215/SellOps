# 알림(Notification) 시스템

## 1. 알림 시스템 개요
 
### 실제 기업 기준 알림 분류
 
Shopify Admin의 Alerts feed는 운영자에게 중요하고 시간에 민감한 정보 또는 조치가 필요한 항목을 알려주며, 비즈니스 운영에 방해가 될 수 있는 이슈, 정책 공지, 트랜잭션 확인 등을 포함한다.

| 레벨 | 의미 | 색상 |
|------|------|------|
| `critical` | 즉각 조치 필요 (매출 영향) | 🔴 Red |
| `warning` | 주의 필요 (선제적 대응) | 🟡 Amber |
| `info` | 참고 정보 (확인 권장) | 🔵 Blue |

---

## 2. 알림 카테고리 및 항목
 
### 2-1. 주문 알림 (Order)
 
Shopify는 주문 접수 및 스토어 이벤트 발생 시 스태프에게 알림을 전송
 
| 알림 항목 | 레벨 | 트리거 조건 | 메시지 예시 |
|---------|------|-----------|------------|
| 신규 주문 접수 | `info` | 주문 생성 시 | `새 주문이 접수되었습니다. (주문번호: #1042)` |
| 미처리 주문 누적 | `warning` | 미처리 주문 10건 이상 | `미처리 주문 12건이 대기 중입니다.` |
| 미처리 주문 장기 적체 | `critical` | 접수 후 24시간 미처리 | `주문 #1035가 24시간 이상 미처리 상태입니다.` |
| 주문 취소 요청 | `warning` | 취소 요청 발생 시 | `주문 #1038 취소 요청이 접수되었습니다.` |
| 환불 처리 완료 | `info` | 환불 완료 시 | `주문 #1033 환불이 완료되었습니다.` |

### 2-2. 재고 알림 (Inventory)
 
Shopify의 재고 알림은 상품 재고가 설정한 임계값에 도달하면 자동으로 알림을 트리거하며, 예를 들어 10개로 설정 시 재고가 10개 이하가 되면 알림이 발송된다.
 
재고 부족 알림 앱은 재고 수준이 사전에 설정한 임계값 아래로 내려갈 때마다 알림을 전송하며, 이를 통해 적시에 재주문을 하고 품절을 방지할 수 있다.
 
| 알림 항목 | 레벨 | 트리거 조건 | 메시지 예시 |
|---------|------|-----------|------------|
| 재고 부족 임박 | `warning` | `available <= 9` | `[나이키 에어맥스] 재고가 5개 남았습니다.` |
| 재고 소진 (품절) | `critical` | `available = 0` | `[나이키 에어맥스] 재고가 소진되었습니다.` |
| 품절 상품 판매중 상태 | `critical` | `available = 0` AND `status = 'active'` | `[상품명] 재고가 없지만 판매중 상태입니다. 상태를 변경해주세요.` |
| 다수 상품 동시 품절 | `critical` | 품절 상품 3개 이상 동시 발생 | `3개 상품이 동시에 품절되었습니다.` |
| 재고 수동 조정 완료 | `info` | 입고/출고 조정 시 | `[상품명] 재고가 50개 입고 처리되었습니다.` |
 
**재고 부족 임계값 기준**
 
| 구간 | 분류 | 알림 레벨 |
|------|------|---------|
| `available >= 10` | 정상 | 알림 없음 |
| `1 ~ 9` | 부족 임박 | `warning` |
| `0` | 품절 | `critical` |
 
 
### 2-3. 상품 알림 (Product)
 
| 알림 항목 | 레벨 | 트리거 조건 | 메시지 예시 |
|---------|------|-----------|------------|
| 상품 등록 완료 | `info` | 신규 상품 저장 시 | `[상품명] 상품이 등록되었습니다.` |
| 상품 일괄 상태 변경 | `info` | 일괄 작업 완료 시 | `5개 상품이 숨김 처리되었습니다.` |
| 상품 일괄 삭제 | `warning` | 일괄 삭제 완료 시 | `3개 상품이 삭제되었습니다.` |
| 숨김 상품 장기 유지 | `warning` | 숨김 상태 30일 이상 | `[상품명]이 30일 이상 숨김 상태입니다.` |
 
### 2-4. 시스템 알림 (System)
 
| 알림 항목 | 레벨 | 트리거 조건 | 메시지 예시 |
|---------|------|-----------|------------|
| 이미지 업로드 실패 | `warning` | Storage 업로드 오류 시 | `이미지 업로드에 실패했습니다. 다시 시도해주세요.` |
| CSV Export 완료 | `info` | Export 완료 시 | `CSV 파일 내보내기가 완료되었습니다.` |
| 대용량 작업 완료 | `info` | 일괄 처리 완료 시 | `100개 상품 일괄 처리가 완료되었습니다.` |

---

## 3. 알림 타입 정의
 
### 3-1. 알림 분류 방식
 
| 분류 | 방식 | 용도 |
|------|------|------|
| **Toast** | 화면 우하단 팝업, 3~5초 자동 소멸 | 즉각적인 피드백 (저장, 삭제, 오류) |
| **Bell (알림센터)** | 헤더 종 아이콘, 누적 보관 | 운영 이슈 (재고, 주문 누적) |
| **Banner** | 페이지 상단 인라인 | 특정 페이지 내 경고 (품절 상태 불일치 등) |
 
### 3-2. Toast 알림 상세
 
```
✅ 성공    초록 배경    "상품이 저장되었습니다."           3초 자동 소멸
❌ 오류    빨간 배경    "저장에 실패했습니다."             5초 / 수동 닫기
⚠️ 경고    노란 배경    "재고가 부족합니다."               4초 자동 소멸
ℹ️ 정보    파란 배경    "CSV 내보내기가 완료되었습니다."    3초 자동 소멸
```
 
**Toast 사용 기준**
 
| 상황 | Toast 사용 여부 |
|------|---------------|
| 상품 저장/수정/삭제 | ✅ |
| 재고 조정 완료 | ✅ |
| 이미지 업로드 성공/실패 | ✅ |
| 상태 일괄 변경 | ✅ |
| 폼 유효성 검사 오류 | ❌ (인라인 에러로 표시) |
| 재고 품절 경고 | ❌ (Bell 알림으로 처리) |


### 3-3. Bell 알림센터 상세
 
Shopify Admin의 알림 피드에서는 읽음/안읽음 토글이 가능하고, 전체 읽음 처리도 지원한다.
 
```
┌─ 알림 ─────────────────────────────────────────────────┐
│  전체 읽음 처리                            필터 ▼       │
├─────────────────────────────────────────────────────────┤
│  🔴 [나이키 에어맥스] 재고가 소진되었습니다.            │
│     재고 관리로 이동 →              5분 전  ●           │
├─────────────────────────────────────────────────────────┤
│  🟡 미처리 주문 12건이 대기 중입니다.                   │
│     주문 관리로 이동 →              20분 전 ●           │
├─────────────────────────────────────────────────────────┤
│  🔵 CSV 파일 내보내기가 완료되었습니다.                 │
│                                     1시간 전            │
└─────────────────────────────────────────────────────────┘
```
 
**Bell 알림 기능 명세**
 
| 기능 | 상세 |
|------|------|
| 미확인 배지 | 헤더 종 아이콘에 숫자 배지 표시 |
| 읽음 처리 | 개별 클릭 또는 전체 읽음 처리 |
| 바로가기 링크 | 알림 클릭 시 관련 페이지로 이동 |
| 필터 | 전체 / 미확인 / 레벨별 필터 |
| 보관 기간 | 최근 50건 유지, 30일 이후 자동 삭제 |
| 실시간 갱신 | Supabase Realtime 구독 또는 30초 폴링 |
 
### 3-4. Banner 알림 상세
 
특정 페이지 조건에서 상단 인라인으로 노출.
 
```
┌──────────────────────────────────────────────────────────┐
│ ⚠️  가용 재고가 0입니다. 상태를 '품절'로 변경하는 것을  │
│     권장합니다.                        [상태 변경하기]   │
└──────────────────────────────────────────────────────────┘
```
 
**Banner 노출 조건**
 
| 페이지 | 조건 | 내용 |
|--------|------|------|
| 상품 상세 | `available = 0` AND `status = 'active'` | 품절 상태 변경 권장 |
| 상품 상세 | 임시저장 복원 가능 시 | 임시저장 복원 안내 |
| 전체 | DB 연결 오류 | 서버 연결 문제 안내 |
 

---
 
## 4. DB 스키마
 
```sql
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('order', 'inventory', 'product', 'system')),
  level       text not null check (level in ('critical', 'warning', 'info')),
  title       text not null,
  message     text not null,
  link        text,           -- 바로가기 URL (예: /products/uuid)
  is_read     boolean not null default false,
  created_at  timestamptz default now()
);
 
-- 조회 성능용 인덱스
create index on public.notifications (is_read, created_at desc);
create index on public.notifications (type, level);
 
-- 30일 이후 자동 삭제 (pg_cron 사용 시)
-- select cron.schedule('delete-old-notifications', '0 0 * * *',
--   $$delete from notifications where created_at < now() - interval '30 days'$$);
```
 
---
 
## 5. 타입 정의
 
`src/features/notifications/types/notification.types.ts`
 
```ts
export type NotificationType = 'order' | 'inventory' | 'product' | 'system'
export type NotificationLevel = 'critical' | 'warning' | 'info'
 
export type Notification = {
  id: string
  type: NotificationType
  level: NotificationLevel
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}
 
export type NotificationSummary = {
  total_unread: number
  has_critical: boolean
}
```
 
---
 
## 6. 알림 생성 유틸 함수

**재고 품절 알림 예시 (stock/adjust route.ts 내부에서 호출)**

---

## 7. API Route Handler
---
 
## 8. 우선순위별 구현 순서
 
```
1순위  Toast 알림        이미 대부분 구현 필요 (저장/삭제/오류 피드백)
2순위  재고 Banner       상품 상세 페이지 품절 경고 (구현 쉬움, 즉시 가치)
3순위  Bell 알림센터     DB 스키마 + 헤더 컴포넌트 (핵심 운영 기능)
4순위  자동 알림 생성    재고 조정 API에 알림 트리거 연결
```
 
---
 
## 9. 구현 체크리스트
 
```
□ notifications 테이블 SQL 실행
□ src/features/notifications/types/notification.types.ts 생성
□ src/lib/notifications.ts 생성
□ Toast 컴포넌트 구현 (성공/오류/경고/정보)
□ 상품 저장/수정/삭제에 Toast 연결
□ 재고 조정 API에 알림 트리거 연결
□ src/app/api/notifications/route.ts 생성
□ src/app/api/notifications/read-all/route.ts 생성
□ src/app/api/notifications/[id]/read/route.ts 생성
□ NotificationBell.tsx — 헤더 배지 + 패널 토글
□ NotificationPanel.tsx — 알림 목록, 읽음 처리, 바로가기
□ 상품 상세 Banner — available=0 AND status=active 조건
□ RLS 정책 — authenticated 사용자만 접근
```
 
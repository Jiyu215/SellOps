# SellOps Dashboard MVP — 코드 리뷰

> **브랜치**: `feature/5-dashboard-mvp`
> **검토 날짜**: 2026-03-27
> **검토 범위**: Dashboard MVP 전체 구현 코드 (레이아웃, 차트, KPI, 주문, 재고, 알림, 유틸리티)
> **심각도 기준**: 🔴 Critical · 🟠 Major · 🟡 Minor · 🔵 Suggestion

---

## 목차

1. [전체 아키텍처 & 설정](#1-전체-아키텍처--설정)
2. [타입 시스템](#2-타입-시스템)
3. [레이아웃 컴포넌트](#3-레이아웃-컴포넌트)
4. [알림 시스템](#4-알림-시스템)
5. [KPI 컴포넌트](#5-kpi-컴포넌트)
6. [차트 컴포넌트](#6-차트-컴포넌트)
7. [데이터 표시 컴포넌트](#7-데이터-표시-컴포넌트)
8. [유틸리티 & 훅](#8-유틸리티--훅)
9. [Mock 데이터](#9-mock-데이터)
10. [보안](#10-보안)
11. [성능 종합](#11-성능-종합)
12. [UX/접근성 종합](#12-uxaccessibility-종합)
13. [수정 완료 항목](#13-수정-완료-항목)
14. [다음 스프린트 권장 작업](#14-다음-스프린트-권장-작업)

---

## 1. 전체 아키텍처 & 설정

### 1-1. `tsconfig.json`

**🟠 `moduleResolution: "node"` → `"bundler"` 변경 필요**

```jsonc
// 현재
"moduleResolution": "node"

// 권장 (Next.js 15+ / TypeScript 5 공식 권장)
"moduleResolution": "bundler"
```

Next.js 16 + TypeScript 5 환경에서 `"node"` 모드는 ESM 패키지 exports 필드를 올바르게 해석하지 못합니다.
Recharts v3, Ant Design Icons v6 모두 `exports` 필드를 사용하며, `bundler` 모드로 전환해야 타입 해석이 정확해집니다.

**🟡 `target: "ES2017"` 하향 설정**

React 19 + Next.js 16 환경에서 `ES2017`은 불필요하게 낮습니다. `ES2020` 이상을 권장합니다.
`Object.entries()`, `Promise.allSettled()`, Optional chaining 등의 기능이 transpile 없이 사용 가능해집니다.

---

### 1-2. `tailwind.config.js`

**🟡 `content` 경로에 존재하지 않는 경로 포함**

```js
content: [
  "./src/**/*.{js,ts,jsx,tsx}",  // ✅ 실제 사용
  "./pages/**/*.{js,ts,jsx,tsx}", // ❌ 이 프로젝트에 없음
  "./components/**/*.{js,ts,jsx,tsx}", // ❌ 없음
  "./app/**/*.{js,ts,jsx,tsx}"    // ❌ 없음 (src/app/ 이지만 src/**에 포함됨)
]
```

불필요한 glob 경로는 빌드 시 Tailwind가 불필요한 파일을 스캔하게 합니다. `"./src/**/*.{js,ts,jsx,tsx}"` 하나로 충분합니다.

**🔵 `h4` 폰트 사이즈 정의되어 있지만 전체 코드베이스에서 미사용**

`text-h4` 클래스가 정의되어 있으나 어떤 컴포넌트에서도 사용되지 않습니다. `CategoryDoughnutChart`에 `xl:text-h4` 사용 중이므로 유지하되, 향후 사용 현황을 주기적으로 체크해 불필요한 토큰은 제거를 권장합니다.

---

### 1-3. `globals.css`

**🟠 웹폰트 CDN 로드 — 외부 의존성 및 font-weight 미완성**

```css
/* 현재: weight 400, 700만 로드 */
@font-face { font-weight: 400; }
@font-face { font-weight: 700; }
```

코드 전반에 `font-semibold`(600), `font-medium`(500)이 광범위하게 사용됩니다.
이 weight는 로드되지 않아 브라우저가 **faux-bold**(가짜 굵기)로 렌더링하며, 폰트 품질이 저하됩니다.

```css
/* 권장: 400, 500, 600, 700 추가 */
@font-face { font-weight: 500; src: url('...Pretendard-Medium.woff2'); }
@font-face { font-weight: 600; src: url('...Pretendard-SemiBold.woff2'); }
```

또한 CDN 의존성은 `next.config.js`의 `headers()`에 `Content-Security-Policy: font-src` 추가가 필요합니다. 빌드 자산으로 폰트를 포함하거나 `next/font`를 사용하면 이 의존성을 제거할 수 있습니다.

---

### 1-4. `app/layout.tsx`

**🟠 메타데이터 완전 미적용**

```tsx
// 현재: 기본 title, description 없음
export default function RootLayout({ children }) { ... }

// 권장: Next.js metadata API 사용
export const metadata: Metadata = {
  title: 'SellOps — 운영 관리 대시보드',
  description: '전자상거래 운영 관리 시스템',
};
```

SEO는 물론, 브라우저 탭 제목도 기본값(도메인)으로 표시됩니다.

**🟠 `<html>`에 `suppressHydrationWarning` 누락**

`useThemeToggle`이 클라이언트에서 `<html class="dark">`를 추가하므로, 서버 렌더링(class 없음)과 클라이언트 hydration(class 있음) 간 불일치가 발생합니다. 이를 방지하려면:

```tsx
<html lang="ko" suppressHydrationWarning>
```

---

## 2. 타입 시스템

**파일**: `src/types/dashboard.ts`

### 2-1. `DashboardPageProps` 미사용 인터페이스

```ts
// 정의되어 있으나 어디서도 import/사용 안 됨
export interface DashboardPageProps {
  kpiData: KPICardData[];
  salesData: SalesDataPoint[];
  ...
}
```

🟡 실제 Server Component 기반 페이지로 전환 시 활용하거나, 현재는 제거하는 것이 코드 명확성에 좋습니다.

### 2-2. `OrderFilter.dateRange` 미구현 필드

```ts
export interface OrderFilter {
  search: string;
  status: OrderStatus | 'all';
  paymentMethod: PaymentMethod | 'all';
  dateRange?: { from: string; to: string }; // UI 및 로직 모두 미구현
}
```

🟡 구현 계획이 있다면 주석으로 `// TODO: 날짜 범위 필터 구현 예정` 명시 권장.

### 2-3. `UserProfile.avatarUrl` 정의되어 있으나 미사용

```ts
export interface UserProfile {
  avatarUrl?: string; // 정의는 있으나 Header, Sidebar 모두 initials만 표시
}
```

🔵 아바타 이미지 렌더링 구현 전까지는 타입에서 제거하거나 TODO 주석 추가 권장.

---

## 3. 레이아웃 컴포넌트

### 3-1. `DashboardLayout.tsx`

**🟠 URL 라우팅과 `activeMenu` 상태 비동기화**

```tsx
const [activeMenu, setActiveMenu] = useState('dashboard');
```

`Sidebar`의 메뉴 버튼은 `activeMenu` 상태만 업데이트하고 **실제 Next.js 라우팅이 일어나지 않습니다**.
브라우저 URL이 변경되지 않으므로, 새로고침 시 항상 'dashboard'가 활성 상태로 표시됩니다.

```tsx
// 권장: usePathname() 기반 동기화
import { usePathname } from 'next/navigation';
const pathname = usePathname();
const activeMenu = NAV_ITEMS.find(item => pathname.startsWith(item.href))?.key ?? 'dashboard';
```

**🔵 `notifications` 초기값이 props로만 설정되며 이후 업데이트 불가**

```tsx
const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
```

`useState`는 최초 마운트 시 `initialNotifications`만 사용합니다. 부모가 새 props를 전달해도 상태가 업데이트되지 않습니다. 실제 API 연동 시 `useEffect`로 props 변경을 구독하거나 상태 관리 레이어(Zustand)로 이동을 권장합니다.

---

### 3-2. `Header.tsx`

**🟠 검색바 기능 미구현 — 사용자 혼란 유발**

```tsx
const [searchValue, setSearchValue] = useState('');
// 입력은 되지만 실제 검색 결과 없음, 라우팅 없음
```

빈 검색바는 사용자에게 기능이 있는 것처럼 오인시킵니다. 최소한 `placeholder`에 "준비 중" 표시 또는 실제 전역 검색 기능 구현이 필요합니다.

**🟡 설정(SettingOutlined) 버튼 클릭 동작 없음**

```tsx
<button type="button" aria-label="설정">
  <SettingOutlined />
</button>
```

플레이스홀더 버튼은 `disabled` 상태로 표시하거나 `aria-disabled="true"` + `cursor-not-allowed`를 추가해 사용자에게 미구현임을 명시하는 것이 좋습니다.

**🔵 알림 드롭다운 z-index 잠재적 충돌**

`Header`가 `z-10` stacking context를 생성하므로, 드롭다운의 `z-50`은 이 컨텍스트 내에서만 유효합니다. 향후 `z-index`가 있는 modal, toast, tooltip 등을 추가할 경우 헤더 외부에서 드롭다운이 가려질 수 있습니다. `react-portal`을 통해 드롭다운을 body에 직접 렌더링하면 이 문제를 원천 차단할 수 있습니다.

---

### 3-3. `Sidebar.tsx`

**🟠 네비게이션 메뉴가 실제 페이지 이동을 하지 않음**

```tsx
<button type="button" onClick={() => handleMenuClick(item.key)}>
```

모든 메뉴 항목이 `<button>`으로 구현되어 URL 변경이 없습니다. `href`가 정의되어 있음에도 활용하지 않고 있습니다.

```tsx
// 권장: button → Link 전환
import Link from 'next/link';
<Link href={item.href} onClick={() => onMobileClose()}>
```

**🟡 `<img>` 대신 Next.js `<Image>` 사용 권장**

```tsx
// 현재: eslint-disable 주석으로 경고 무시
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/images/logo-128.png" ... />
```

Next.js `<Image>` 컴포넌트를 사용하면 자동 WebP 변환, lazy loading, 크기 최적화가 적용됩니다. 로고처럼 초기 로드 시 즉시 필요한 이미지는 `priority` prop을 추가하면 됩니다.

```tsx
import Image from 'next/image';
<Image src="/images/logo-128.png" alt="" aria-hidden width={32} height={32} priority />
```

**🔵 새 보고서 생성, 매뉴얼 버튼 동작 없음**

하단 고정 영역의 두 버튼이 클릭 시 아무 동작도 하지 않습니다. Header의 설정 버튼과 동일하게 시각적으로 미구현 상태임을 표시하거나 해당 기능을 구현해야 합니다.

---

## 4. 알림 시스템

**파일**: `src/components/dashboard/NotificationDropdown.tsx`

### 4-1. 🟠 `formatRelativeTime` 하드코딩 시각

```ts
// 현재: 영구적으로 2026-03-27T10:00:00Z 기준
const now = new Date('2026-03-27T10:00:00Z');

// 프로덕션 전 반드시 변경 필요
const now = new Date();
```

현재는 Mock 환경이라 허용되지만, 실제 배포 전 `new Date()`로 교체해야 합니다. 이 사실이 코드 주석에만 표시되어 있어 리뷰 없이 배포될 위험이 있습니다.

### 4-2. 🟡 미읽음 알림을 상단 정렬하지 않음

현재 알림은 최신순으로만 정렬됩니다. 운영자 입장에서는 미읽음 항목이 먼저 보여야 효율적입니다.

```tsx
// 권장: 미읽음 우선 정렬
const sorted = [...notifications].sort((a, b) => {
  if (!a.isRead && b.isRead) return -1;
  if (a.isRead && !b.isRead) return 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
});
```

### 4-3. 🟡 `TYPE_CONFIG`의 JSX 아이콘 모듈 최상위 선언

```tsx
const TYPE_CONFIG = {
  payment_failure: {
    icon: <CloseCircleOutlined aria-hidden="true" />, // 모듈 최상위에서 JSX 생성
    ...
  }
}
```

React element를 모듈 최상위 상수로 선언하면 렌더링 컨텍스트 외부에서 JSX가 실행됩니다. 현재는 동작에 문제가 없지만, 향후 icon에 동적 props(색상 상태 등)가 필요해질 경우 리팩토링 비용이 큽니다. `(props) => <Icon {...props} />` 형태의 함수로 변경을 권장합니다.

### 4-4. 🔵 모두 읽음 후 드롭다운 자동 닫힘 없음

"모두 읽음" 버튼 클릭 후 드롭다운이 유지됩니다. 읽음 처리 후에도 목록이 그대로 남아 사용자가 명시적으로 닫아야 합니다. UX 관점에서 "모두 읽음" 후 자동으로 드롭다운을 닫거나, 적어도 "모두 읽음 처리됨" 피드백(토스트 메시지)을 제공하면 좋습니다.

### 4-5. 🔵 접근성 — `role="dialog"` 사용했지만 focus trap 없음

```tsx
<div role="dialog" aria-label="알림 목록">
```

`role="dialog"`는 포커스를 모달 내부에 가두는 **focus trap**이 함께 구현되어야 합니다. 현재는 Tab 키로 드롭다운 외부 요소를 탐색할 수 있어 키보드 사용자에게 혼란을 줍니다. `role="listbox"` 또는 `role="menu"`로 변경하거나 `aria-modal="true"` + focus trap 라이브러리 적용을 권장합니다.

---

## 5. KPI 컴포넌트

### 5-1. `KPICard.tsx`

**🟡 100% 초과 달성률 표시 혼란**

```tsx
// mockData: progressPercent: 106, 109 → 클램핑 후 바는 100% 이지만
<span>{data.progressPercent}%</span> // "106%", "109%" 그대로 표시
```

프로그레스바는 100%로 클램핑되지만 텍스트에는 원본값이 그대로 노출됩니다. 초과 달성 시 시각적 구분이 필요합니다.

```tsx
// 권장 UI
{data.progressPercent > 100
  ? <span className="text-light-success">✓ {data.progressPercent}% 달성</span>
  : <span>{data.progressPercent}%</span>
}
```

**🟡 `change` 음수 + `status: 'success'` 시각적 충돌**

`오늘 매출` 카드: `change: -15.9` (전일 대비 감소) + `status: 'success'` (초록 테두리)
변동률 배지는 빨간색 감소 화살표인데 카드 테두리는 초록색이라 시각적 충돌이 발생합니다.
`status`는 목표 대비 성과(KPI 달성 여부), `change`는 전일 대비 변동을 각각 나타내므로 명확한 레이블과 설명 텍스트 추가가 필요합니다.

**🔵 `description` 필드 미렌더링**

```ts
// mockData에 정의
description: '전일 대비 15.9% 감소, 일 목표(₩2.5M) 초과'

// KPICard.tsx에서 사용 안 함
```

tooltip이나 카드 하단 텍스트로 표시하면 운영자에게 추가 컨텍스트를 제공할 수 있습니다.

---

## 6. 차트 컴포넌트

### 6-1. `SalesShortTermChart.tsx`

**🟡 재고 위험 Y축 범위 하드코딩**

```tsx
<YAxis yAxisId="stock" hide domain={[3, 12]} />
```

Mock 데이터에서 `stockRiskCount` 범위가 6~7이므로 현재는 보이지만, 실제 데이터에서 12를 초과하면 그래프가 범위 밖으로 잘립니다.

```tsx
// 권장: 데이터 기반 동적 범위
domain={['auto', 'auto']}
// 또는
domain={[0, (max: number) => Math.ceil(max * 1.2)]}
```

**🟡 `revenueDotRenderer`의 `useMemo` vs `useCallback`**

```tsx
const revenueDotRenderer = useMemo(
  () => buildRevenueDotRenderer(enriched),
  [enriched],
);
```

`buildRevenueDotRenderer`는 함수를 반환합니다. 함수 참조를 메모이제이션할 때는 `useCallback`이 더 명시적입니다. `useMemo`도 동작하지만, 팀 내 일관성을 위해 함수는 `useCallback`, 값은 `useMemo`로 구분 권장합니다.

---

### 6-2. `SalesComboChart.tsx`

**🟡 `handleChartClick` `useCallback` 누락**

```tsx
// 현재: 매 렌더마다 새 함수 생성
const handleChartClick = (state: { activeTooltipIndex?: number }) => { ... };

// 권장
const handleChartClick = useCallback((state: { activeTooltipIndex?: number }) => { ... },
  [enrichedAll, period]
);
```

`ComposedChart`에 `onClick` prop으로 전달되어 매 렌더마다 Recharts 내부에서 이벤트 핸들러를 재등록합니다. `useCallback` 래핑으로 불필요한 재등록을 방지합니다.

**🟡 `onClick` 타입 캐스팅**

```tsx
onClick={handleChartClick as (state: object) => void}
```

Recharts `ComposedChart`의 `onClick`이 `CategoricalChartState` 타입을 요구하는데, 이를 `object`로 강제 캐스팅합니다. Recharts 버전 업그레이드 시 런타임 에러 가능성이 있습니다.

```tsx
// 권장: Recharts 타입 직접 사용
import type { CategoricalChartState } from 'recharts/types/chart/generateCategoricalChart';
const handleChartClick = (state: CategoricalChartState) => {
  const chartIndex = state?.activeTooltipIndex;
  ...
};
```

**🔵 차트 내 `cursor: pointer` 인라인 스타일**

```tsx
<div style={{ cursor: 'pointer' }}>
```

CLAUDE.md 규칙(Tailwind 유틸리티 클래스 우선)에 따라 `className="cursor-pointer"`로 변경 권장합니다.

---

### 6-3. `CategoryDoughnutChart.tsx`

**🟡 디자인 스펙과 불일치 — 범례 변동률 미구현**

`.claude/rules/dadshboard_layout.md` 스펙:
> 하단 범례: 색상 점 + 카테고리명 + 비율(%) + **변동률(±%)**

현재 구현은 `name`과 `value%`만 표시하며, 전월 대비 변동률이 없습니다.
`CategoryDataPoint` 타입에 `change?: number` 필드 추가와 함께 범례 컴포넌트 업데이트가 필요합니다.

---

## 7. 데이터 표시 컴포넌트

### 7-1. `OrderTable.tsx`

**🟠 CSV 내보내기 — 스프레드시트 수식 주입(Formula Injection) 취약점**

```tsx
const rows = orders.map((o) => [
  o.orderNumber,      // "=CMD(...)  " 같은 값이 들어올 경우
  o.customer.name,    // 스프레드시트에서 수식으로 실행 가능
  ...
]);
```

고객 이름, 이메일, 상품명 등 사용자 입력 값이 `=`, `+`, `-`, `@`로 시작하면 Excel/Google Sheets에서 수식으로 실행됩니다. 이는 CSV 인젝션(Formula Injection) 공격으로 악용될 수 있습니다.

```tsx
// 권장: 위험 문자로 시작하는 셀 앞에 apostrophe 삽입
const sanitizeCell = (cell: string): string => {
  if (/^[=+\-@\t\r]/.test(cell)) return `'${cell}`;
  return cell;
};
const rows = orders.map((o) => [
  sanitizeCell(o.orderNumber),
  sanitizeCell(o.customer.name),
  ...
]);
```

**🟡 배열 인덱스를 React key로 사용**

```tsx
{order.products.map((p, i) => (
  <div key={i}> {/* 위험: 데이터 변경 시 React 재조정 오류 */}
```

상품 목록이 변경되거나 재정렬될 경우 잘못된 컴포넌트가 업데이트됩니다.

```tsx
// 권장: 고유 식별자 사용
<div key={`${order.id}-${p.sku}`}>
```

**🟡 결제방식 필터 UI 없음**

`paymentMethod` 필터 로직은 이번 수정으로 추가되었으나, 사용자가 조작할 수 있는 UI(Select 드롭다운)가 없습니다. 결제방식 필터 컨트롤을 상태 필터 옆에 추가하면 기능이 완성됩니다.

**🟡 `URL.revokeObjectURL` 타이밍 문제**

```tsx
link.click();
URL.revokeObjectURL(url); // click() 직후 즉시 해제 — 다운로드 완료 전에 URL이 해제될 수 있음
```

```tsx
// 권장: setTimeout으로 지연 해제
link.click();
setTimeout(() => URL.revokeObjectURL(url), 100);
```

**🔵 빈 검색 결과 상태 UX 개선 여지**

검색 결과가 없을 때 "검색 결과가 없습니다." 텍스트만 표시됩니다.
검색어 초기화 버튼이나 "'{검색어}'에 대한 결과가 없습니다" 형식의 메시지를 제공하면 UX가 개선됩니다.

**🔵 페이지당 표시 건수 고정 (5건)**

```tsx
const PAGE_SIZE = 5;
```

실제 운영 환경에서는 10, 25, 50건 등 페이지 크기 선택 옵션이 필요합니다.

---

### 7-2. `LowStockTable.tsx`

**🟡 재고 항목 정렬 없음 — critical 우선 표시 권장**

현재 데이터 입력 순서대로 표시됩니다. 운영자 관점에서는 `critical → warning → low` 순서로 표시해야 즉각적인 판단이 가능합니다.

```tsx
// 권장: 위험도 우선 정렬
const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, warning: 1, low: 2 };
const sorted = [...items].sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);
```

**🟡 입고 예정 없는 critical 항목 미강조**

```ts
// inv-004: critical + incomingStock: 0 → 가장 위험하지만 시각적 구분 없음
{ riskLevel: 'warning', incomingStock: 0 }
```

`incomingStock === 0`인 critical 항목은 더 긴급한 조치가 필요합니다. "입고 예정 없음" 레이블 또는 아이콘 추가를 권장합니다.

**🟡 `CATEGORY_COLORS` 상수 중복**

`LowStockTable.tsx`와 `TopProductsCard.tsx` 양쪽에 동일한 카테고리 색상 매핑이 정의되어 있습니다.

```ts
// LowStockTable.tsx:49
const CATEGORY_COLORS: Record<string, string> = { '키보드': '#5D5FEF', ... };

// TopProductsCard.tsx:48 — 동일 내용
const CATEGORY_COLORS: Record<string, string> = { '키보드': '#5D5FEF', ... };
```

`src/constants/categoryColors.ts`로 분리하여 DRY 원칙을 적용해야 합니다.

**🔵 "전체 관리" 버튼 동작 없음**

```tsx
<button type="button" className="...">전체 관리 <RightOutlined /></button>
```

`href`나 `onClick` 라우팅 없이 클릭해도 아무 동작이 없습니다. `/dashboard/inventory`로 이동하는 링크로 변경 권장합니다.

---

### 7-3. `TopProductsCard.tsx`

**🟡 "건" 단위 도메인 불일치**

```tsx
{product.unitsSold.toLocaleString()}건
```

주문 수가 아니라 제품 판매 수량이므로 "개"가 더 적절합니다. 도메인 전문가(기획팀)와 협의 후 결정 권장.

**🔵 "전체 보기" 링크 연결 페이지 미구현**

```tsx
<Link href="/dashboard/products">전체 보기</Link>
```

`/dashboard/products` 페이지가 placeholder 상태입니다. 향후 제품 관리 페이지 구현 시 자동으로 동작하므로 현재는 문제없습니다.

---

## 8. 유틸리티 & 훅

### 8-1. `useThemeToggle.ts`

**🟠 Hydration Mismatch 위험**

```ts
const [isDark, setIsDark] = useState<boolean>(() => {
  if (typeof window === 'undefined') return false; // 서버: false
  return localStorage.getItem(THEME_KEY) === 'dark'; // 클라이언트: true 가능
});
```

Next.js App Router에서 Client Component도 서버에서 초기 HTML이 렌더링됩니다. 서버는 `isDark: false`로, 클라이언트는 `isDark: true`로 렌더링하면 React hydration mismatch 경고가 발생하고 다크모드 초기 깜박임이 생길 수 있습니다.

가장 견고한 해결책은 `layout.tsx`의 `<head>`에 인라인 스크립트를 삽입해 hydration 전에 dark 클래스를 적용하는 것입니다:

```html
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    const saved = localStorage.getItem('sellops-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  })();
` }} />
```

**🟡 `useLayoutEffect` ESLint 예외 처리**

```ts
useLayoutEffect(() => {
  document.documentElement.classList.toggle('dark', isDark);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

`isDark`를 의존성 배열에서 의도적으로 제외하여 ESLint 규칙을 비활성화했습니다.
마운트 시 한 번만 DOM 클래스를 적용하려는 의도는 이해되지만, 코드 리뷰어에게 혼란을 줄 수 있습니다. 인라인 스크립트 방식으로 전환하면 이 훅 자체가 필요 없어집니다.

---

### 8-2. `utils/choseong.ts`

✅ **전반적으로 우수한 구현**

- 초성 배열(`CHOSEONG_SET`) Set 기반 O(1) 조회
- JSDoc 예제 포함으로 가독성 우수
- 엣지 케이스(빈 문자열, 비한글) 처리 완비
- `extractChoseong`과 `matchesKorean` 책임 분리 명확

**🔵 `[...str]` spread 최적화**

```ts
[...str].map((char) => { ... }).join('')
```

검색 쿼리는 길지 않아 성능 문제가 없지만, 향후 긴 텍스트에 적용할 경우를 위해 `for...of` 방식이 메모리 효율적입니다. 현재 사용처에서는 문제없습니다.

---

## 9. Mock 데이터

**파일**: `src/constants/mockData.ts`

**🟡 단일 파일 비대화 문제**

현재 286줄이며 KPI, 차트, 재고, 주문, 알림 등 모든 Mock 데이터가 한 파일에 집중되어 있습니다. 향후 데이터가 추가될수록 유지보수가 어려워집니다.

```
src/constants/
  mock/
    kpi.ts
    sales.ts
    inventory.ts
    orders.ts
    notifications.ts
  index.ts  ← re-export
```

**🟡 날짜 기준 명시 부족**

`MOCK_DAILY_DATA`, `MOCK_NOTIFICATIONS` 등이 `2026-03-27` 기준이지만, 파일 헤더에만 간략히 명시되어 있습니다. Mock 데이터가 특정 날짜 기준임을 상수명이나 주석으로 명확히 표시해야 혼란을 방지할 수 있습니다.

**🔵 `MOCK_USER.avatarUrl: undefined`**

```ts
avatarUrl: undefined, // 이 줄 자체를 생략하는 것이 클린 코드
```

Optional 필드는 명시적으로 `undefined`를 할당하지 않고 그냥 생략하는 것이 TypeScript 관례입니다.

---

## 10. 보안

### 10-1. 🔴 CSV Formula Injection

앞서 7-1에서 언급했습니다. 현재 Mock 데이터에서는 문제없지만, 실제 사용자 데이터를 CSV로 내보낼 경우 즉각적인 보안 취약점이 됩니다. **실제 API 연동 전 반드시 수정**이 필요합니다.

### 10-2. 🟡 외부 CDN 폰트 로드 — CSP 미설정

```css
src: url('https://cdn.jsdelivr.net/gh/...');
```

Content Security Policy가 설정되어 있지 않아 외부 리소스 로드에 제한이 없습니다. `next.config.js`에 CSP 헤더 추가를 권장합니다:

```js
headers: () => [{
  source: '/(.*)',
  headers: [{
    key: 'Content-Security-Policy',
    value: "font-src 'self' https://cdn.jsdelivr.net;"
  }]
}]
```

### 10-3. ✅ 양호한 보안 패턴

- `eval()`, `dangerouslySetInnerHTML` 미사용
- 환경변수 직접 노출 없음
- `localStorage` 접근 시 `typeof window` 체크
- XSS: JSX 이스케이핑으로 자동 방어

---

## 11. 성능 종합

| 항목 | 현재 상태 | 권장 |
|------|-----------|------|
| `useMemo` 활용 | ✅ filteredOrders, enrichedAll, chartData 등 적절히 적용 | - |
| `useCallback` 활용 | 🟡 handleChartClick 누락 | SalesComboChart에 추가 |
| Server Component | 🟠 page.tsx 전체 `'use client'` | 데이터 가져오기는 서버에서, UI 상태만 클라이언트 |
| 이미지 최적화 | 🟡 `<img>` 사용 | Next.js `<Image>` 전환 |
| Recharts ResizeObserver | 🟡 3개 차트 동시 등록 | 차트가 많아지면 virtual scroll 고려 |
| 웹폰트 로딩 | 🟡 CDN + 4 weight 미완성 | `next/font` 또는 self-hosted |
| 번들 크기 | 🔵 Ant Design Icons 전체 임포트 없음 (named import ✅) | - |

---

## 12. UX/Accessibility 종합

| 항목 | 현재 상태 | 권장 |
|------|-----------|------|
| 모바일 햄버거 메뉴 | ✅ 헤더 내부 통합, 슬라이드 트랜지션 | - |
| 다크모드 토글 | ✅ localStorage + 시스템 감지 | hydration mismatch 수정 필요 |
| 알림 드롭다운 | ✅ Escape 키, click-outside | focus trap 미구현 |
| 키보드 내비게이션 | 🟡 Sidebar 버튼 Tab 접근 가능 | focus ring 시각화 추가 권장 |
| 로딩 상태 | 🔴 없음 | Skeleton UI 또는 Spinner 추가 |
| 에러 상태 | 🔴 없음 | Error Boundary 추가 |
| 빈 상태 (Empty State) | 🟡 일부만 처리 | 모든 데이터 표시 컴포넌트에 Empty State UI 추가 |
| 반응형 테이블 | ✅ lg 미만 카드형 변환 | - |
| ARIA 레이블 | ✅ 전반적으로 적용 | dialog focus trap 추가 필요 |
| 색상 대비 | 🔵 디자인 토큰 기반 — WCAG AA 검증 필요 | Figma 또는 axe-core 검증 권장 |

---

## 13. 수정 완료 항목

이번 스프린트 중 리뷰 과정에서 발견되어 이미 수정된 항목:

| # | 파일 | 내용 | 상태 |
|---|------|------|------|
| 1 | `KPICard.tsx` | `iconBg` 파싱 → `statusTextColor` 전용 필드 분리로 dark 모드 색상 정확히 적용 | ✅ 완료 |
| 2 | `OrderTable.tsx` | `paymentMethod` 필터 로직 `filteredOrders`에 추가 | ✅ 완료 |
| 3 | `OrderTable.tsx` | JSDoc 주석에서 삭제된 `액션(…)` 컬럼 언급 제거 | ✅ 완료 |
| 4 | `KPICardGrid.tsx` | 주석 "xl: 4열" → "xl: 3열" 수정 | ✅ 완료 |
| 5 | `Header.tsx` | `keydown` + `Escape` 이벤트 추가 — 키보드 드롭다운 닫기 | ✅ 완료 |
| 6 | `NotificationDropdown.tsx` | 미읽음 표시 점에 `role="img"` 추가 | ✅ 완료 |
| 7 | `LowStockTable.tsx` | `section`에 `h-full` 추가 — `items-stretch` 레이아웃 일관성 | ✅ 완료 |

---

## 14. 다음 스프린트 권장 작업

### 🔴 즉시 처리 (Critical)

1. **CSV Formula Injection 방어** — `exportToCSV`에 `sanitizeCell` 추가
2. **Sidebar 네비게이션을 실제 링크로 전환** — `<button>` → `<Link href>`
3. **`activeMenu` URL 동기화** — `usePathname()`으로 실제 경로 반영

### 🟠 단기 처리 (Major)

4. **`app/layout.tsx` metadata 추가** — SEO + 탭 제목
5. **`suppressHydrationWarning` + 인라인 스크립트** — 다크모드 깜박임 제거
6. **Pretendard 폰트 weight 완성** — 500, 600 추가 또는 `next/font` 전환
7. **`tsconfig.json` `moduleResolution: "bundler"` 전환**
8. **Skeleton UI / Loading State** — API 연동 준비

### 🟡 중기 처리 (Minor)

9. **`CATEGORY_COLORS` 공유 상수 분리** — `src/constants/categoryColors.ts`
10. **`CategoryDoughnutChart` 범례 변동률** — 스펙(dadshboard_layout.md) 준수
11. **`LowStockTable` critical 우선 정렬** — 운영 효율성
12. **결제방식 필터 UI** — `OrderTable` 필터 컨트롤 추가
13. **`SalesComboChart.handleChartClick` `useCallback` 적용**
14. **탭 title 페이지별 동적 설정** — Next.js `generateMetadata` 활용
15. **`tailwind.config.js` content 경로 정리**

### 🔵 장기 개선 (Suggestion)

16. **Mock 데이터 분리** — `src/constants/mock/` 하위 파일로 분리
17. **`formatRelativeTime` 실시간화** — `new Date()` 및 주기적 갱신
18. **`<img>` → Next.js `<Image>` 전환** — Sidebar 로고
19. **Error Boundary 추가** — 차트/테이블 단위 에러 처리
20. **Recharts onClick 타입 정확히 적용** — `CategoricalChartState` 직접 사용

---

*이 코드 리뷰는 `feature/5-dashboard-mvp` 브랜치의 전체 구현을 기준으로 작성되었습니다.*

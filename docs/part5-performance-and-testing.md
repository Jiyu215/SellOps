# Part 5. 성능 개선 및 테스트 분석

> 실제 프론트엔드 개발자 기준 + 취업 시 필요한 성능/테스트 항목 전수 분석

---

## 1. 현재 테스트 현황 점검

### 존재하는 테스트 파일
| 파일 | 테스트 유형 | 커버 내용 |
|------|-------------|-----------|
| `src/utils/choseong.test.ts` | 단위 테스트 | 한국어 초성 추출, 매핑, 엣지케이스 |
| `src/hooks/useOrderFilter.test.ts` | 훅 단위 테스트 | 상태 필터링, 검색 로직 |
| `src/components/dashboard/orders/OrderTable.test.tsx` | 컴포넌트 테스트 | 테이블 렌더링, 인터랙션 |

### 현재 테스트 인프라
```json
// package.json 기준
"jest": "^30.3.0",
"jest-environment-jsdom": "^30.3.0",
"@testing-library/react": "^16.3.2",
"@testing-library/user-event": "^14.6.1",
"ts-jest": "^29.4.6"
```
→ 기본 설정은 완료됨. Playwright는 아직 설치되지 않음.

---

## 2. 테스트 전략 — 무엇을 테스트해야 하는가

### 2-1. 단위 테스트 (Jest + Testing Library) — 우선순위 HIGH

#### 반드시 테스트해야 할 유틸 함수

```typescript
// formatCurrency.test.ts
// 테스트 케이스:
// - 1000 → "₩1,000"
// - 0 → "₩0"
// - 음수 처리
// - 소수점 처리

// formatDate.test.ts
// 테스트 케이스:
// - ISO string → "2026년 4월 15일"
// - 상대 시간 → "3분 전", "2일 전"
// - 잘못된 날짜 입력 처리

// debounce.test.ts
// 테스트 케이스:
// - 300ms 내 여러 번 호출 시 마지막 한 번만 실행
// - 지연 시간 정확성
```

#### 반드시 테스트해야 할 커스텀 훅

```typescript
// useDebounce.test.ts
// - 값이 즉시 변경되지 않음
// - 지연 후 최신 값 반영

// useThemeToggle.test.ts
// - 토글 시 localStorage 저장
// - 초기 값 시스템 설정 반영
// - document.documentElement.classList 변경 확인

// useAuth.test.ts (구현 후)
// - 로그인 상태 확인
// - 비로그인 시 redirect
```

#### 반드시 테스트해야 할 컴포넌트

```typescript
// KPICard.test.tsx
// - CRITICAL 뱃지 표시 조건
// - 프로그레스바 비율 계산
// - 다크모드 클래스 적용

// ErrorBoundary.test.tsx
// - 에러 발생 시 fallback UI 표시
// - 에러 메시지 출력

// Button.test.tsx (구현 후)
// - disabled 상태
// - onClick 호출
// - variant별 클래스 확인

// Input.test.tsx (구현 후)
// - 값 입력
// - 에러 메시지 표시
// - label 연결
```

### 2-2. 통합 테스트 (Integration Test)

```typescript
// 로그인 흐름
// 1. 로그인 폼 렌더링 확인
// 2. 이메일/비밀번호 입력
// 3. submit 클릭
// 4. 성공 시 /dashboard 리다이렉트
// 5. 실패 시 에러 메시지 표시

// 주문 검색 흐름
// 1. OrderTable 마운트
// 2. 검색어 입력
// 3. debounce 후 필터링 결과 확인
// 4. URL query 업데이트 확인
// 5. 필터 변경 후 결과 확인
```

### 2-3. E2E 테스트 (Playwright) — 우선순위 MEDIUM

```typescript
// playwright.config.ts 최소 설정
// baseURL: 'http://localhost:3000'
// 브라우저: chromium 단일로 시작

// 필수 E2E 시나리오
// TC-01: 로그인 → 대시보드 접근
// TC-02: 비로그인 상태에서 대시보드 접근 → 로그인 페이지 리다이렉트
// TC-03: 주문 검색 → 결과 확인
// TC-04: 주문 상태 필터 → 결과 확인
// TC-05: CSV 내보내기 버튼 클릭 → 파일 다운로드 확인
```

### 테스트 커버리지 목표

| 구분 | 현재 | 최소 목표 | 이상적 목표 |
|------|------|-----------|-------------|
| 유틸 함수 | ~40% | 80% | 100% |
| 커스텀 훅 | ~30% | 70% | 90% |
| 컴포넌트 | ~10% | 50% | 70% |
| E2E 시나리오 | 0개 | 5개 | 10개 |

---

## 3. 성능 개선 분석

### 3-1. 현재 성능 위험 요소

#### 문제 1: 차트 라이브러리 번들 크기

```typescript
// 현재 (문제)
import { SalesComboChart } from '@/components/dashboard/charts/SalesComboChart';
// recharts 전체가 초기 번들에 포함됨 (~300KB gzip)

// 개선 (dynamic import)
import dynamic from 'next/dynamic';
const SalesComboChart = dynamic(
  () => import('@/components/dashboard/charts/SalesComboChart').then(m => ({ default: m.SalesComboChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);
// → 초기 로드 번들에서 제외, 뷰포트 진입 시 로드
```

**예상 효과**: 초기 번들 ~300KB 절감, TTI 0.5~1초 개선

#### 문제 2: Mock 데이터 전체를 클라이언트에서 로드

```typescript
// 현재 (문제)
// mockData.ts 17KB를 클라이언트 번들에 포함

// 개선
// Next.js Server Component에서 데이터 fetch
// 클라이언트로는 필요한 데이터만 전달
// 또는 Next.js API Route에서 paginated 응답
```

#### 문제 3: 불필요한 리렌더링

```typescript
// OrderTable.tsx에서 발생 가능
// 필터/검색 상태 변경 시 전체 테이블 리렌더링

// 개선
const OrderTableRow = React.memo(({ order }: { order: Order }) => {
  return <tr>...</tr>;
});

// 필터 함수 메모이제이션
const filteredOrders = useMemo(
  () => filterOrders(orders, filters),
  [orders, filters]
);
```

#### 문제 4: 이미지 최적화 미적용

```typescript
// 현재 (문제)
<img src="/logo.png" alt="logo" />

// 개선
import Image from 'next/image';
<Image src="/logo.png" alt="logo" width={120} height={40} priority />
// → WebP 자동 변환, 레이지 로딩, 사이즈 최적화
```

### 3-2. Lighthouse 지표별 개선 방법

#### LCP (Largest Contentful Paint) — 목표: 2.5초 이하

| 개선 방법 | 난이도 | 효과 |
|-----------|--------|------|
| 차트 dynamic import | 낮음 | 높음 |
| 폰트 preload (`Pretendard`) | 낮음 | 중간 |
| 로고 이미지 `priority` 속성 | 낮음 | 낮음 |
| 서버 컴포넌트로 데이터 패칭 | 중간 | 높음 |

```html
<!-- 폰트 preload 예시 (layout.tsx) -->
<link rel="preload" href="/fonts/Pretendard-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
```

#### FID/INP (Interaction to Next Paint) — 목표: 200ms 이하

| 개선 방법 | 난이도 | 효과 |
|-----------|--------|------|
| 검색 debounce 300ms (이미 적용됨) | ✅ | 높음 |
| 차트 렌더링 스로틀링 | 중간 | 중간 |
| 무거운 연산 Web Worker 이동 | 높음 | 높음 |
| React.startTransition으로 필터링 처리 | 낮음 | 중간 |

```typescript
// React.startTransition 적용 예시
import { startTransition } from 'react';

const handleSearch = (value: string) => {
  startTransition(() => {
    setSearchQuery(value); // 낮은 우선순위로 처리
  });
};
```

#### CLS (Cumulative Layout Shift) — 목표: 0.1 이하

| 개선 방법 | 난이도 | 효과 |
|-----------|--------|------|
| 스켈레톤 UI 유지 (이미 구현됨) | ✅ | 높음 |
| 이미지에 width/height 명시 | 낮음 | 높음 |
| 차트 컨테이너 고정 높이 설정 | 낮음 | 높음 |
| 폰트 로딩 시 `font-display: swap` | 낮음 | 중간 |

#### Bundle Size 최적화

```bash
# Bundle Analyzer 설치
npm install --save-dev @next/bundle-analyzer

# next.config.ts 수정
import withBundleAnalyzer from '@next/bundle-analyzer';
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);

# 실행
ANALYZE=true npm run build
```

**분석 후 기대 최적화 항목**:
- recharts tree-shaking 확인
- @ant-design/icons 개별 import 확인 (전체 import 금지)

```typescript
// 잘못된 예 (전체 번들 포함)
import * as Icons from '@ant-design/icons';

// 올바른 예 (트리쉐이킹)
import { ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
```

### 3-3. 대용량 데이터 처리 전략

#### 가상화 테이블 (Virtualization)

```typescript
// react-virtual 또는 @tanstack/react-virtual 사용
// 1만 건 주문 데이터도 60fps 유지 가능

import { useVirtualizer } from '@tanstack/react-virtual';

// 언제 필요한가?
// - 테이블 행이 200개 이상일 때
// - 스크롤 시 성능 저하가 느껴질 때
```

#### 페이지네이션 vs 무한 스크롤

| 방식 | 장점 | 단점 | SellOps 적합도 |
|------|------|------|---------------|
| 페이지네이션 | URL 공유 가능, 위치 기억 | UX 끊김 | ✅ (현재 구현됨) |
| 무한 스크롤 | 자연스러운 UX | URL 공유 불가 | 선택적 |
| 가상화 | 대용량 성능 최고 | 구현 복잡 | 데이터 많을 때 |

---

## 4. 접근성 (Accessibility) — 취업 시 중요도 상승 추세

### 현재 점검 필요 항목

```typescript
// 1. 아이콘 버튼 aria-label 필수
// 잘못된 예
<button onClick={onClose}>
  <CloseOutlined />
</button>

// 올바른 예
<button onClick={onClose} aria-label="알림 닫기">
  <CloseOutlined aria-hidden="true" />
</button>

// 2. 색상 대비 (WCAG AA 기준 4.5:1)
// 현재 textSecondary (#666666 on white #FFFFFF) → 대비율 5.74:1 ✅
// CRITICAL 뱃지 배경색 점검 필요

// 3. 키보드 탐색
// 사이드바 메뉴 Tab 키 이동
// 모달 포커스 트랩
// Escape 키 닫기 (Header에 이미 구현됨 ✅)

// 4. 스크린 리더 지원
// 차트에 aria-label 또는 테이블 형태 대안 제공
// 테이블에 caption 추가
```

### ARIA 패턴 적용 체크리스트

| 컴포넌트 | 필요한 ARIA | 현재 상태 |
|----------|-------------|-----------|
| NotificationDropdown | `role="menu"`, `aria-expanded` | 확인 필요 |
| Sidebar 네비 | `role="navigation"`, `aria-current="page"` | 확인 필요 |
| 모달 | `role="dialog"`, `aria-modal`, 포커스 트랩 | 미구현 |
| 차트 | `role="img"`, `aria-label` | 미적용 |
| 상태 뱃지 | `aria-label` (색상만으로 상태 표현 금지) | 확인 필요 |

---

## 5. 보안 (Security)

### 현재 확인이 필요한 보안 항목

```typescript
// 1. 환경변수 클라이언트 노출 금지
// NEXT_PUBLIC_ 접두사 없는 변수는 서버에서만 접근
// next-auth secret은 절대 클라이언트에 노출 금지

// 2. API Route 인증 검증
// 모든 API Route에서 세션 확인 필수
import { getServerSession } from 'next-auth';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// 3. XSS 방지
// dangerouslySetInnerHTML 사용 금지
// 사용자 입력 값 sanitize

// 4. CSRF 보호
// next-auth가 기본 제공하지만 커스텀 API Route에서 별도 처리 필요
```

---

## 6. 코드 품질 도구 체크리스트

### 현재 설정된 것
- ✅ ESLint (eslint-config-next 포함)
- ✅ TypeScript strict mode
- ✅ PostCSS + Autoprefixer
- ✅ CodeRabbit 자동 코드 리뷰

### 추가 권장 설정

```bash
# 1. Prettier (코드 포맷 통일)
npm install --save-dev prettier eslint-config-prettier

# .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 120
}

# 2. Husky + lint-staged (커밋 전 자동 검사)
npm install --save-dev husky lint-staged

# pre-commit: lint + typecheck + test 실행
# → 깨진 코드가 커밋되는 것 방지

# 3. TypeScript 엄격 검사 추가 옵션
# tsconfig.json
{
  "noUncheckedIndexedAccess": true,    // 배열 접근 시 undefined 체크 강제
  "exactOptionalPropertyTypes": true   // optional 타입 더 엄격하게
}
```

---

## 7. 모니터링 & 에러 트래킹

### 포트폴리오 배포 후 추가하면 좋은 것

```typescript
// Sentry 에러 트래킹 (무료 플랜 가능)
// 실제 사용자 에러 발생 시 알림
// 면접에서 "운영 경험"으로 어필 가능

// npm install @sentry/nextjs
// npx @sentry/wizard@latest -i nextjs

// Vercel Analytics (내장)
// Core Web Vitals 실시간 측정
// import { Analytics } from '@vercel/analytics/react';
```

---

## 8. 실무 기준 체크리스트 요약

### 코드 품질
- [ ] TypeScript 에러 0개 (`npm run build` 통과)
- [ ] ESLint 에러 0개 (`npm run lint` 통과)
- [ ] `any` 타입 사용 없음
- [ ] 빈 파일 없음 (placeholder 파일 모두 구현)

### 테스트
- [ ] Jest 단위 테스트 실행 성공 (`npm run test`)
- [ ] 유틸 함수 80% 이상 커버리지
- [ ] 주요 컴포넌트 렌더링 테스트 존재
- [ ] E2E 최소 5개 시나리오

### 성능
- [ ] Lighthouse Performance 점수 80점 이상
- [ ] Lighthouse Accessibility 점수 80점 이상
- [ ] 차트 dynamic import 적용
- [ ] 이미지 next/image 사용

### 배포
- [ ] Vercel 배포 완료 + 데모 URL 존재
- [ ] 환경변수 .env 미커밋 확인
- [ ] GitHub Actions lint + test 자동화

### 문서
- [ ] README.md에 데모 URL 포함
- [ ] README.md에 기술 스택 및 의사결정 설명 포함
- [ ] 주요 기능 스크린샷 또는 GIF 포함

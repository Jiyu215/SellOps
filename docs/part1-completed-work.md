# Part 1. 현재 완료된 작업 정리

> 기준일: 2026-04-15 | 레포지토리: jiyu215/SellOps

---

## 전체 진행 현황 요약

| 이슈 | 제목 | PR | 상태 | 머지 여부 |
|------|------|----|------|-----------|
| #1 | 프로젝트 아키텍쳐 설정 | #2 | CLOSED | 머지됨 |
| #3 | Theme 구조 및 시스템 구축 | #4 | CLOSED | 머지됨 |
| #5 | 관리자 대시보드 구축 | #6 | CLOSED | 머지됨 |
| #7 | 주문 관리 페이지 구현 | #8 | **OPEN** | **미머지 (리뷰 대기)** |

---

## Issue #1 / PR #2 — 프로젝트 아키텍쳐 설정 (완료)

**작업 기간**: 2026-03-16  
**브랜치**: `chore/1-project-setup`

### 완료된 세부 작업
- Next.js App Router 기반 프로젝트 초기화
- `src/` 디렉토리 구조 생성
- App Router route group 구조 생성
  - `(marketing)` — 마케팅 홈페이지 그룹
  - `auth/` — 인증 페이지 그룹
  - `dashboard/` — 대시보드 그룹
- 공통 폴더 구조 생성
  - `components/`, `hooks/`, `store/`, `services/`, `utils/`, `types/`, `constants/`
- ESLint + Prettier 설정 완료
- `tsconfig.json` path alias 설정 (`@/*` → `src/*`)
- `.env.local` 환경변수 파일 템플릿 생성
- GitHub 이슈 템플릿, PR 템플릿, 버그 템플릿 생성
- 각 페이지 placeholder 파일 생성

### 생성된 주요 파일 구조
```
src/
├── app/
│   ├── auth/ (login, register, forgot-password)
│   ├── dashboard/ (analytics, customers, products, sales, settings)
│   ├── marketing/ (about, features, pricing)
│   ├── api/ (auth, health)
│   ├── layout.tsx
│   └── page.tsx
├── components/ (dashboard/, marketing/, ui/)
├── hooks/
├── store/
├── services/
├── utils/
├── types/
└── constants/
```

---

## Issue #3 / PR #4 — Theme 구조 및 시스템 구축 (완료)

**작업 기간**: 2026-03-16  
**브랜치**: `feature/3-theme-system`

### 완료된 세부 작업
- 초기: styled-components ThemeProvider 기반 테마 시스템 구축
  - `lightColors`, `darkColors` 색상 토큰 정의
  - Typography 스타일 정의
  - Spacing 규칙 정의 (`spacingPx`, `spacingRem`)
  - Shadow 및 Border 스타일 정의
  - Global Style 설정 (`globals.css`)
- **이후 PR #6에서 전면 TailwindCSS로 마이그레이션**
  - styled-components 완전 제거
  - `tailwind.config.js` 커스텀 토큰 설정 (color, typography, spacing, shadow)
  - `postcss.config.mjs` 설정 (`@tailwindcss/postcss` + `autoprefixer`)

### 현재 실제 적용된 Tailwind 커스텀 토큰 (tailwind.config.js)
- 색상: primary, secondary, background, surface, textPrimary, textSecondary, border, success, error, warning, info (light/dark 각각)
- 폰트: Pretendard, Noto Sans KR
- 커스텀 spacing, shadow, borderRadius 토큰

---

## Issue #5 / PR #6 — 관리자 대시보드 구축 (완료)

**작업 기간**: 2026-03-26 ~ 2026-03-29  
**브랜치**: `feature/5-dashboard-mvp`  
**코드 리뷰**: `codereview/dashboard-mvp-code-review.md` (11건 이슈 해결 완료)

### 1. 레이아웃 & 공통 컴포넌트

| 파일 | 내용 |
|------|------|
| `DashboardLayout.tsx` | 모바일 사이드바 상태, 알림 markRead/markAllRead 통합 |
| `Sidebar.tsx` | 로고 SVG/PNG, 네비게이션 메뉴, 모바일 슬라이드인 UX, 하단 버튼 영역 |
| `Header.tsx` | 검색바, 햄버거 버튼, 알림 드롭다운, Escape 키 닫기 |
| `NotificationDropdown.tsx` | 미읽음/읽음 구분, 상대시간, 타입별 아이콘, 전체보기 |

### 2. KPI 카드 섹션

| 파일 | 내용 |
|------|------|
| `kpi/KPICard.tsx` | 상태별 프로그레스바, CRITICAL 뱃지(pulse 애니메이션), 다크모드 지원 |
| `kpi/KPICardGrid.tsx` | 반응형 3열 그리드 |

### 3. 차트 섹션

| 파일 | 내용 |
|------|------|
| `charts/SalesShortTermChart.tsx` | 최근 7일 주간 매출/주문 선 그래프, 이상치 강조, Recharts 기반 |
| `charts/SalesComboChart.tsx` | 6/12개월 콤보차트(막대+선), 클릭 시 월별 상세 패널 |
| `charts/CategoryDoughnutChart.tsx` | 도넛 차트, 중앙 총 카테고리 수 텍스트, 커스텀 범례 |

### 4. 데이터 표시 섹션

| 파일 | 내용 |
|------|------|
| `products/TopProductsCard.tsx` | 기간별 Top5 제품, 프로그레스바 애니메이션 |
| `inventory/LowStockTable.tsx` | 위험도별 뱃지/게이지바, 재고 부족 현황 패널 |
| `orders/OrderTable.tsx` | 한국어 초성 검색, 페이지네이션, CSV 내보내기, 결제방식 필터 |

### 5. 유틸리티 & 인프라

| 파일 | 내용 |
|------|------|
| `utils/choseong.ts` | 한국어 초성 검색 유틸리티 (ㄱ→가나다 매핑) |
| `hooks/useThemeToggle.ts` | 다크모드 토글 훅 |
| `hooks/useOrderFilter.ts` | 주문 필터 커스텀 훅 |
| `components/ui/ErrorBoundary.tsx` | 전역 에러 경계 컴포넌트 |
| `skeletons/DashboardSkeleton.tsx` | 로딩 시 전체 대시보드 스켈레톤 UI |
| `src/middleware.ts` | 인증 보호 미들웨어 (로그인 없이 대시보드 접근 차단) |

### 6. Mock 데이터

| 파일 | 내용 |
|------|------|
| `constants/mockData.ts` | 주문, 재고, 판매 차트, KPI, 알림(10건) 등 전체 Mock 데이터 |
| `constants/config.ts` | 앱 설정 상수 |
| `services/dashboardService.ts` | Mock 데이터 기반 대시보드 서비스 |
| `types/dashboard.ts` | 전체 대시보드 TypeScript 타입 정의 |
| `types/charts.ts` | 차트 관련 TypeScript 타입 정의 |

### 7. 테스트

| 파일 | 내용 |
|------|------|
| `orders/OrderTable.test.tsx` | OrderTable 단위 테스트 |
| `hooks/useOrderFilter.test.ts` | useOrderFilter 훅 단위 테스트 |
| `utils/choseong.test.ts` | 초성 검색 유틸 단위 테스트 |

### 8. 반응형 레이아웃 구현 상태

| 화면 | 사이드바 | KPI | 차트 | 재고 | 테이블 |
|------|----------|-----|------|------|--------|
| PC (≥1280px) | 190px 고정 | 3열 | 2열(2:1) | 3열 | 전체 컬럼 |
| 태블릿 (768~1279px) | 아이콘만(60px) | 2+1열 | 1열 스택 | 2+1열 | 보조컬럼 숨김 |
| 모바일 (≤767px) | 오버레이 메뉴 | 1열 | 1열 | 1열 | 카드형 변환 |

### 9. CodeRabbit 자동 코드 리뷰 연동
- `.coderabbit.yaml` 설정 완료
- 코드 품질 자동 검토 파이프라인 적용

---

## Issue #7 / PR #8 — 주문 관리 페이지 (PR OPEN, 미머지)

**작업 기간**: 2026-04-09 ~  
**브랜치**: `feature/7-order-management`  
**상태**: PR #8 오픈 상태 — master에 미머지

### 완료된 세부 작업 (브랜치 기준)

#### 주문 관리 목록 페이지 (`/dashboard/orders`)
- `OrderTable.tsx` 대폭 확장
  - 주문 상태 필터 (전체 / 결제완료 / 배송중 / 취소 등)
  - 검색 기능 (주문번호, 고객명) + debounce 300ms
  - 한글 IME 처리 적용
  - URL query 기반 상태 유지 (필터, 검색어 공유 가능)
  - 페이지네이션
- `OrdersPageSkeleton.tsx` — 주문 페이지 전용 스켈레톤
- `OrdersContent.tsx` — 주문 페이지 컨텐츠 컴포넌트

#### 주문 상세 페이지 (`/dashboard/orders/[id]`)
- 주문 상세 정보 UI
- 주문 상태 이력 기능
- 주문 메모 기능

### 현재 PR #8 미완료 항목
- [ ] 테스트 미완료 체크박스 상태
- [ ] UI/UX 리뷰 미완료 상태
- [ ] 배송 상태 변경 기능 (선택적 처리 — 설계만 완료)

---

## 현재 빈 파일 목록 (구조만 생성, 미구현)

### Types
- `src/types/api.ts` — 비어있음
- `src/types/sales.ts` — 비어있음
- `src/types/user.ts` — 비어있음

### Hooks
- `src/hooks/useAuth.ts` — 비어있음
- `src/hooks/useDebounce.ts` — 비어있음
- `src/hooks/useMediaQuery.ts` — 비어있음
- `src/hooks/useModal.ts` — 비어있음

### Store (Zustand)
- `src/store/authStore.ts` — 비어있음
- `src/store/salesStore.ts` — 비어있음
- `src/store/uiStore.ts` — 비어있음

### Services
- `src/services/apiClient.ts` — 비어있음
- `src/services/authService.ts` — 비어있음
- `src/services/customerService.ts` — 비어있음
- `src/services/salesService.ts` — 비어있음

### Utils
- `src/utils/debounce.ts` — 비어있음
- `src/utils/formatCurrency.ts` — 비어있음
- `src/utils/formatDate.ts` — 비어있음

### Constants
- `src/constants/api.ts` — 비어있음
- `src/constants/routes.ts` — 비어있음

### 빈 페이지 라우트
- `/dashboard/analytics/`
- `/dashboard/customers/`
- `/dashboard/products/`
- `/dashboard/sales/`
- `/dashboard/settings/`
- `/auth/register/`
- `/auth/forgot-password/`
- `/marketing/about/`
- `/marketing/features/`
- `/marketing/pricing/`

---

## 현재 기술 스택 실제 적용 현황

| 기술 | 계획 | 실제 적용 여부 |
|------|------|---------------|
| Next.js 16 App Router | O | **적용됨** |
| TypeScript strict | O | **적용됨** |
| TailwindCSS 4 | O | **적용됨** |
| Recharts | O | **적용됨** |
| Ant Design Icons | O | **적용됨** |
| next-auth 4 | O | **부분 적용** (미들웨어만, 실제 로그인 UI 미완성) |
| Zustand | O | 파일만 있음, **미구현** |
| Prisma / PostgreSQL | O | **미시작** |
| Redis | O | **미시작** |
| Stripe / PG 연동 | O | **미시작** |
| Vercel 배포 | O | **미시작** |
| GitHub Actions CI/CD | O | **미시작** |
| Playwright E2E | O | **미시작** |
| Storybook | O | **미시작** |

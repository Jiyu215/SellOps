# Part 2. 전체 작업 목록 및 진행 현황

> 프로젝트를 완성하기 위해 필요한 모든 작업을 정리한 목록입니다.  
> ✅ = 완료 | 🔄 = 진행중 (PR OPEN) | ⬜ = 미시작

---

## 카테고리별 작업 현황

---

### A. 인프라 & 초기 설정

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| A-1 | 프로젝트 아키텍쳐 설정 (폴더 구조, tsconfig) | ✅ | Issue #1 |
| A-2 | TailwindCSS 테마 시스템 구축 | ✅ | Issue #3 → PR #6에서 재구축 |
| A-3 | ESLint + Prettier 설정 | ✅ | |
| A-4 | GitHub 이슈/PR/버그 템플릿 생성 | ✅ | |
| A-5 | CodeRabbit 자동 코드 리뷰 설정 | ✅ | `.coderabbit.yaml` |
| A-6 | Jest + Testing Library 설정 | ✅ | `jest.config.ts` |
| A-7 | GitHub Actions CI/CD 파이프라인 | ⬜ | lint + test 자동화 |
| A-8 | Vercel 배포 연동 | ⬜ | 환경변수 관리 포함 |
| A-9 | 환경변수 zod 검증 스키마 | ⬜ | CLAUDE.md 필수 규칙 |
| A-10 | Playwright E2E 설정 | ⬜ | |

---

### B. 인증 (Auth)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| B-1 | next-auth 미들웨어 (대시보드 접근 보호) | ✅ | `middleware.ts` |
| B-2 | 로그인 페이지 UI | ⬜ | 페이지 파일만 존재 (내용 없음) |
| B-3 | 로그인 기능 구현 (next-auth 연동) | ⬜ | `authService.ts` 비어있음 |
| B-4 | 회원가입 페이지 UI + 기능 | ⬜ | |
| B-5 | 비밀번호 재설정 페이지 UI + 기능 | ⬜ | |
| B-6 | Zustand authStore 구현 | ⬜ | 파일만 존재 |
| B-7 | useAuth 훅 구현 | ⬜ | 파일만 존재 |
| B-8 | 세션 관리 (Redis 기반) | ⬜ | |

---

### C. 공통 유틸리티 & 훅

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| C-1 | `useThemeToggle` 다크모드 훅 | ✅ | |
| C-2 | `useOrderFilter` 주문 필터 훅 | ✅ | |
| C-3 | `choseong.ts` 한국어 초성 검색 유틸 | ✅ | |
| C-4 | `useDebounce` 훅 | ⬜ | 파일만 존재 |
| C-5 | `useMediaQuery` 훅 | ⬜ | 파일만 존재 |
| C-6 | `useModal` 훅 | ⬜ | 파일만 존재 |
| C-7 | `formatCurrency` 유틸 | ⬜ | 파일만 존재 |
| C-8 | `formatDate` 유틸 | ⬜ | 파일만 존재 |
| C-9 | `debounce` 유틸 | ⬜ | 파일만 존재 |
| C-10 | `constants/routes.ts` 라우트 상수 | ⬜ | 파일만 존재 |
| C-11 | `constants/api.ts` API 경로 상수 | ⬜ | 파일만 존재 |

---

### D. 공통 UI 컴포넌트 (`/components/ui`)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| D-1 | ErrorBoundary | ✅ | |
| D-2 | Button 컴포넌트 | ⬜ | 폴더만 존재 |
| D-3 | Card 컴포넌트 | ⬜ | 폴더만 존재 |
| D-4 | Input 컴포넌트 | ⬜ | 폴더만 존재 |
| D-5 | Modal 컴포넌트 | ⬜ | 폴더만 존재 |
| D-6 | Table 컴포넌트 | ⬜ | 폴더만 존재 |
| D-7 | Badge 컴포넌트 | ⬜ | 폴더만 존재 |
| D-8 | Toast / 알림 메시지 컴포넌트 | ⬜ | |
| D-9 | Skeleton 기본 컴포넌트 | ✅ | DashboardSkeleton |
| D-10 | Pagination 공용 컴포넌트 | ⬜ | OrderTable에 내장됨, 분리 필요 |

---

### E. 대시보드 레이아웃 & 공통 (Dashboard)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| E-1 | DashboardLayout (사이드바+헤더 통합) | ✅ | |
| E-2 | Sidebar (로고, 네비, 모바일 오버레이) | ✅ | |
| E-3 | Header (검색, 알림, 설정, 다크모드) | ✅ | |
| E-4 | NotificationDropdown | ✅ | |
| E-5 | DashboardContent (메인 홈 화면) | ✅ | |
| E-6 | 대시보드 로딩 스켈레톤 | ✅ | |
| E-7 | Zustand uiStore (사이드바/모달 상태) | ⬜ | 파일만 존재 |

---

### F. 대시보드 홈 — KPI & 차트

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| F-1 | KPICard (프로그레스바, CRITICAL 뱃지) | ✅ | |
| F-2 | KPICardGrid (반응형 3열) | ✅ | |
| F-3 | SalesShortTermChart (7일 선 그래프) | ✅ | |
| F-4 | SalesComboChart (6/12개월 콤보차트) | ✅ | |
| F-5 | CategoryDoughnutChart (도넛+범례) | ✅ | |
| F-6 | TopProductsCard (Top5 랭킹) | ✅ | |
| F-7 | LowStockTable (재고 부족 현황) | ✅ | |

---

### G. 주문 관리 (Orders)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| G-1 | OrderTable (검색, 필터, 페이지네이션, CSV) | 🔄 | PR #8 |
| G-2 | 주문 상태 필터 (전체/결제/배송/취소) | 🔄 | PR #8 |
| G-3 | URL query 기반 상태 유지 | 🔄 | PR #8 |
| G-4 | 주문 상세 페이지 `/orders/[id]` | 🔄 | PR #8 |
| G-5 | 주문 상태 이력 UI | 🔄 | PR #8 |
| G-6 | 주문 메모 기능 | 🔄 | PR #8 |
| G-7 | 배송 상태 변경 기능 | 🔄 | PR #8 설계만 |
| G-8 | PR #8 머지 | ⬜ | 코드 리뷰 후 머지 필요 |

---

### H. 제품 관리 (Products)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| H-1 | 제품 목록 페이지 UI | ⬜ | `/dashboard/products` placeholder |
| H-2 | 제품 등록/수정 폼 | ⬜ | |
| H-3 | 제품 이미지 업로드 | ⬜ | |
| H-4 | 제품 카테고리 관리 | ⬜ | |
| H-5 | 제품 Variant (옵션) 관리 | ⬜ | 키보드/마우스 색상, 크기 등 |
| H-6 | 재고 수량 관리 | ⬜ | |
| H-7 | 제품 검색/필터/정렬 | ⬜ | |

---

### I. 고객 관리 (Customers)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| I-1 | 고객 목록 페이지 UI | ⬜ | `/dashboard/customers` placeholder |
| I-2 | 고객 상세 페이지 | ⬜ | 주문 내역, 회원 등급 포함 |
| I-3 | 고객 검색/필터 | ⬜ | |
| I-4 | 고객 등급 관리 | ⬜ | |

---

### J. 매출/분석 (Analytics & Sales)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| J-1 | 분석 페이지 UI | ⬜ | `/dashboard/analytics` placeholder |
| J-2 | 매출 페이지 UI | ⬜ | `/dashboard/sales` placeholder |
| J-3 | 기간별 매출 집계 차트 | ⬜ | |
| J-4 | 매출 데이터 필터 (날짜, 카테고리) | ⬜ | |
| J-5 | Zustand salesStore 구현 | ⬜ | 파일만 존재 |

---

### K. 설정 (Settings)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| K-1 | 설정 페이지 UI | ⬜ | `/dashboard/settings` placeholder |
| K-2 | 프로필 설정 | ⬜ | |
| K-3 | 알림 설정 | ⬜ | |
| K-4 | 보안 설정 (비밀번호 변경) | ⬜ | |

---

### L. API & 백엔드 연동

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| L-1 | `apiClient.ts` (axios 기반 공통 클라이언트) | ⬜ | 파일만 존재 |
| L-2 | `authService.ts` (로그인/로그아웃/토큰) | ⬜ | 파일만 존재 |
| L-3 | `salesService.ts` (매출 API 연동) | ⬜ | 파일만 존재 |
| L-4 | `customerService.ts` (고객 API 연동) | ⬜ | 파일만 존재 |
| L-5 | `dashboardService.ts` → Mock에서 실제 API로 교체 | ⬜ | 현재 Mock 기반 |
| L-6 | Next.js API Routes 구현 (서버 측) | ⬜ | `api/auth`, `api/health` 폴더만 존재 |
| L-7 | AppError 클래스 통일 에러 처리 | ⬜ | CLAUDE.md 필수 패턴 |

---

### M. DB & ORM (Prisma + PostgreSQL)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| M-1 | Prisma 설치 및 초기화 | ⬜ | |
| M-2 | Supabase PostgreSQL 연결 설정 | ⬜ | |
| M-3 | User / Admin 스키마 정의 | ⬜ | |
| M-4 | Product / Variant 스키마 정의 | ⬜ | |
| M-5 | Order / OrderItem 스키마 정의 | ⬜ | |
| M-6 | Cart / CartItem 스키마 정의 | ⬜ | |
| M-7 | Payment 스키마 정의 | ⬜ | |
| M-8 | `/db` 모듈 구성 및 트랜잭션 처리 | ⬜ | CLAUDE.md 필수 패턴 |
| M-9 | DB 마이그레이션 관리 | ⬜ | |

---

### N. 결제 (Payment)

| # | 작업 | 이상태 | 비고 |
|---|------|-------|------|
| N-1 | Stripe / PG사 연동 설정 | ⬜ | |
| N-2 | 결제 승인/실패/취소 처리 | ⬜ | |
| N-3 | 결제 Webhook 처리 | ⬜ | |
| N-4 | 결제 내역 관리 | ⬜ | |

---

### O. 마케팅 홈페이지 (Marketing)

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| O-1 | 랜딩 메인 페이지 | ⬜ | `/marketing/page.tsx` placeholder |
| O-2 | About 페이지 | ⬜ | placeholder |
| O-3 | Features 페이지 | ⬜ | placeholder |
| O-4 | Pricing 페이지 | ⬜ | placeholder |
| O-5 | 마케팅 공통 헤더/푸터 컴포넌트 | ⬜ | `components/marketing/` 빈 폴더 |

---

### P. 테스트

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| P-1 | Jest 설정 | ✅ | `jest.config.ts` |
| P-2 | `choseong.test.ts` 단위 테스트 | ✅ | |
| P-3 | `useOrderFilter.test.ts` 단위 테스트 | ✅ | |
| P-4 | `OrderTable.test.tsx` 컴포넌트 테스트 | ✅ | |
| P-5 | UI 컴포넌트 단위 테스트 (Button, Card 등) | ⬜ | |
| P-6 | 인증 흐름 단위 테스트 | ⬜ | |
| P-7 | API 서비스 단위 테스트 | ⬜ | |
| P-8 | Playwright 설치 및 설정 | ⬜ | |
| P-9 | 로그인 E2E 테스트 | ⬜ | |
| P-10 | 대시보드 주요 흐름 E2E 테스트 | ⬜ | |
| P-11 | 주문 관리 E2E 테스트 | ⬜ | |

---

### Q. 성능 최적화

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| Q-1 | 차트 컴포넌트 dynamic import (코드 스플리팅) | ⬜ | |
| Q-2 | 이미지 최적화 (next/image 적용) | ⬜ | |
| Q-3 | React.memo / useMemo / useCallback 적용 | ⬜ | |
| Q-4 | 무한 스크롤 또는 가상화 테이블 | ⬜ | |
| Q-5 | Lighthouse 점수 측정 및 개선 | ⬜ | |
| Q-6 | Bundle Analyzer 적용 | ⬜ | |

---

### R. 배포 & DevOps

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| R-1 | Vercel 배포 설정 | ⬜ | |
| R-2 | 환경변수 Vercel 등록 | ⬜ | |
| R-3 | GitHub Actions — lint + test 자동화 | ⬜ | |
| R-4 | GitHub Actions — Vercel 자동 배포 | ⬜ | |
| R-5 | Railway 백엔드 배포 (선택) | ⬜ | |

---

### S. 문서화

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| S-1 | README.md 작성 (프로젝트 소개, 실행 방법) | ⬜ | 현재 기본 README만 있음 |
| S-2 | Storybook 설정 및 UI 컴포넌트 문서화 | ⬜ | |
| S-3 | API 문서 (Swagger 또는 README) | ⬜ | |

---

## 전체 진행률 요약

| 카테고리 | 완료 | 진행중 | 미시작 | 진행률 |
|----------|------|--------|--------|--------|
| A. 인프라 & 설정 | 6 | 0 | 4 | 60% |
| B. 인증 | 1 | 0 | 7 | 13% |
| C. 유틸리티 & 훅 | 3 | 0 | 8 | 27% |
| D. 공통 UI 컴포넌트 | 2 | 0 | 8 | 20% |
| E. 대시보드 레이아웃 | 6 | 0 | 1 | 86% |
| F. KPI & 차트 | 7 | 0 | 0 | 100% |
| G. 주문 관리 | 0 | 7 | 1 | 50% |
| H. 제품 관리 | 0 | 0 | 7 | 0% |
| I. 고객 관리 | 0 | 0 | 4 | 0% |
| J. 매출/분석 | 0 | 0 | 5 | 0% |
| K. 설정 | 0 | 0 | 4 | 0% |
| L. API & 백엔드 연동 | 0 | 0 | 7 | 0% |
| M. DB & ORM | 0 | 0 | 9 | 0% |
| N. 결제 | 0 | 0 | 4 | 0% |
| O. 마케팅 홈페이지 | 0 | 0 | 5 | 0% |
| P. 테스트 | 4 | 0 | 7 | 36% |
| Q. 성능 최적화 | 0 | 0 | 6 | 0% |
| R. 배포 & DevOps | 0 | 0 | 5 | 0% |
| S. 문서화 | 0 | 0 | 3 | 0% |
| **합계** | **29** | **7** | **105** | **~20%** |

> 전체 작업 기준 약 **20% 완료** 상태  
> 대시보드 홈 화면 자체는 거의 완성 수준이나, 실제 데이터 연동 및 나머지 페이지들이 대부분 미시작

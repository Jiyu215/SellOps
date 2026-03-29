# Project: Sellops (전자상거래를 지원하는 운영 관리 시스템 플랫폼 (관리자용 대시보드))

## Critical Rules 

- styled-components 사용 금지, TailwindCSS 유틸리티 클래스 기반 스타일링만 허용
- TypeScript strict 모드 적용, `any` 사용 금지
- .env 파일 절대 커밋 금지
- 다크모드 처리 시 Tailwind `dark` 클래스만 사용, ThemeProvider 불필요
- 컴포넌트 단위 스타일 최소화, Tailwind 클래스 우선 사용
- PostCSS 설정: `@tailwindcss/postcss` + `autoprefixer` 필수
- 모든 페이지 및 컴포넌트는 ESLint 검사 후 PR 제출

## Architecture

모노레포 구조, Turborepo 기반

- `/app`: Next.js App Router 기반 페이지 및 레이아웃  
  - `api`: 서버 API 라우트  
  - `auth`: 로그인, 회원가입, 비밀번호 재설정 등 인증 페이지  
  - `dashboard`: 대시보드 페이지 (analytics, products, sales 등)  
  - `marketing`: 제품 판매 홈페이지 페이지 (about, features, pricing 등)  

- `/components`: 재사용 가능한 UI 컴포넌트  
  - `dashboard`: 대시보드 전용 컴포넌트  
  - `marketing`: 마케팅 페이지 전용 컴포넌트  
  - `ui`: 버튼, 카드, 모달, 테이블 등 공용 UI 컴포넌트  

- `/constants`: API 경로, 라우트, 환경설정 등 상수 정의  

- `/features`: 기능 단위 모듈 (예: `auth`)  
  - 기능별 컴포넌트, 훅, 서비스 로직 포함  

- `/hooks`: 커스텀 훅 관리 (예: useAuth, useDebounce, useModal)  

- `/lib`: 공통 라이브러리 및 유틸리티 (예: axios, logger, queryClient)  

- `/services`: API 호출 및 비즈니스 로직 모듈  

- `/store`: Zustand 기반 상태 관리 모듈 (예: authStore, salesStore, uiStore)  

- `/styles`: 글로벌 CSS 및 테마  
  - `theme`: 라이트/다크 모드, 색상, spacing, typography, shadows 등  

- `/types`: TypeScript 타입 정의 (API 응답, 사용자, 판매 등)  

- `/utils`: 공통 유틸리티 함수 (예: debounce, formatCurrency, formatDate)

- `/db`: Prisma ORM 기반 DB 접근 모듈, 트랜잭션 처리

- `/tests`: 단위 및 통합 테스트 파일 관리 (Jest, Playwright)

- `/storybook`: UI 컴포넌트 문서화



## Tech Stack

- Frontend: Next.js 16, TypeScript strict 모드, TailwindCSS, Zustand (상태관리), React Hooks / Context API
- Backend: Express + TypeScript, Prisma ORM, Next.js API Routes (초기 개발 시 일부 사용)
- DB: PostgreSQL (Supabase), Redis (캐싱 / 세션 관리)
- Infra / DevOps: Vercel(Frontend), Railway(Backend/API), GitHub Actions(CI/CD), Turbopack (개발 서버 최적화)

## Build & Test Commands

- `npm run dev`: 개발 서버 실행 (포트 3000)
- `npm run build`: 프로젝트 빌드
- `npm run start`: 배포 서버 실행
- `npm run lint`: ESLint 검사
- `npm run test`: Jest 단위 테스트 실행
- `npm run test:e2e`: Playwright end-to-end 테스트 실행

## Domain Context

- Product / Variant: 키보드, 마우스, 허브 등 제품 및 옵션 단위 관리, 가격/이미지/재고 포함
- Cart: 선택한 제품 및 수량 담기, 쿠폰/할인/세금 계산, 로그인 사용자 연동
- Order: Cart 기반 주문 생성, 상태 관리(결제 대기 → 결제 완료 → 배송 준비), 취소/환불 처리
- Payment: 결제 승인/실패/취소 처리, Stripe/PG사 연동
- Fulfillment: 재고 차감, 송장 생성, 배송 상태 업데이트, 반품/교환 처리

## Coding Conventions

- React 컴포넌트: named export 사용, default export 금지, 파일명 PascalCase (`ProductCard.tsx`) 
- Custom Hook / 유틸: `use` 접두사, camelCase, 단일 책임 원칙  (`useCart.ts`, `formatPrice.ts`) 
- API 라우트: 응답 통일 `{ success, data, error }`, try/catch 필수  
- 커밋 메시지: 영어, Conventional Commits 준수 (`feat:`, `fix:`, `docs:` 등)  
- 코드 주석: 한국어 허용, JSDoc 스타일 권장  
- 변수 / 함수 / 상수 / 타입: 
    - 변수/함수: camelCase (`fetchCartData`)  
    - 상수: UPPER_SNAKE_CASE (`MAX_ITEMS`)  
    - 타입/인터페이스: PascalCase (`CartItem`, `UserProfile`)  camelCase/UPPER_SNAKE_CASE/PascalCase 규칙  
- 스타일링: TailwindCSS 유틸리티 중심, styled-components 사용 금지  
- 테스트: Jest 단위 테스트, Playwright E2E, 파일명 `[파일명].test.ts` / `[파일명].spec.ts`  

## Key Patterns

- Server Components 우선, 클라이언트 상태 필요할 경우만 `'use client'` 사용
- 클라이언트 전역 상태는 Zustand 사용, 상태 관리와 UI 로직 분리, 재사용성 확보
- DB 접근은 반드시 `/db/` 모듈 사용, Prisma 쿼리를 직접 컴포넌트에서 호출 금지
- 비즈니스 로직을 API/컴포넌트와 분리, 단일 책임 원칙(SRP) 적용
- API 에러는 반드시 AppError 클래스 사용, 모든 API 응답 구조: 
```json
{ "success": true|false, "data": {...}, "error": "오류 메시지" }
```
- 환경변수 접근 전 zod schema로 타입/값 검증, 필수 변수 누락 시 런타임 에러 발생
- UI 컴포넌트는 `/components/ui`에 모듈화, Props를 통한 확장성 확보
- 앱/패키지 단위 분리, 변경된 부분만 빌드, Remote caching 활용
- TailwindCSS 중심, 공통 스타일은 `globals.css` / `theme` 정의, 컴포넌트별 스타일 최소화
- 모든 서버/클라이언트 API 호출에서 try/catch, AppError 기반 통일, 필요 시 로그 기록
- 단위 테스트: Jest, 단위 테스트: Jest, E2E 테스트: Playwright

## Responsive Design

- TailwindCSS breakpoints 사용 (`sm`, `md`, `lg`, `xl`, `2xl`)
- 모바일 우선(Mobile First) 작성
- 데스크탑 중심 레이아웃, 모바일/태블릿은 Flex/Grid 조정
- 테이블/차트 등 대시보드 컴포넌트는 가로 스크롤 최소화
- 공통 UI 요소는 재사용 가능한 반응형 컴포넌트로 관리

## AI Code Generation & Execution Guidelines

### 즉시 실행 금지
- AI가 생성한 코드는 **바로 실행하지 않고** 반드시 사람이 검토
- 테스트 환경에서 먼저 실행 후 문제 없을 경우에만 프로덕션 반영

### 이슈 단위 생성
- AI 코드 생성은 **작업 단위(issue/task)별로 분리**
- 한 번에 대규모 코드 생성 금지
- 기능별로 작은 단위 생성 후 PR 단위로 코드 리뷰

### 검토 및 테스트
- 모든 AI 생성 코드는 **ESLint, TypeScript 검사, 단위/통합 테스트** 수행
- 테스트 통과 후 CI/CD 파이프라인 반영

### 버전 관리
- AI 생성 코드도 **Git commit 기록**
- 커밋 메시지 명확히 표시: `feat: AI-generated [기능명]` 또는 `fix: AI-generated [버그수정]`

### 보안
- AI 코드에 API 키, 환경변수, 민감 정보 포함 여부 확인
- 민감 정보가 포함되면 즉시 제거

### 책임
- 최종 동작/배포 책임은 **개발자가 부담**
- AI는 보조 도구일 뿐, 최종 결정과 검증은 인간이 수행
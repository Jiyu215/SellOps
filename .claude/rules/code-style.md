# Code Style Guide - SellOps

팀 내 모든 개발자가 일관된 스타일로 코드를 작성하고, 유지보수 및 협업 효율성을 높이기 위한 가이드라인

---

## 프로젝트 구조 & 네이밍

### 파일/폴더 네이밍
- **컴포넌트**: PascalCase  
  예: `ProductCard.tsx`, `DashboardLayout.tsx`

- **Hooks**: camelCase, `use` 접두사  
  예: `useCart.ts`, `useDebounce.ts`, `useAuth.ts`

- **상수 / 환경 변수**: UPPER_SNAKE_CASE  
  예: `MAX_ITEMS = 10`, `API_BASE_URL = "https://api.sellops.com"`

- **타입 / 인터페이스**: PascalCase  
  예: `UserProfile.ts`, `CartItem.ts`

### 경로
- `pages` 및 `app` 라우트: kebab-case 가능, 파일명은 `page.tsx` 유지  
- 기능별 폴더 구조 예:
  `/features/auth/hooks/useLogin.ts`
  `/features/auth/services/authService.ts`
  `/features/auth/components/LoginForm.tsx`

## React / Next.js 규칙

### 컴포넌트 작성
- 모든 컴포넌트 Named Export 사용, Default Export 금지  
- Server Components 우선 사용, 클라이언트 상태 필요 시 `'use client'` 선언  
- 함수형 컴포넌트만 사용  
- Props 구조 분해 사용 권장
```ts
export const ProductCard = ({ product }: { product: Product }) => {
    return <div>{product.name}</div>;
};
```

### 상태관리

- 클라이언트 전역 상태: Zustand 사용
- UI 로직과 상태 로직 분리
- 컴포넌트 내부 상태 최소화
- Props 전달과 이벤트 콜백 활용

### 이벤트 & 핸들러

- 이벤트 핸들러 이름: on 접두사 + 동사형
  예: `handleAddToCart`, `onClickSubmit`

## TypeScript 규칙

- strict 모드 필수
- any 사용 금지
- 타입 추론 적극 활용
- Optional/Required 구분 명확히

```ts
interface User {
    id: string;
    name?: string;
}
```

- 환경변수 접근 전 zod 등으로 타입 검증
- 함수 반환 타입 명시 권장
- API 응답 타입 정의 필수, `/types` 폴더 사용

## TailwindCSS / 스타일링

- TailwindCSS 유틸리티 클래스 기반, styled-components 금지
- 다크 모드: dark: 클래스만 사용
- 공통 스타일: globals.css 또는 /styles/theme
- 컴포넌트별 클래스 최소화, 재사용 UI 컴포넌트 활용
- Mobile First 작성, Breakpoint: `sm`, `md`, `lg`, `xl`, `2xl`

``` ts
<button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
    Buy Now
</button>
```

## 코드 포맷팅 & 린트

- ESLint + Prettier 사용
- 파일 저장 시 자동 포맷 적용
- PR 제출 전 ESLint 통과 필수
- 줄 길이: 120자 제한
- 세미콜론 사용: 선택적 (팀 합의에 따라)

## 컴포넌트 작성 컨벤션

### Props 타입 정의

```ts
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}
```

### 함수형 컴포넌트 작성

``` ts
export const Button = ({ label, onClick, disabled }: ButtonProps) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
            {label}
        </button>
    );
};
```

### 서버 / 클라이언트 구분

- 상태가 필요한 컴포넌트만 `use client` 선언
- 그 외 컴포넌트는 기본적으로 Server Component로 작성

## API & 서비스 규칙

- 모든 API 호출은 try/catch 필수
- 공통 응답 구조:
```json
{
    "success": true,
    "data": {...},
    "error": "오류 메시지"
}
```

- API 호출은 /services 또는 /lib/apiClient.ts에서 통합 관리
- Prisma DB 쿼리는 컴포넌트에서 직접 호출 금지, /db 모듈을 통해 접근

## 주석 & 문서화

- 주석: 한국어 허용, 필요 시 영어 혼용
- 함수 / 컴포넌트는 JSDoc 스타일 권장

``` ts
/**
 * 장바구니에 상품 추가
 * @param product 상품 객체
 */
function addToCart(product: Product) { }
```

- 코드 변경 사항은 반드시 PR 설명과 함께 기록

## 기타 규칙

- 커밋 메시지: 영어, Conventional Commits 준수
  - feat: 새로운 기능
  - fix: 버그 수정
  - docs: 문서 수정
  - refactor: 리팩토링
  - test: 테스트 관련
  - chore: 기타 작업
- 테스트 작성 필수
  - 단위 테스트: Jest
  - E2E 테스트: Playwright
- CI/CD 파이프라인: ESLint + Test 통과 후 Merge 가능
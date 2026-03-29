# Design System Guide: SellOps

## 1. Overview

**Purpose:**  
SellOps 디자인 시스템은 고급 개발자용 전자상거래 플랫폼을 위한 UI/UX 기준을 제공합니다.  
목표는 **정확하고 직관적인 정보 전달**, **반응형 환경에서의 일관성**, **TailwindCSS 토큰 기반 구현**입니다.

**Principles:**
- Mobile-First & Responsive Design
- Clear Visual Hierarchy
- Component Reusability
- Tailwind Tokens Consistency

---

## 2. Color Palette

Tailwind config 기준 색상 사용. Light/Dark 모드 지원.

| Purpose         | Light Mode Token        | Hex       | Dark Mode Token       | Hex       |
|-----------------|-----------------------|-----------|---------------------|-----------|
| Primary         | `light.primary`        | #5D5FEF   | `dark.primary`       | #4A4DD1   |
| Secondary       | `light.secondary`      | #EDF0FF   | `dark.secondary`     | #1B1F2A   |
| Background      | `light.background`     | #F9F9FF   | `dark.background`    | #121212   |
| Surface         | `light.surface`        | #FFFFFF   | `dark.surface`       | #1E1E1E   |
| Text Primary    | `light.textPrimary`    | #222222   | `dark.textPrimary`   | #E0E0E0   |
| Text Secondary  | `light.textSecondary`  | #666666   | `dark.textSecondary` | #AAAAAA   |
| Border          | `light.border`         | #E0E0E0   | `dark.border`        | #2C2C2C   |
| Success         | `light.success`        | #28A745   | `dark.success`       | #28A745   |
| Error           | `light.error`          | #DC3545   | `dark.error`         | #DC3545   |
| Warning         | `light.warning`        | #FFC107   | `dark.warning`       | #FFC107   |
| Info            | `light.info`           | #17A2B8   | `dark.info`          | #17A2B8   |

**Surface Hierarchy:**
- Base: `background`
- Section: `surface`
- Card: `surface-container-high`
- Floating overlays: `surface-container` + opacity (glassmorphism)

---

## 3. Typography

Tailwind fontSize + lineHeight + letterSpacing 사용.  

| Element          | Font Token        | Size      | Line Height | Letter Spacing |
|-----------------|-----------------|-----------|-------------|----------------|
| H1 (Hero)       | `h1`            | 2rem      | 2.5rem      | -0.5px         |
| H2              | `h2`            | 1.75rem   | 2.25rem     | -0.5px         |
| H3              | `h3`            | 1.5rem    | 2rem        | -0.25px        |
| Body Large      | `bodyLg`        | 1rem      | 1.5rem      | 0px            |
| Body Medium     | `bodyMd`        | 0.9375rem | 1.375rem    | 0px            |
| Body Small      | `bodySm`        | 0.875rem  | 1.25rem     | 0px            |
| Caption         | `caption`       | 0.75rem   | 1rem        | 0px            |
| Overline        | `overline`      | 0.625rem  | 0.75rem     | 1px            |

**Font Family:**  
`sans: ['Pretendard', 'Noto Sans KR', 'sans-serif']`

---

## 4. Spacing & Layout

Tailwind spacing tokens 활용. Mobile-First 기준.

| Token      | Value       |
|-----------|------------|
| xs        | 0.25rem (4px) |
| sm        | 0.5rem (8px)  |
| md        | 1rem (16px)   |
| lg        | 1.5rem (24px) |
| xl        | 2rem (32px)   |
| xxl       | 3rem (48px)   |
| xxxl      | 4rem (64px)   |
| huge      | 6rem (96px)   |

**Breakpoints:**
- `sm` → 640px
- `md` → 768px
- `lg` → 1024px
- `xl` → 1280px
- `2xl` → 1536px

> 모든 레이아웃은 Mobile First 작성, Flex/Grid 활용, 불필요한 px 하드코딩 금지

---

## 5. Border Radius & Shadows

| Token | Value            |
|-------|-----------------|
| sm    | 4px             |
| md    | 8px             |
| lg    | 12px            |

Box Shadows:

| Token | Value                          |
|-------|--------------------------------|
| xs    | 0 1px 2px rgba(0,0,0,0.05)     |
| sm    | 0 1px 3px rgba(0,0,0,0.1)      |
| md    | 0 4px 6px rgba(0,0,0,0.1)      |
| lg    | 0 10px 15px rgba(0,0,0,0.15)   |
| xl    | 0 20px 25px rgba(0,0,0,0.2)    |

---

## 6. Components

### Buttons
- Primary: `bg-primary` → gradient `primary → primary-container`  
- Rounded: `rounded-md`  
- Hover: subtle glow using shadow of same color

### Cards
- Divider lines 금지, spacing으로 구분
- Background: `surface-container` tokens
- Shadow: `md` 이상 사용 시 tonal lift

### Inputs
- Base: `surface-container-lowest`
- Focus: `border-l-2 border-secondary` (terminal-style indicator)
- Placeholder: `text-secondary`

### Chips / Tags
- Base: `surface-variant`
- Selected: `secondary-container` background + `on_secondary_container` text

---

## 7. Responsive Guidelines

- Mobile-First: `flex-col` → `md:flex-row`  
- Table: `overflow-x-auto` for small screens  
- Card / List: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`  
- Spacing/Font size: Tailwind `responsive` variants (`sm:`, `md:`, `lg:`) 활용

---

## 8. Do's & Don'ts

**Do:**
- Use asymmetrical layouts for premium look
- Emphasize whitespace (`xxl`, `xxxl`)  
- Always reference Tailwind tokens for color, spacing, font

**Don't:**
- Avoid 1px borders for layout separation  
- Avoid hardcoding colors outside Tailwind tokens  
- Do not mix multiple font families

---

## 9. Notes

- 모든 UI는 Tailwind 클래스 기준으로 작성  
- 컴포넌트 재사용과 반응형 고려 필수  
- Glassmorphism/Shadow 적용 시 theme tokens 사용  

---

## 10. Icons

- **Icon Library**: 모든 아이콘은 **Ant Design Icons (`@ant-design/icons`)** 사용.  
  - Custom SVG 허용: Ant Design에 없는 경우에만 사용  
- **Naming & Usage**:  
  - 의미 기반 네이밍 사용 (`ShoppingCartOutlined`, `UserAddOutlined`)  
  - 장식용 아이콘만 사용 시 `aria-hidden="true"`  
- **Size & Alignment**:  
  - 기본 사이즈: `1.25rem` (20px)  
  - 텍스트와 baseline 맞춤  
  - 주변 요소와 간격: `spacing-sm` (8px)  
- **Styling**:  
  - 색상은 Tailwind theme token 사용 (`textPrimary`, `textSecondary`, `primary`)  
  - Hover/focus 시 색상/opacity 변경만 가능, scale 금지  
- **Responsiveness**:  
  - 모바일 최소 사이즈 16px 유지  
  - 반응형 시 아이콘 비율 유지  

---

## 11. AI Code Generation & Execution Guidelines

- **Step-by-Step Execution**:  
  - 모든 AI 코드 생성은 **이슈 단위**로 진행  
  - 한 번에 전체 코드를 생성하지 않고, **PR 단위로 작업 완료 후 실행**  
- **Immediate Execution Prohibited**:  
  - 생성 즉시 실행 금지, 반드시 코드 리뷰 후 Merge 전까지 테스트 환경에서만 실행  
- **Branch & Versioning**:  
  - 각 이슈별 브랜치에서 작업 (`feature/5-dashboard-mvp` 등)  
  - PR 생성 후 코드 리뷰/테스트 통과 후 Merge  
- **Code Quality**:  
  - ESLint, Prettier, Unit/E2E Test 통과 필수  
  - Tailwind 토큰, 디자인 가이드, 반응형 규칙 준수  
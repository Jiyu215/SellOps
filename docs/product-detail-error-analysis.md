# 상품 상세 페이지 오류 분석 및 해결 방안

## 1. 증상

상품 목록 페이지(`/dashboard/products`)에서 **상품명/코드 텍스트** 또는 **수정 버튼**을 클릭하면  
`/dashboard/products/:id`로 이동하면서 다음과 같은 에러가 발생한다.

```
TypeError: fetch failed
  cause: Error: connect ECONNREFUSED 127.0.0.1:3000

또는

Error: Only absolute URLs are supported
```

---

## 2. 에러 발생 경로 (Call Stack)

```
/dashboard/products/[id]/page.tsx          ← Next.js Server Component (서버에서 실행)
  └─ getProductDetail(id)                   ← productDetailService.ts 호출
       └─ fetchProductDetail(id)            ← productDetail.api.ts 호출
            └─ fetch('/api/products/${id}') ← ❌ 상대경로 fetch → 서버에서 실패
```

---

## 3. 근본 원인 분석

### 3-1. 상대경로(Relative URL) fetch는 브라우저 전용이다

`fetch('/api/products/123')` 형태의 상대경로 호출은 **브라우저 환경**에서만 동작한다.  
브라우저는 현재 접속 중인 origin(`https://example.com`)을 기반으로 절대 URL을 자동 완성한다.

반면 **Node.js 서버 환경**에서는 origin이 존재하지 않기 때문에 상대경로 fetch가 실패한다.

| 환경 | `fetch('/api/products/123')` |
|------|-------------------------------|
| 브라우저 | ✅ `https://example.com/api/products/123`으로 자동 완성 |
| Node.js (서버) | ❌ origin이 없어 `ECONNREFUSED` 또는 `Only absolute URLs are supported` 발생 |

### 3-2. Next.js App Router의 Server Component는 서버에서 실행된다

`page.tsx`에 `'use client'` 선언이 없으면 **Server Component**이다.  
Server Component는 빌드 타임 또는 요청 타임에 **서버(Node.js)**에서 실행된다.

```tsx
// src/app/dashboard/products/[id]/page.tsx
// 'use client' 없음 → Server Component → 서버에서 실행
export default async function ProductDetailPage({ params }) {
  const product = await getProductDetail(id); // 서버에서 호출됨
  // ...
}
```

`getProductDetail` → `fetchProductDetail` → `fetch('/api/...')` 전체 체인이  
서버에서 실행되므로 상대경로 fetch가 실패한다.

### 3-3. 현재 코드의 구조적 문제: 혼용 서비스 레이어

`productDetailService.ts`는 **서버와 클라이언트 양쪽에서 import**되도록 설계되어 있다.  
함수별로 실행 가능한 환경이 다르다.

```
productDetailService.ts
├─ getProductDetail()    → fetch('/api/...') 사용 → 서버에서 실패 ❌
├─ checkProductCode()    → fetch('/api/...') 사용 → 클라이언트 전용
├─ createProduct()       → fetch('/api/...') 사용 → 클라이언트 전용
├─ updateProduct()       → fetch('/api/...') 사용 → 클라이언트 전용
├─ adjustStock()         → fetch('/api/...') 사용 → 클라이언트 전용
└─ getStockHistory()     → fetch('/api/...') 사용 → 클라이언트 전용
```

Server Component(`page.tsx`)가 이 파일에서 `getProductDetail`을 import하지만,  
내부적으로 클라이언트 전용 fetch를 사용하고 있어 서버에서 실패한다.

### 3-4. 임시 수정의 한계: supabaseAdmin을 서비스 레이어에 직접 삽입

이전 세션에서 `getProductDetail`을 `supabaseAdmin`으로 직접 교체했다.  
이는 동작하지만 **보안·아키텍처 문제**를 내포한다.

```ts
// productDetailService.ts — 현재 상태 (임시 수정)
import { supabaseAdmin } from '@/lib/supabase/admin'; // ← service_role key 포함

export async function getProductDetail(id: string) {
  // supabaseAdmin 직접 쿼리 (임시 해결)
}
```

`supabaseAdmin`은 `SUPABASE_SERVICE_ROLE_KEY`를 사용한다.  
이 키는 **RLS를 완전히 우회하는 관리자 키**로, 절대 클라이언트 번들에 포함되어서는 안 된다.

`productDetailService.ts`는 클라이언트 컴포넌트에서도 import될 수 있기 때문에,  
Next.js가 이 파일을 클라이언트 번들에 포함시킬 경우 service_role key가 노출될 위험이 있다.

---

## 4. 업계 표준 해결 방법: Data Access Layer (DAL) 패턴

### 배경

Next.js 공식 문서, Vercel, Shopify, Linear 등 Next.js App Router를 사용하는 기업들은  
**Data Access Layer(DAL)** 패턴을 권장한다.

> 참고: [Next.js 공식 문서 — Data Access Layer](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment)

핵심 원칙:

```
Server Component  →  DAL (server-only, DB 직접 접근)
Client Component  →  API Routes (HTTP fetch)
```

### 왜 이 패턴인가?

| 구분 | Server Component | Client Component |
|------|-----------------|-----------------|
| 데이터 접근 | DB 직접 접근 (DAL) | API Route 경유 (HTTP fetch) |
| 네트워크 왕복 | 없음 (같은 서버) | 있음 (HTTP 요청) |
| 보안 | DB 자격증명 서버에만 존재 | 클라이언트에 DB 자격증명 없음 |
| 성능 | 빠름 | 상대적으로 느림 |

---

## 5. 구체적인 해결 구현

### Step 1. `server-only` 패키지 설치

```bash
npm install server-only
```

이 패키지를 import하면 해당 모듈이 **클라이언트 번들에 포함될 경우 빌드 에러**가 발생한다.  
실수로 클라이언트에서 import하는 것을 컴파일 단계에서 차단한다.

### Step 2. DAL 파일 생성

`src/dal/products.ts` 파일을 새로 만든다.  
이 파일은 **서버 전용**이며 `supabaseAdmin`을 사용해 DB에 직접 접근한다.

```ts
// src/dal/products.ts
import 'server-only'; // ← 클라이언트 번들 포함 시 빌드 에러 발생

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ProductDetail } from '@/types/products';

/**
 * 상품 상세 조회 — 서버 전용 DAL
 * Server Component, generateMetadata, Server Action에서만 사용
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) return null;

  const [{ data: stock }, { data: images }] = await Promise.all([
    supabaseAdmin
      .from('stocks')
      .select('product_id, total, sold')
      .eq('product_id', id)
      .single(),
    supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('order', { ascending: true }),
  ]);

  const stockData = stock
    ? { total: stock.total, sold: stock.sold, available: stock.total - stock.sold }
    : { total: 0, sold: 0, available: 0 };

  return {
    id:               product.id,
    productCode:      product.product_code,
    name:             product.name,
    category:         '',
    price:            product.price,
    summary:          product.summary,
    shortDescription: product.short_description ?? '',
    description:      product.description,
    status:           product.status as 'active' | 'hidden' | 'sold_out',
    stock:            stockData,
    images: (images ?? []).map(img => ({
      id:        img.id,
      type:      img.type,
      url:       img.url,
      fileName:  img.url.split('/').pop() ?? '',
      fileSize:  Math.round((img.size_mb ?? 0) * 1024 * 1024),
      order:     img.order,
      createdAt: '',
    })),
    createdAt: product.created_at ?? '',
    updatedAt: product.updated_at ?? '',
    createdBy: '-',
  };
}

/**
 * 상품 목록 요약 통계 — 서버 전용
 */
export async function getProductSummary() {
  const { data } = await supabaseAdmin.from('products').select('status');
  return {
    total:    data?.length ?? 0,
    active:   data?.filter(p => p.status === 'active').length ?? 0,
    hidden:   data?.filter(p => p.status === 'hidden').length ?? 0,
    sold_out: data?.filter(p => p.status === 'sold_out').length ?? 0,
  };
}
```

### Step 3. Server Component에서 DAL 직접 사용

```tsx
// src/app/dashboard/products/[id]/page.tsx
import 'server-only'; // 명시적 서버 전용 선언 (선택사항이지만 권장)

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getProductById } from '@/dal/products'; // ← DAL에서 직접 import
import { ProductDetailContent } from './ProductDetailContent';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id); // ← DAL 직접 호출
  return {
    title: product ? `${product.name} | SellOps` : '상품 상세',
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id); // ← DAL 직접 호출

  if (!product) notFound();

  return (
    <DashboardLayout ...>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent product={product} />
      </Suspense>
    </DashboardLayout>
  );
}
```

### Step 4. productDetailService.ts 정리

`productDetailService.ts`에서 `supabaseAdmin` 의존성을 제거한다.  
이 파일은 **클라이언트 컴포넌트 전용** API 호출 서비스로 역할을 명확히 한다.

```ts
// src/services/productDetailService.ts
// 클라이언트 컴포넌트에서 사용하는 API 호출 서비스 (HTTP fetch 기반)
// server-only DAL이 필요하면 src/dal/products.ts를 사용할 것

import {
  checkProductCode as apiCheckProductCode,
  adjustStock as apiAdjustStock,
  fetchStockHistory,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
} from '@/features/products/api/productDetail.api';
// supabaseAdmin import 없음 — 클라이언트 번들 보안 유지
```

`getProductDetail` 함수는 `productDetailService.ts`에서 **제거**하고  
Server Component에서는 `dal/products.ts`의 `getProductById`를 직접 사용한다.

---

## 6. 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                              │
│                                                                 │
│  Server Component (page.tsx)                                    │
│       │                                                         │
│       ▼                                                         │
│  DAL (src/dal/products.ts)  ← import 'server-only'              │
│       │                          클라이언트 번들 포함 시 빌드 에러  │
│       ▼                                                         │
│  supabaseAdmin (service_role key)                               │
│       │                                                         │
│       ▼                                                         │
│  Supabase DB (PostgreSQL)                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                              │
│                                                                 │
│  Client Component (ProductDetailForm.tsx)                       │
│       │                                                         │
│       ▼                                                         │
│  productDetailService.ts (HTTP fetch)                           │
│       │                                                         │
│       ▼                                                         │
│  API Routes (src/app/api/products/...)                          │
│       │                                                         │
│       ▼                                                         │
│  supabaseAdmin (service_role key) — 서버 API Route 내에서만 사용  │
│       │                                                         │
│       ▼                                                         │
│  Supabase DB (PostgreSQL)                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 이 패턴을 사용하는 이유 요약

| 항목 | 현재 (임시 수정) | DAL 패턴 (표준) |
|------|----------------|----------------|
| 서버 상세 조회 | `supabaseAdmin`을 서비스 레이어에 직접 삽입 | DAL에 격리, `server-only`로 보호 |
| 보안 | service_role key가 클라이언트 번들에 포함될 수 있음 | 빌드 단계에서 차단 |
| 역할 분리 | 서비스 레이어가 서버/클라이언트 혼용 | DAL(서버) / API(클라이언트) 명확히 분리 |
| 성능 | - | 서버 조회 시 HTTP 왕복 없음 |
| 유지보수 | 맥락에 따라 다른 동작 → 혼란 | 파일만 봐도 실행 환경 명확 |

---

## 8. 참고 자료

- [Next.js 공식 문서: Server-only Code](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment)
- [Next.js 공식 문서: Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [Vercel: Next.js Security — Preventing Data Exposure](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

# SellOps
 
제품 판매 운영자를 위한 관리 대시보드


<br />

## 📌 프로젝트 소개
 
SellOps는 제품 판매 운영자가 상품·주문·재고를 한 곳에서 효율적으로 관리할 수 있는 **어드민 대시보드**입니다. 
Shopify Admin, 카페24 관리자 등 실제 커머스 운영 도구를 분석해 핵심 워크플로우를 구현했습니다.
 
<br />

## 🔗 링크
 
| 구분 | 링크 |
|------|------|
| 배포 | 준비 중 |
| 디자인 | 준비 중 |
 
<br />

## ⚙️ 기술 스택
 
| 구분 | 기술 |
|------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
 
<br />

## 📁 프로젝트 구조
 
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/          # 메인 대시보드
│   │   ├── products/           # 상품 목록
│   │   │   ├── new/            # 상품 등록
│   │   │   └── [id]/           # 상품 상세·수정
│   │   └── orders/             # 주문 관리
│   └── layout.tsx
├── components/
│   ├── common/                 # 공통 컴포넌트
│   └── products/               # 상품 관련 컴포넌트
├── types/                      # TypeScript 타입 정의
└── lib/                        # 유틸리티
```
 
<br />

## ✨ 주요 기능
 
### 대시보드
- 매출·주문·재고 현황 요약
- 최근 주문 내역
### 상품 관리
- 상품 목록 테이블 (검색 / 상태 필터 / 정렬)
- 상태 일괄 변경·삭제
- CSV Export
- 상품 등록·수정 폼
- 상품 코드 중복 확인
- 이미지 업로드 (대표·목록·추가 이미지 최대 20장)
- Rich Text 상세 설명 에디터
### 재고 관리
- 가용 재고 현황 확인 (입고 / 판매 / 가용)
- 입고·출고 수동 조정
- 재고 조정 이력
### 주문 관리
- 주문 목록 및 상태 관리

<br />

## 🗂️ 데이터 구조
 
```typescript
type Product = {
  id: string;
  name: string;
  price: number;
  productCode: string;
  summary: string;
  shortDescription: string;
  description: string;
  status: 'active' | 'hidden' | 'sold_out';
  createdAt: string;
  updatedAt: string;
};
 
type Stock = {
  productId: string;
  total: number;      // 전체 입고 수량
  sold: number;       // 판매 수량
  available: number;  // 가용 재고
};
 
type ProductImage = {
  id: string;
  productId: string;
  type: 'main' | 'list' | 'small' | 'thumbnail' | 'extra';
  url: string;
  width: number;
  height: number;
  sizeMB: number;
  format: 'jpg' | 'png' | 'gif';
  order: number;
};
```
 
<br />

## 🌿 브랜치 전략
 
GitHub Flow 기반으로 운영합니다.
 
```
feature/이슈번호-작업명
  └─→ main
```
 
| 브랜치 | 설명 |
|--------|------|
| `main` | 배포 가능한 안정 브랜치 |
| `feature/*` | 기능 개발 브랜치 |
| `chore/*` | 설정·환경 작업 브랜치 |
 
<br />

## 📋 커밋 컨벤션
 
```
feat:   새로운 기능 추가
fix:    버그 수정
chore:  설정, 환경 변경
style:  코드 포맷, 스타일 수정
refactor: 코드 리팩터링
docs:   문서 수정
```
 
<br />

## 🚀 시작하기
 
```bash
# 의존성 설치
npm install
 
# 개발 서버 실행
npm run dev
 
# 빌드
npm run build
```
 
<br />

## 📝 개발 기록
 
| 이슈 | 브랜치 | 내용 |
|------|--------|------|
| #1 | `chore/1-project-setup` | 프로젝트 초기 세팅 |
| #3 | `feature/3-theme-system` | 테마 시스템 구현 |
| #5 | `feature/5-dashboard-mvp` | 대시보드 MVP |
| #7 | `feature/7-order-management` | 주문 관리 페이지 |
| #10 | `feature10-product-list` | 상품 목록 페이지 |
| #11 | `feature/11-product-detail` | 상품 상세·등록 페이지 |

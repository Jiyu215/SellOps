# Supabase Migration 적용 상태

이 문서는 SellOps에서 코드 변경과 별도로 Supabase DB에 직접 적용되어야 하는 migration 상태를 정리한다.

## 대상 Migration

| 파일 | 목적 | 상태 |
| --- | --- | --- |
| `supabase/migrations/001_delete_products_function.sql` | 상품 삭제 시 연관 테이블을 함께 정리하는 `delete_products` RPC 함수 | 기존 작업 |
| `supabase/migrations/002_adjust_product_stock_function.sql` | 재고 입고/출고 조정을 atomic하게 처리하는 `adjust_product_stock` RPC 함수 | 적용 필요 |
| `supabase/migrations/003_backfill_missing_stocks.sql` | 기존 상품 중 누락된 `stocks` row를 `0, 0`으로 보정 | 적용 필요 |

## `adjust_product_stock` 적용 목적

기존 재고 조정 API는 서버 코드에서 `stocks` 조회, 재고 계산, `stocks` 업데이트, `stock_histories` insert를 순서대로 처리했다. 이 방식은 동시에 여러 재고 조정 요청이 들어오면 마지막 업데이트가 앞선 업데이트를 덮어쓸 수 있다.

`adjust_product_stock` 함수는 Supabase DB 내부에서 아래 작업을 하나의 트랜잭션으로 처리한다.

- `stocks` 행을 `FOR UPDATE`로 잠금
- 입고/출고 수량 검증
- `stocks.total` 갱신
- `stock_histories` 이력 기록
- 기존 상품에 `stocks` row가 없으면 `0, 0`으로 자동 생성

## 현재 코드 반영 상태

| 항목 | 상태 |
| --- | --- |
| 재고 조정 API가 `adjust_product_stock` RPC를 호출하도록 변경 | 완료 |
| Supabase 타입에 `adjust_product_stock` RPC 정의 추가 | 완료 |
| 재고 조정 API route 테스트 추가 | 완료 |
| `adjust_product_stock` 함수 SQL 파일 추가 | 완료 |
| 기존 상품 `stocks` row backfill SQL 파일 추가 | 완료 |
| 실제 Supabase DB에 함수 적용 | 환경별 확인 필요 |
| PostgREST schema cache reload | 환경별 확인 필요 |
| 기존 상품의 누락된 `stocks` row backfill | 환경별 확인 필요 |

## Supabase DB 적용 확인

Supabase SQL Editor에서 아래 SQL을 실행해 함수 존재 여부를 확인한다.

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'adjust_product_stock';
```

결과가 없으면 `supabase/migrations/002_adjust_product_stock_function.sql` 전체를 SQL Editor에서 실행해야 한다.

함수 적용 후 PostgREST가 RPC를 인식하도록 schema cache를 갱신한다.

```sql
NOTIFY pgrst, 'reload schema';
```

## 기존 상품 재고 Row 보정

상품은 존재하지만 `stocks` row가 없는 경우 재고 조정 API가 404를 반환할 수 있다. 전체 누락 상품을 한 번에 보정하려면 아래 SQL을 실행한다.

```sql
insert into stocks (product_id, total, sold)
select p.id, 0, 0
from products p
where not exists (
  select 1
  from stocks s
  where s.product_id = p.id
);
```

이 SQL은 `supabase/migrations/003_backfill_missing_stocks.sql`에도 정리되어 있다.

특정 상품만 확인할 때는 아래 SQL을 사용한다.

```sql
select *
from stocks
where product_id = '<product_id>';
```

## 적용 후 동작 확인

아래 SQL로 RPC가 정상 응답하는지 확인한다. `<product_id>`에는 실제 `products.id` 값을 넣는다.

```sql
select adjust_product_stock(
  '<product_id>',
  'in',
  1,
  'migration 적용 확인'
);
```

정상 응답 예시는 다음과 같다.

```json
{
  "product_id": "<product_id>",
  "total": 1,
  "sold": 0,
  "available": 1
}
```

## 운영 체크리스트

- Supabase DB에 `adjust_product_stock` 함수가 존재하는지 확인한다.
- `NOTIFY pgrst, 'reload schema';`를 실행한다.
- 기존 상품 중 `stocks` row가 누락된 상품을 backfill한다.
- 대시보드에서 기존 상품 상세로 진입한다.
- 입고 수량을 입력하고 `재고 조정 적용`을 누른다.
- `저장하기`를 누른 뒤 Network 탭에서 `/api/products/:id/stock/adjust`가 200으로 응답하는지 확인한다.
- 출고 수량이 가용 재고보다 큰 경우 400 응답과 안내 메시지가 나오는지 확인한다.

## 참고

`adjust_product_stock` 함수는 `SECURITY DEFINER`로 실행되므로 함수 정의에 `SET search_path = public`을 포함한다. 이는 함수 실행 시 의도하지 않은 schema의 객체를 참조하는 것을 막기 위한 보안 설정이다.

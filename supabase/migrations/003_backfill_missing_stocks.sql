-- ============================================================
-- 기존 상품의 누락된 stocks row 보정
--
-- products에는 존재하지만 stocks row가 없는 상품은 재고 조정 RPC에서
-- 재고 기준 행을 찾지 못해 실패할 수 있다.
--
-- 이 migration은 누락된 상품에 대해서만 total=0, sold=0의 stocks row를
-- 생성한다. 이미 stocks row가 있는 상품은 변경하지 않는다.
-- ============================================================

INSERT INTO stocks (product_id, total, sold)
SELECT p.id, 0, 0
FROM products p
WHERE NOT EXISTS (
  SELECT 1
  FROM stocks s
  WHERE s.product_id = p.id
);

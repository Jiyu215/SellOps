-- ============================================================
-- 수동 재고 조정 함수
-- stocks row lock + update + stock_histories insert를 하나의
-- 트랜잭션으로 처리하여 동시 요청에서 race condition 방지
--
-- type:
--   'in'  → 입고 (total += quantity)
--   'out' → 수동 차감 (total -= quantity, sold 불변)
--           판매(sold)는 주문 처리 흐름에서 별도 관리
--
-- 반환값 (json):
--   성공        → {product_id, total, sold, available}
--   상품 없음    → {error: 'product_not_found'}
--   재고 부족   → {error: 'insufficient_stock', available: N}
--   잘못된 요청 → {error: 'invalid_stock_adjustment'}
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_product_stock(
  p_product_id  uuid,
  p_type        text,
  p_quantity    integer,
  p_reason      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock     stocks%ROWTYPE;
  v_new_total integer;
  v_available integer;
BEGIN
  IF p_type NOT IN ('in', 'out') OR p_quantity <= 0 THEN
    RETURN json_build_object('error', 'invalid_stock_adjustment');
  END IF;

  -- stocks 행을 FOR UPDATE로 잠근다 (동시 요청 직렬화)
  SELECT * INTO v_stock
  FROM stocks
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM 1
    FROM products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
      RETURN json_build_object('error', 'product_not_found');
    END IF;

    INSERT INTO stocks (product_id, total, sold)
    VALUES (p_product_id, 0, 0)
    ON CONFLICT (product_id) DO NOTHING;

    SELECT * INTO v_stock
    FROM stocks
    WHERE product_id = p_product_id
    FOR UPDATE;
  END IF;

  v_available := v_stock.total - v_stock.sold;

  -- 출고 요청이 가용 재고를 초과하면 즉시 반환
  IF p_type = 'out' AND p_quantity > v_available THEN
    RETURN json_build_object(
      'error',     'insufficient_stock',
      'available', v_available
    );
  END IF;

  -- total 갱신: 입고 증가, 출고 감소
  v_new_total := CASE p_type
    WHEN 'in'  THEN v_stock.total + p_quantity
    WHEN 'out' THEN v_stock.total - p_quantity
    ELSE v_stock.total
  END;

  UPDATE stocks
  SET total = v_new_total
  WHERE product_id = p_product_id;

  -- 재고 이력 기록 (같은 트랜잭션)
  INSERT INTO stock_histories (product_id, type, quantity, reason)
  VALUES (p_product_id, p_type, p_quantity, p_reason);

  RETURN json_build_object(
    'product_id', p_product_id,
    'total',      v_new_total,
    'sold',       v_stock.sold,
    'available',  v_new_total - v_stock.sold
  );
END;
$$;

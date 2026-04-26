-- ============================================================
-- 상품 삭제 함수 (REPLICA IDENTITY FULL 설정 후 버전)
-- stock_histories에 REPLICA IDENTITY FULL을 적용한 뒤에는
-- session_replication_role 트릭 없이 직접 DELETE 가능
-- ============================================================

ALTER TABLE stock_histories REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION delete_products(product_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM stock_histories WHERE product_id = ANY(product_ids);
  DELETE FROM product_images  WHERE product_id = ANY(product_ids);
  DELETE FROM stocks           WHERE product_id = ANY(product_ids);
  DELETE FROM products         WHERE id         = ANY(product_ids);
END;
$$;

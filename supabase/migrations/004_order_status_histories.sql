-- ============================================================
-- 주문 상태 변경 이력
--
-- orders에는 현재 상태만 저장하고, order_status_histories에는
-- 누가/언제/어떤 상태 필드를 변경했는지 append-only로 기록한다.
--
-- update_order_status_with_history RPC는 orders row lock + update +
-- history insert를 하나의 트랜잭션으로 처리한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS order_status_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status_type text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_type text NOT NULL DEFAULT 'admin',
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_status_histories_status_type_check
    CHECK (status_type IN ('order_status', 'payment_status', 'shipping_status')),
  CONSTRAINT order_status_histories_actor_type_check
    CHECK (actor_type IN ('admin', 'system', 'customer'))
);

CREATE INDEX IF NOT EXISTS order_status_histories_order_id_created_at_idx
  ON order_status_histories (order_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_order_status_with_history(
  p_order_id uuid,
  p_order_status text DEFAULT NULL,
  p_payment_status text DEFAULT NULL,
  p_shipping_status text DEFAULT NULL,
  p_actor_type text DEFAULT 'admin',
  p_actor_name text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_updated orders%ROWTYPE;
  v_updated_at timestamptz := now();
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE orders
  SET
    order_status = COALESCE(p_order_status, order_status),
    payment_status = COALESCE(p_payment_status, payment_status),
    shipping_status = COALESCE(p_shipping_status, shipping_status),
    updated_at = v_updated_at
  WHERE id = p_order_id
  RETURNING * INTO v_updated;

  IF p_order_status IS NOT NULL AND p_order_status IS DISTINCT FROM v_order.order_status THEN
    INSERT INTO order_status_histories (
      order_id, status_type, from_status, to_status, actor_type, actor_name, reason, created_at
    )
    VALUES (
      p_order_id, 'order_status', v_order.order_status, p_order_status,
      p_actor_type, p_actor_name, p_reason, v_updated_at
    );
  END IF;

  IF p_payment_status IS NOT NULL AND p_payment_status IS DISTINCT FROM v_order.payment_status THEN
    INSERT INTO order_status_histories (
      order_id, status_type, from_status, to_status, actor_type, actor_name, reason, created_at
    )
    VALUES (
      p_order_id, 'payment_status', v_order.payment_status, p_payment_status,
      p_actor_type, p_actor_name, p_reason, v_updated_at
    );
  END IF;

  IF p_shipping_status IS NOT NULL AND p_shipping_status IS DISTINCT FROM v_order.shipping_status THEN
    INSERT INTO order_status_histories (
      order_id, status_type, from_status, to_status, actor_type, actor_name, reason, created_at
    )
    VALUES (
      p_order_id, 'shipping_status', v_order.shipping_status, p_shipping_status,
      p_actor_type, p_actor_name, p_reason, v_updated_at
    );
  END IF;

  RETURN v_updated;
END;
$$;

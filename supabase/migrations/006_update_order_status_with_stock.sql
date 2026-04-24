-- ============================================================
-- Order status update + stock sync RPC
--
-- Rules:
--   - shipping_in_progress: reserve stock
--     sold += quantity, total unchanged
--   - shipping_completed / order_completed: finalize stock
--     if shipping was already in progress, total -= quantity and sold -= quantity
--     otherwise, total -= quantity only
--   - return_completed / refund_completed: restock
--     if shipping was still in progress, sold -= quantity
--     otherwise, total += quantity
--   - stock is changed only when the incoming request actually
--     changes one of those status fields
-- ============================================================

CREATE OR REPLACE FUNCTION update_order_status_with_stock(
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
  v_next_order_status text;
  v_next_payment_status text;
  v_next_shipping_status text;
  v_next_stock_status text;
  v_action text := 'none';
  v_stock stocks%ROWTYPE;
  v_item record;
  v_available integer;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_next_order_status := COALESCE(p_order_status, v_order.order_status);
  v_next_payment_status := COALESCE(p_payment_status, v_order.payment_status);
  v_next_shipping_status := COALESCE(p_shipping_status, v_order.shipping_status);
  v_next_stock_status := v_order.stock_status;

  IF
    v_order.stock_status = 'none' AND
    p_shipping_status IS NOT NULL AND
    p_shipping_status = 'shipping_in_progress'
  THEN
    v_action := 'reserve';
    v_next_stock_status := 'applied';
  ELSIF
    (
      v_order.stock_status = 'none' OR
      (v_order.stock_status = 'applied' AND v_order.shipping_status = 'shipping_in_progress')
    ) AND
    (
      (p_shipping_status IS NOT NULL AND p_shipping_status = 'shipping_completed') OR
      (p_order_status IS NOT NULL AND p_order_status = 'order_completed')
    )
  THEN
    v_action := 'finalize';
    v_next_stock_status := 'applied';
  ELSIF
    v_order.stock_status = 'applied' AND
    (
      (p_shipping_status IS NOT NULL AND p_shipping_status = 'return_completed') OR
      (p_payment_status IS NOT NULL AND p_payment_status = 'refund_completed')
    )
  THEN
    v_action := 'restock';
    v_next_stock_status := 'released';
  END IF;

  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS quantity
    FROM order_items
    WHERE order_id = p_order_id
    GROUP BY product_id
  LOOP
    SELECT * INTO v_stock
    FROM stocks
    WHERE product_id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock_not_found' USING ERRCODE = 'P0001';
    END IF;

    v_available := v_stock.total - v_stock.sold;

    IF v_action = 'reserve' THEN
      IF v_available < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_available USING ERRCODE = 'P0001';
      END IF;

      UPDATE stocks
      SET sold = sold + v_item.quantity
      WHERE product_id = v_item.product_id;

      INSERT INTO stock_histories (product_id, type, quantity, reason)
      VALUES (v_item.product_id, 'out', v_item.quantity, '주문 예약: ' || p_order_id::text);
    ELSIF v_action = 'finalize' THEN
      IF v_stock.total < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_stock.total USING ERRCODE = 'P0001';
      END IF;

      IF v_order.stock_status = 'applied' AND v_order.shipping_status = 'shipping_in_progress' THEN
        UPDATE stocks
        SET
          total = total - v_item.quantity,
          sold = GREATEST(sold - v_item.quantity, 0)
        WHERE product_id = v_item.product_id;
      ELSE
        UPDATE stocks
        SET total = total - v_item.quantity
        WHERE product_id = v_item.product_id;
      END IF;

      INSERT INTO stock_histories (product_id, type, quantity, reason)
      VALUES (v_item.product_id, 'out', v_item.quantity, '주문 출고: ' || p_order_id::text);
    ELSIF v_action = 'restock' THEN
      IF v_order.stock_status = 'applied' AND v_order.shipping_status = 'shipping_in_progress' THEN
        UPDATE stocks
        SET sold = GREATEST(sold - v_item.quantity, 0)
        WHERE product_id = v_item.product_id;
      ELSE
        UPDATE stocks
        SET total = total + v_item.quantity
        WHERE product_id = v_item.product_id;
      END IF;

      INSERT INTO stock_histories (product_id, type, quantity, reason)
      VALUES (v_item.product_id, 'in', v_item.quantity, '주문 반품 완료: ' || p_order_id::text);
    END IF;
  END LOOP;

  UPDATE orders
  SET
    order_status = v_next_order_status,
    payment_status = v_next_payment_status,
    shipping_status = v_next_shipping_status,
    stock_status = v_next_stock_status,
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

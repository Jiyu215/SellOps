-- ============================================================
-- 주문 메모 로그
--
-- orders.memo는 기존 단일 메모 호환용으로 유지하고,
-- order_memos에는 운영자/CS/고객 메모를 append-only로 누적 기록한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS order_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'admin',
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_memos_author_type_check
    CHECK (author_type IN ('admin', 'cs', 'customer')),
  CONSTRAINT order_memos_content_check
    CHECK (length(trim(content)) > 0 AND length(content) <= 1000)
);

CREATE INDEX IF NOT EXISTS order_memos_order_id_created_at_idx
  ON order_memos (order_id, created_at DESC);

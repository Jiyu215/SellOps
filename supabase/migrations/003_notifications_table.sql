-- ============================================================
-- 알림 시스템 테이블
-- type: 'order' | 'inventory' | 'product' | 'system'
-- level: 'critical' | 'warning' | 'info'
-- 보관 기간: 최근 50건 유지, 30일 이후 자동 삭제 (pg_cron 옵션)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL CHECK (type IN ('order', 'inventory', 'product', 'system')),
  level      text        NOT NULL CHECK (level IN ('critical', 'warning', 'info')),
  title      text        NOT NULL,
  message    text        NOT NULL,
  link       text,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS notifications_is_read_created_at_idx
  ON public.notifications (is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_type_level_idx
  ON public.notifications (type, level);

-- RLS: authenticated 사용자만 접근
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can view notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated users can update notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (true);

-- Service role (관리자)은 RLS 우회로 insert 가능
-- (Supabase admin client 사용 시 자동 우회)

-- Supabase Realtime 활성화 (브라우저에서 INSERT/UPDATE 즉시 수신)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 30일 이후 자동 삭제 (pg_cron 설치 시 활성화)
-- SELECT cron.schedule(
--   'delete-old-notifications',
--   '0 0 * * *',
--   $$DELETE FROM public.notifications WHERE created_at < now() - INTERVAL '30 days'$$
-- );

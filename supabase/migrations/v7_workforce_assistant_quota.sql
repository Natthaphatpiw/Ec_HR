-- EC AIHR - Migration v7: shared Workforce Assistant request quotas
-- Provides an atomic quota across Vercel instances and regions. Safe to rerun.

CREATE TABLE IF NOT EXISTS workforce_assistant_rate_buckets (
  scope_key TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  window_seconds INTEGER NOT NULL CHECK (window_seconds BETWEEN 10 AND 86400),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope_key, bucket_start, window_seconds)
);

ALTER TABLE workforce_assistant_rate_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_workforce_assistant_quota(
  p_scope_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at_seconds BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF p_scope_key IS NULL OR LENGTH(p_scope_key) < 3 OR LENGTH(p_scope_key) > 240 THEN
    RAISE EXCEPTION 'Invalid quota scope';
  END IF;
  IF p_limit < 1 OR p_limit > 100000 OR p_window_seconds < 10 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid quota policy';
  END IF;

  v_bucket_start := TO_TIMESTAMP(
    FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO workforce_assistant_rate_buckets (
    scope_key,
    bucket_start,
    window_seconds,
    request_count,
    updated_at
  )
  VALUES (p_scope_key, v_bucket_start, p_window_seconds, 1, NOW())
  ON CONFLICT (scope_key, bucket_start, window_seconds)
  DO UPDATE SET
    request_count = workforce_assistant_rate_buckets.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO v_count;

  allowed := v_count <= p_limit;
  remaining := GREATEST(0, p_limit - v_count);
  reset_at_seconds := FLOOR(EXTRACT(EPOCH FROM (
    v_bucket_start + make_interval(secs => p_window_seconds)
  )))::BIGINT;

  -- Opportunistic cleanup keeps the table bounded without requiring a cron.
  IF MOD(hashtext(p_scope_key), 100) = 0 THEN
    DELETE FROM workforce_assistant_rate_buckets
    WHERE bucket_start < NOW() - INTERVAL '8 days';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON TABLE workforce_assistant_rate_buckets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION consume_workforce_assistant_quota(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_workforce_assistant_quota(TEXT, INTEGER, INTEGER)
  TO service_role;

COMMENT ON TABLE workforce_assistant_rate_buckets IS
  'Atomic request quota buckets for the Workforce Assistant; contains no HR content.';

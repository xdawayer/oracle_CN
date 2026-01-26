-- free_usage 更新：支持用户维度与 Synthetica 日额度

ALTER TABLE free_usage
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE free_usage
  ALTER COLUMN device_fingerprint DROP NOT NULL;

ALTER TABLE free_usage
  ADD COLUMN IF NOT EXISTS synthetica_used INTEGER DEFAULT 0;

ALTER TABLE free_usage
  ADD COLUMN IF NOT EXISTS synthetica_reset_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'free_usage_user_id_unique'
  ) THEN
    ALTER TABLE free_usage
      ADD CONSTRAINT free_usage_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_free_usage_user ON free_usage(user_id);

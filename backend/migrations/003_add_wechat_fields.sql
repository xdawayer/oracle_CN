-- Add WeChat fields to users

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(255) UNIQUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(255);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wechat_session_key VARCHAR(255);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_provider_check;

ALTER TABLE users
  ADD CONSTRAINT users_provider_check CHECK (provider IN ('google', 'apple', 'email', 'wechat'));

CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);

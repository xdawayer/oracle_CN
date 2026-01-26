-- 付费与订阅系统数据库迁移
-- 执行方式: 在 Supabase SQL 编辑器中运行此脚本

-- =====================================================
-- 1. 更新 users 表 - 添加试用期字段
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 为现有用户设置 trial_ends_at = NULL（无试用期）
-- 新用户注册时将设置 trial_ends_at = NOW() + 7 days

-- =====================================================
-- 2. 创建 purchase_records 表（替代原 purchases 表的增强版）
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 功能类型和 ID
  feature_type VARCHAR(100) NOT NULL,   -- 'dimension_talents', 'daily_script', 'synastry', 'ask', 'cbt_stats' 等
  feature_id VARCHAR(255),              -- 具体 ID（维度名、合盘哈希、日期等）

  -- 购买范围
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('permanent', 'daily', 'per_synastry', 'per_month', 'consumable')),

  -- 支付信息
  price_cents INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),

  -- 有效期和使用情况
  valid_until TIMESTAMPTZ,              -- 有效期截止时间
  quantity INTEGER DEFAULT 1,           -- 消耗型总数量
  consumed INTEGER DEFAULT 0,           -- 已消耗数量

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_purchase_records_user_feature
ON purchase_records(user_id, feature_type, feature_id);

CREATE INDEX IF NOT EXISTS idx_purchase_records_user_scope
ON purchase_records(user_id, scope);

-- =====================================================
-- 3. 创建 synastry_records 表
-- =====================================================
CREATE TABLE IF NOT EXISTS synastry_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 唯一性哈希
  synastry_hash VARCHAR(64) NOT NULL,

  -- 双方信息（JSON 格式存储）
  person_a_info JSONB NOT NULL,
  person_b_info JSONB NOT NULL,
  relationship_type VARCHAR(50),

  -- 是否使用免费次数
  is_free BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 每个用户的每个哈希唯一
  UNIQUE(user_id, synastry_hash)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_synastry_records_hash
ON synastry_records(synastry_hash);

CREATE INDEX IF NOT EXISTS idx_synastry_records_user
ON synastry_records(user_id);

-- =====================================================
-- 4. 更新 free_usage 表 - 添加 Ask 重置时间和合盘永久计数
-- =====================================================
ALTER TABLE free_usage ADD COLUMN IF NOT EXISTS ask_reset_at TIMESTAMPTZ;
ALTER TABLE free_usage ADD COLUMN IF NOT EXISTS synastry_total_used INTEGER DEFAULT 0;

-- 将现有 synastry_used 重命名为周使用量概念（如果需要）
-- 新增 synastry_total_used 用于永久免费 3 次的计数

-- =====================================================
-- 5. 创建 subscription_usage 表 - 订阅权益使用追踪
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 周起始日期（每周一 00:00 UTC）
  week_start DATE NOT NULL,

  -- 本周订阅权益使用量
  ask_used INTEGER DEFAULT 0,           -- 本周 Ask 权益使用
  synastry_used INTEGER DEFAULT 0,      -- 本周合盘权益使用

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, week_start)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_week
ON subscription_usage(user_id, week_start);

-- =====================================================
-- 6. 更新 subscriptions 表 - 确保有必要字段
-- =====================================================
-- 确保 usage 字段有默认值
ALTER TABLE subscriptions
ALTER COLUMN usage SET DEFAULT '{"synastryReads": 0, "monthlyReportClaimed": false}'::jsonb;

-- =====================================================
-- 7. 创建辅助函数
-- =====================================================

-- 获取当前周起始日期（周一 00:00 UTC）
CREATE OR REPLACE FUNCTION get_week_start(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE AS $$
BEGIN
  RETURN DATE_TRUNC('week', ts)::DATE;
END;
$$ LANGUAGE plpgsql;

-- 检查是否是同一天（UTC）
CREATE OR REPLACE FUNCTION is_same_day(ts1 TIMESTAMPTZ, ts2 TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN DATE_TRUNC('day', ts1 AT TIME ZONE 'UTC') = DATE_TRUNC('day', ts2 AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql;

-- 检查是否是同一月
CREATE OR REPLACE FUNCTION is_same_month(ts1 TIMESTAMPTZ, ts2 TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN DATE_TRUNC('month', ts1 AT TIME ZONE 'UTC') = DATE_TRUNC('month', ts2 AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. RLS 策略（Row Level Security）
-- =====================================================

-- purchase_records RLS
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase records" ON purchase_records
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all purchase records" ON purchase_records
  FOR ALL USING (auth.role() = 'service_role');

-- synastry_records RLS
ALTER TABLE synastry_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own synastry records" ON synastry_records
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all synastry records" ON synastry_records
  FOR ALL USING (auth.role() = 'service_role');

-- subscription_usage RLS
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription usage" ON subscription_usage
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all subscription usage" ON subscription_usage
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 9. 注释
-- =====================================================

COMMENT ON TABLE purchase_records IS '购买记录表 - 记录所有单次购买，支持多种有效期类型';
COMMENT ON TABLE synastry_records IS '合盘记录表 - 用于唯一性校验和防刷机制';
COMMENT ON TABLE subscription_usage IS '订阅权益使用表 - 追踪每周订阅权益使用量';

COMMENT ON COLUMN purchase_records.scope IS '购买范围: permanent(永久), daily(每日), per_synastry(按合盘), per_month(按月), consumable(消耗型)';
COMMENT ON COLUMN synastry_records.synastry_hash IS 'SHA256 哈希值，基于双方完整信息生成';
COMMENT ON COLUMN users.trial_ends_at IS '试用期结束时间，首次注册赠送 7 天';

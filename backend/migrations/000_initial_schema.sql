-- AstrologyWiki 初始数据库架构
-- 执行方式: 在 Supabase SQL 编辑器中运行此脚本

-- =====================================================
-- 1. 创建 users 表
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,

  -- 认证提供商
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'apple', 'email')),
  provider_id VARCHAR(255),
  password_hash TEXT,

  -- 出生档案（JSON 格式）
  birth_profile JSONB,

  -- 用户偏好设置
  preferences JSONB DEFAULT '{"theme": "dark", "language": "zh"}'::jsonb,

  -- 邮箱验证
  email_verified BOOLEAN DEFAULT FALSE,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- =====================================================
-- 2. 创建 subscriptions 表
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe 相关
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- 订阅计划
  plan VARCHAR(20) CHECK (plan IN ('monthly', 'yearly')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),

  -- 订阅周期
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- 使用情况
  usage JSONB DEFAULT '{"synastryReads": 0, "monthlyReportClaimed": false}'::jsonb,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- =====================================================
-- 3. 创建 free_usage 表（免费用户使用追踪）
-- =====================================================
CREATE TABLE IF NOT EXISTS free_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),

  -- Ask 功能使用
  ask_used INTEGER DEFAULT 0,

  -- Detail 功能使用
  detail_used INTEGER DEFAULT 0,

  -- 合盘功能使用
  synastry_used INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_free_usage_fingerprint ON free_usage(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_free_usage_ip ON free_usage(ip_address);

-- =====================================================
-- 4. 创建 purchases 表（购买记录）
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe 相关
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),

  -- 产品信息
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('ask', 'detail_pack', 'synastry', 'cbt_analysis', 'report')),
  product_id VARCHAR(255),

  -- 金额
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'CNY',

  -- 状态
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- 使用情况（消耗型产品）
  quantity INTEGER DEFAULT 1,
  consumed INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe ON purchases(stripe_payment_intent_id);

-- =====================================================
-- 5. 创建 reports 表（报告）
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 报告类型
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),

  -- 报告内容
  content JSONB,
  pdf_url TEXT,

  -- 出生档案
  birth_profile JSONB,
  partner_profile JSONB,

  -- 时间戳
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);

-- =====================================================
-- 6. 启用行级安全（RLS）
-- =====================================================

-- Users 表 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Subscriptions 表 RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Purchases 表 RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all purchases" ON purchases
  FOR ALL USING (auth.role() = 'service_role');

-- Reports 表 RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all reports" ON reports
  FOR ALL USING (auth.role() = 'service_role');

-- Free Usage 表 RLS（公开读取，service role 管理）
ALTER TABLE free_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view free usage" ON free_usage
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage free usage" ON free_usage
  FOR ALL USING (auth.role() = 'service_role');

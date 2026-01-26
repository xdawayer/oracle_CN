-- AstrologyWiki Payment & Subscription Schema
-- Run this in Supabase SQL Editor or local PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'apple', 'email', 'wechat')),
  provider_id VARCHAR(255),
  password_hash VARCHAR(255),

  -- WeChat fields
  wechat_openid VARCHAR(255) UNIQUE,
  wechat_unionid VARCHAR(255),
  wechat_session_key VARCHAR(255),

  -- Birth profile (migrated from localStorage)
  birth_profile JSONB,

  -- Preferences
  preferences JSONB DEFAULT '{"theme": "dark", "language": "en"}'::jsonb,

  -- Metadata
  email_verified BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe info
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- Plan details
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Monthly usage tracking (reset each period)
  usage JSONB DEFAULT '{"synastryReads": 0, "monthlyReportClaimed": false}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Purchases Table (one-time purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe info
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),

  -- Product info
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('ask', 'detail_pack', 'synastry', 'cbt_analysis', 'report')),
  product_id VARCHAR(100),  -- For reports: report type ID

  -- Payment details
  amount INTEGER NOT NULL,  -- In cents
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- For consumable products
  quantity INTEGER DEFAULT 1,
  consumed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Report type: annual, monthly, career, wealth, love, saturn_return, transit_3m, transit_6m, transit_12m
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),

  -- Report content
  content JSONB,
  pdf_url TEXT,

  -- Snapshot of birth info at generation time
  birth_profile JSONB,

  -- For synastry reports
  partner_profile JSONB,

  -- Generation metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Free Usage Tracking (for non-logged-in users)
-- ============================================
CREATE TABLE IF NOT EXISTS free_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) UNIQUE,
  ip_address INET,

  -- Usage counts
  ask_used INTEGER DEFAULT 0,
  ask_reset_at TIMESTAMPTZ,
  synthetica_used INTEGER DEFAULT 0,
  synthetica_reset_at TIMESTAMPTZ,
  detail_used INTEGER DEFAULT 0,
  synastry_used INTEGER DEFAULT 0,
  synastry_total_used INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================
-- Purchase Records Table (feature-level purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  feature_type VARCHAR(50) NOT NULL, -- e.g. dimension_talents, daily_script, cbt_stats
  feature_id VARCHAR(255),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('permanent', 'daily', 'per_synastry', 'per_month', 'consumable')),
  price_cents INTEGER NOT NULL DEFAULT 0,

  -- Stripe info
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),

  valid_until TIMESTAMPTZ,
  quantity INTEGER DEFAULT 1,
  consumed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Synastry Records Table (hash tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS synastry_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  synastry_hash VARCHAR(128) NOT NULL,
  person_a_info JSONB NOT NULL,
  person_b_info JSONB NOT NULL,
  relationship_type VARCHAR(50),
  is_free BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, synastry_hash)
);

-- ============================================
-- Subscription Usage Table (weekly counters)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  ask_used INTEGER DEFAULT 0,
  synastry_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

-- ============================================
-- Email Verification Tokens
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Refresh Tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchase_records_user_id ON purchase_records(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_records_feature ON purchase_records(feature_type, feature_id);
CREATE INDEX IF NOT EXISTS idx_synastry_records_user_hash ON synastry_records(user_id, synastry_hash);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_week ON subscription_usage(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_free_usage_fingerprint ON free_usage(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_free_usage_user ON free_usage(user_id);

-- ============================================
-- Updated_at Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_free_usage_updated_at ON free_usage;
CREATE TRIGGER update_free_usage_updated_at
    BEFORE UPDATE ON free_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_usage_updated_at ON subscription_usage;
CREATE TRIGGER update_subscription_usage_updated_at
    BEFORE UPDATE ON subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) for Supabase
-- ============================================
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE synastry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be configured based on your Supabase auth setup
-- For now, allow service role full access (backend uses service_role key)

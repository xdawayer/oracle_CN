-- Oracle CN MySQL Schema
-- 兼容 MySQL 5.7+（微信云托管默认版本）
-- 应用层使用 uuid 包生成 UUID

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,
  provider VARCHAR(20) NOT NULL,
  provider_id VARCHAR(255),
  password_hash VARCHAR(255),

  -- WeChat fields
  wechat_openid VARCHAR(255) UNIQUE,
  wechat_unionid VARCHAR(255),
  wechat_session_key VARCHAR(255),

  -- Birth profile
  birth_profile JSON,

  -- Preferences (MySQL 5.7 不支持 JSON_OBJECT 作为默认值)
  preferences JSON,

  -- Metadata
  email_verified BOOLEAN DEFAULT FALSE,
  trial_ends_at DATETIME(3),
  deleted_at DATETIME(3),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  -- Stripe info
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- Plan details
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,

  -- Billing period
  current_period_start DATETIME(3),
  current_period_end DATETIME(3),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Usage tracking (MySQL 5.7 不支持表达式默认值)
  `usage` JSON,

  -- Payment channel
  payment_channel VARCHAR(20) DEFAULT NULL,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Purchases Table (one-time purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  -- Stripe info
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),

  -- Product info
  product_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(100),

  -- Payment details
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(20) NOT NULL,

  -- For consumable products
  quantity INTEGER DEFAULT 1,
  consumed INTEGER DEFAULT 0,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),

  content JSON,
  pdf_url TEXT,

  birth_profile JSON,
  partner_profile JSON,

  generated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Free Usage Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS free_usage (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  device_fingerprint VARCHAR(255) UNIQUE,
  ip_address VARCHAR(45),

  -- Usage counts
  ask_used INTEGER DEFAULT 0,
  ask_reset_at DATETIME(3),
  synthetica_used INTEGER DEFAULT 0,
  synthetica_reset_at DATETIME(3),
  detail_used INTEGER DEFAULT 0,
  synastry_used INTEGER DEFAULT 0,
  synastry_total_used INTEGER DEFAULT 0,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY uk_free_usage_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Purchase Records Table (feature-level purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_records (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  feature_type VARCHAR(50) NOT NULL,
  feature_id VARCHAR(255),
  scope VARCHAR(20) NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,

  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),

  valid_until DATETIME(3),
  quantity INTEGER DEFAULT 1,
  consumed INTEGER DEFAULT 0,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Synastry Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS synastry_records (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  synastry_hash VARCHAR(128) NOT NULL,
  person_a_info JSON NOT NULL,
  person_b_info JSON NOT NULL,
  relationship_type VARCHAR(50),
  is_free BOOLEAN DEFAULT FALSE,

  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE KEY uk_synastry_user_hash (user_id, synastry_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Subscription Usage Table (weekly counters)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  week_start DATE NOT NULL,
  ask_used INTEGER DEFAULT 0,
  synastry_used INTEGER DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY uk_sub_usage_user_week (user_id, week_start),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Email Verification Tokens
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Refresh Tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- WeChat Pay Orders
-- ============================================
CREATE TABLE IF NOT EXISTS wxpay_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) UNIQUE NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  plan VARCHAR(20),
  points_amount INTEGER,
  total_fee INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(64),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  paid_at DATETIME(3),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Indexes（MySQL 5.7 不支持 CREATE INDEX IF NOT EXISTS）
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_users_wechat_openid ON users(wechat_openid);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchase_records_user_id ON purchase_records(user_id);
CREATE INDEX idx_purchase_records_feature ON purchase_records(feature_type, feature_id);
CREATE INDEX idx_synastry_records_user_hash ON synastry_records(user_id, synastry_hash);
CREATE INDEX idx_subscription_usage_user_week ON subscription_usage(user_id, week_start);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_free_usage_fingerprint ON free_usage(device_fingerprint);
CREATE INDEX idx_free_usage_user ON free_usage(user_id);
CREATE INDEX idx_wxpay_orders_user ON wxpay_orders(user_id);
CREATE INDEX idx_wxpay_orders_status ON wxpay_orders(status);

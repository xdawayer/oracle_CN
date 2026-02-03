-- 微信支付订单表 & 订阅 plan 扩展
-- 用于持久化微信支付订单，避免内存丢失

-- 1. 微信支付订单表
CREATE TABLE IF NOT EXISTS wxpay_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('subscription', 'points')),
  plan VARCHAR(20),
  points_amount INTEGER,
  total_fee INTEGER NOT NULL,  -- 单位：分
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wxpay_orders_user_id ON wxpay_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wxpay_orders_order_id ON wxpay_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_wxpay_orders_status ON wxpay_orders(status);

-- 2. 扩展 subscriptions.plan 约束以支持 quarterly
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('monthly', 'quarterly', 'yearly'));

-- 3. 为 subscriptions 添加 payment_channel 字段（区分 Stripe / WeChat）
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20) DEFAULT 'stripe';

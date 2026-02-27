// 数据库自动初始化：启动时自动创建库、表、索引
// 所有语句均为幂等操作，可重复执行
import mysql from 'mysql2/promise';

export async function initDatabase(): Promise<void> {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'oracle_cn';

  console.log(`[db-init] 连接 MySQL ${host}:${port} ...`);

  // ============================================
  // Step 1: 无库连接，创建数据库
  // ============================================
  const conn = await mysql.createConnection({ host, port, user, password });
  await conn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`[db-init] 数据库 "${database}" 已就绪`);
  await conn.end();

  // ============================================
  // Step 2: 连接到目标库，逐条建表
  // ============================================
  const db = await mysql.createConnection({ host, port, user, password, database });

  for (const sql of TABLE_STATEMENTS) {
    await db.execute(sql);
  }
  console.log(`[db-init] ${TABLE_STATEMENTS.length} 张表已就绪`);

  // ============================================
  // Step 3: 创建索引（忽略已存在错误 1061）
  // ============================================
  let indexCreated = 0;
  for (const sql of INDEX_STATEMENTS) {
    try {
      await db.execute(sql);
      indexCreated++;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errno' in err && (err as { errno: number }).errno === 1061) {
        continue; // Duplicate key name — 索引已存在，跳过
      }
      throw err;
    }
  }
  console.log(`[db-init] 索引就绪（本次新建 ${indexCreated}/${INDEX_STATEMENTS.length}）`);

  await db.end();
  console.log('[db-init] 数据库初始化完成');
}

// ============================================
// 建表语句（CREATE TABLE IF NOT EXISTS，幂等）
// ============================================
const TABLE_STATEMENTS: string[] = [
  // --- users ---
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar TEXT,
    provider VARCHAR(20) NOT NULL,
    provider_id VARCHAR(255),
    password_hash VARCHAR(255),
    wechat_openid VARCHAR(255) UNIQUE,
    wechat_unionid VARCHAR(255),
    wechat_session_key VARCHAR(255),
    birth_profile JSON,
    preferences JSON,
    email_verified BOOLEAN DEFAULT FALSE,
    trial_ends_at DATETIME(3),
    deleted_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- subscriptions ---
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    plan VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    current_period_start DATETIME(3),
    current_period_end DATETIME(3),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    \`usage\` JSON,
    payment_channel VARCHAR(20) DEFAULT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- purchases ---
  `CREATE TABLE IF NOT EXISTS purchases (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    product_type VARCHAR(50) NOT NULL,
    product_id VARCHAR(100),
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(20) NOT NULL,
    quantity INTEGER DEFAULT 1,
    consumed INTEGER DEFAULT 0,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- reports ---
  `CREATE TABLE IF NOT EXISTS reports (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- free_usage ---
  `CREATE TABLE IF NOT EXISTS free_usage (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    device_fingerprint VARCHAR(255) UNIQUE,
    ip_address VARCHAR(45),
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- purchase_records ---
  `CREATE TABLE IF NOT EXISTS purchase_records (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- synastry_records ---
  `CREATE TABLE IF NOT EXISTS synastry_records (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- subscription_usage ---
  `CREATE TABLE IF NOT EXISTS subscription_usage (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    week_start DATE NOT NULL,
    ask_used INTEGER DEFAULT 0,
    synastry_used INTEGER DEFAULT 0,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_sub_usage_user_week (user_id, week_start),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- email_verification_tokens ---
  `CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- refresh_tokens ---
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // --- wxpay_orders ---
  `CREATE TABLE IF NOT EXISTS wxpay_orders (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// ============================================
// 索引语句（单独执行，忽略已存在错误）
// ============================================
const INDEX_STATEMENTS: string[] = [
  'CREATE INDEX idx_users_email ON users(email)',
  'CREATE INDEX idx_users_provider ON users(provider, provider_id)',
  'CREATE INDEX idx_users_wechat_openid ON users(wechat_openid)',
  'CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id)',
  'CREATE INDEX idx_subscriptions_status ON subscriptions(status)',
  'CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id)',
  'CREATE INDEX idx_purchases_user_id ON purchases(user_id)',
  'CREATE INDEX idx_purchases_status ON purchases(status)',
  'CREATE INDEX idx_purchase_records_user_id ON purchase_records(user_id)',
  'CREATE INDEX idx_purchase_records_feature ON purchase_records(feature_type, feature_id)',
  'CREATE INDEX idx_synastry_records_user_hash ON synastry_records(user_id, synastry_hash)',
  'CREATE INDEX idx_subscription_usage_user_week ON subscription_usage(user_id, week_start)',
  'CREATE INDEX idx_reports_user_id ON reports(user_id)',
  'CREATE INDEX idx_reports_type ON reports(report_type)',
  'CREATE INDEX idx_free_usage_fingerprint ON free_usage(device_fingerprint)',
  'CREATE INDEX idx_free_usage_user ON free_usage(user_id)',
  'CREATE INDEX idx_wxpay_orders_user ON wxpay_orders(user_id)',
  'CREATE INDEX idx_wxpay_orders_status ON wxpay_orders(status)',
];

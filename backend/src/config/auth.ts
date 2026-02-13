// Authentication configuration
import dotenv from 'dotenv';

dotenv.config();

// JWT Configuration
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  ACCESS_TOKEN_EXPIRES_IN: '15m',  // 15 minutes
  REFRESH_TOKEN_EXPIRES_IN: '7d',   // 7 days
  ISSUER: 'astromind-miniprogram',
};

// Google OAuth Configuration
export const GOOGLE_CONFIG = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
};

// Apple Sign-In Configuration
export const APPLE_CONFIG = {
  CLIENT_ID: process.env.APPLE_CLIENT_ID || '',
  TEAM_ID: process.env.APPLE_TEAM_ID || '',
  KEY_ID: process.env.APPLE_KEY_ID || '',
  PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY || '',
};

// WeChat Mini Program Configuration
export const WECHAT_CONFIG = {
  APP_ID: process.env.WECHAT_APPID || '',
  APP_SECRET: process.env.WECHAT_APPSECRET || '',
};

// Email Configuration (for verification emails)
export const EMAIL_CONFIG = {
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@astromind.ai',
  FROM_NAME: process.env.FROM_NAME || 'AstrologyWiki',
};

// Free tier limits
export const FREE_TIER_LIMITS = {
  // 新版配置
  ASK_QUESTIONS_PER_WEEK: 3,        // 每周免费 3 次 Ask
  SYNASTRY_TOTAL: 3,                 // 永久免费 3 次合盘
  DETAIL_READINGS: 2,                // 探索自我前 2 个心理维度免费
  SYNTHETICA_DAILY: 3,               // Synthetica 工具每日免费次数

  // 向后兼容 - 旧版配置
  ASK_QUESTIONS: 3,                  // @deprecated - 使用 ASK_QUESTIONS_PER_WEEK
  SYNASTRY_OVERVIEWS: 3,             // @deprecated - 使用 SYNASTRY_TOTAL
};

// Subscription benefits ($6.99/月)
export const SUBSCRIPTION_BENEFITS = {
  // 新版配置 - 权益额度（每周）
  ASK_EXTRA_PER_WEEK: 2,             // 订阅额外 +2 次/周 Ask
  SYNASTRY_EXTRA_PER_WEEK: 2,        // 订阅额外 +2 次/周 合盘
  SYNTHETICA_EXTRA_PER_DAY: 7,       // 订阅额外 +7 次/日 Synthetica

  // 无限权益
  UNLIMITED_DETAILS: true,           // 所有查看详情免费
  UNLIMITED_DIMENSIONS: true,        // 探索自我所有维度免费
  UNLIMITED_DAILY: true,             // 今日运势详情免费
  CBT_STATS_FREE: true,              // CBT 统计解读免费

  // 报告折扣
  REPORT_DISCOUNT: 0.2,              // 8 折 (20% off)

  // 订阅赠送积分
  SUBSCRIPTION_BONUS_CREDITS: 500,   // 每次成功支付发放

  // 试用期
  TRIAL_DAYS: 7,                     // 首次注册赠送 7 天试用

  // 向后兼容 - 旧版配置
  SYNASTRY_READS_PER_MONTH: 5,       // @deprecated
  MONTHLY_REPORT_FREE: true,         // @deprecated
};

// 定价配置（订阅为美分，其余为积分）
export const PRICING = {
  // 订阅（美元）
  SUBSCRIPTION_MONTHLY: 699,         // $6.99/月

  // 积分定价（1 积分 = $0.10）
  DIMENSION_UNLOCK: 10,              // 10 积分 - 心理维度单个解锁
  CORE_THEME_UNLOCK: 10,             // 10 积分 - 核心主题单个解锁
  DAILY_SCRIPT: 10,                  // 10 积分 - 今日剧本（每日）
  DAILY_TRANSIT_DETAIL: 10,          // 10 积分 - 星象详情（每日）
  DETAIL_VIEW: 10,                   // 10 积分 - 深度详情
  SYNASTRY_FULL: 30,                 // 30 积分 - 合盘单次
  SYNASTRY_DETAIL: 10,               // 10 积分 - 合盘内查看详情
  ASK_SINGLE: 50,                    // 50 积分 - Ask 单次（每周免费次数用完后）
  CBT_STATS_MONTHLY: 20,             // 20 积分 - CBT 统计月度
  SYNTHETICA_USE: 10,                // 10 积分 - Synthetica 单次使用
};

// Check if auth providers are configured
export const isGoogleConfigured = (): boolean => {
  return !!(GOOGLE_CONFIG.CLIENT_ID && GOOGLE_CONFIG.CLIENT_SECRET);
};

export const isAppleConfigured = (): boolean => {
  return !!(APPLE_CONFIG.CLIENT_ID && APPLE_CONFIG.TEAM_ID);
};

export const isWechatConfigured = (): boolean => {
  return !!(WECHAT_CONFIG.APP_ID && WECHAT_CONFIG.APP_SECRET);
};

export const isEmailConfigured = (): boolean => {
  return !!(EMAIL_CONFIG.SMTP_HOST && EMAIL_CONFIG.SMTP_USER);
};

// 微信支付配置
import crypto from 'crypto';

const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_MCH_ID = process.env.WECHAT_MCH_ID || '';
const WECHAT_API_KEY_V3 = process.env.WECHAT_API_KEY_V3 || '';
const WECHAT_SERIAL_NO = process.env.WECHAT_SERIAL_NO || '';
const WECHAT_PRIVATE_KEY = process.env.WECHAT_PRIVATE_KEY || '';
const WECHAT_NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || '';

export const wxpayConfig = {
  appId: WECHAT_APPID,
  mchId: WECHAT_MCH_ID,
  apiKeyV3: WECHAT_API_KEY_V3,
  serialNo: WECHAT_SERIAL_NO,
  privateKey: WECHAT_PRIVATE_KEY,
  notifyUrl: WECHAT_NOTIFY_URL,
};

export const isWxPayConfigured = (): boolean => {
  return !!(WECHAT_APPID && WECHAT_MCH_ID && WECHAT_API_KEY_V3 && WECHAT_PRIVATE_KEY);
};

// VIP 订阅定价（单位：分）— 首次/续费分档
export const VIP_PLANS = {
  monthly: { firstPrice: 990, renewPrice: 1800, days: 30, label: '月度会员' },
  quarterly: { firstPrice: 3000, renewPrice: 4500, days: 90, label: '季度会员' },
  yearly: { firstPrice: 16800, renewPrice: 19800, days: 365, label: '年度会员' },
} as const;

// 积分充值档位（单位：分）— 1 RMB = 10 积分
export const POINTS_PACKAGES = [
  { amount: 100,  price: 1000  },  // ¥10
  { amount: 300,  price: 3000  },  // ¥30
  { amount: 500,  price: 5000  },  // ¥50  — 推荐
  { amount: 1000, price: 10000 },  // ¥100
  { amount: 2000, price: 20000 },  // ¥200
  { amount: 5000, price: 50000 },  // ¥500 — 尊享
] as const;

// 生成随机字符串
export const generateNonceStr = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

// 生成订单号
export const generateOrderId = (prefix: string): string => {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}${dateStr}${random}`;
};

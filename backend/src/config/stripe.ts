// Stripe configuration
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// 尝试加载多个环境变量文件
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
];
envPaths.forEach((p) => dotenv.config({ path: p }));

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!stripeSecretKey) {
  console.warn('Warning: Stripe secret key not configured. Payment features will be disabled.');
}

// 使用占位密钥避免初始化错误 - 实际调用时检查 isStripeConfigured
const effectiveKey = stripeSecretKey || 'sk_test_placeholder';
export const stripe = new Stripe(effectiveKey);

export const STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;

// Check if Stripe is configured
export const isStripeConfigured = (): boolean => {
  return !!stripeSecretKey;
};

// Price IDs - Configure these in Stripe Dashboard
export const STRIPE_PRICES = {
  // Subscription prices
  MONTHLY_SUBSCRIPTION: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_699',
  YEARLY_SUBSCRIPTION: process.env.STRIPE_PRICE_YEARLY || 'price_yearly_4999',

  // One-time purchase prices - 新定价
  DIMENSION_UNLOCK: process.env.STRIPE_PRICE_DIMENSION || 'price_dimension_99',
  CORE_THEME_UNLOCK: process.env.STRIPE_PRICE_CORE_THEME || 'price_core_theme_99',
  DAILY_SCRIPT: process.env.STRIPE_PRICE_DAILY_SCRIPT || 'price_daily_script_99',
  DAILY_TRANSIT: process.env.STRIPE_PRICE_DAILY_TRANSIT || 'price_daily_transit_99',
  DETAIL_VIEW: process.env.STRIPE_PRICE_DETAIL_VIEW || 'price_detail_view_99',
  SYNASTRY_FULL: process.env.STRIPE_PRICE_SYNASTRY || 'price_synastry_299',
  SYNASTRY_DETAIL: process.env.STRIPE_PRICE_SYNASTRY_DETAIL || 'price_synastry_detail_99',
  ASK_SINGLE: process.env.STRIPE_PRICE_ASK || 'price_ask_199',
  CBT_STATS_MONTHLY: process.env.STRIPE_PRICE_CBT_STATS || 'price_cbt_stats_199',
  SYNTHETICA_USE: process.env.STRIPE_PRICE_SYNTHETICA || 'price_synthetica_99',

  // 向后兼容 - 旧版价格 ID
  DETAIL_PACK_10: process.env.STRIPE_PRICE_DETAIL_PACK || 'price_detail_299', // @deprecated
  CBT_ANALYSIS: process.env.STRIPE_PRICE_CBT || 'price_cbt_99', // @deprecated

  // Report prices
  REPORT_MONTHLY: process.env.STRIPE_PRICE_REPORT_MONTHLY || 'price_report_monthly_199',
  REPORT_ANNUAL: process.env.STRIPE_PRICE_REPORT_ANNUAL || 'price_report_annual_799',
  REPORT_CAREER: process.env.STRIPE_PRICE_REPORT_CAREER || 'price_report_career_499', // @deprecated
  REPORT_WEALTH: process.env.STRIPE_PRICE_REPORT_WEALTH || 'price_report_wealth_499', // @deprecated
  REPORT_LOVE: process.env.STRIPE_PRICE_REPORT_LOVE || 'price_report_love_499', // @deprecated
  REPORT_SATURN_RETURN: process.env.STRIPE_PRICE_REPORT_SATURN || 'price_report_saturn_699', // @deprecated
  REPORT_SYNASTRY_DEEP: process.env.STRIPE_PRICE_REPORT_SYNASTRY_DEEP || 'price_report_synastry_599', // @deprecated
};

// Product configuration with pricing info - 新定价
const SUBSCRIPTION_MONTHLY_AMOUNT = 699;
const SUBSCRIPTION_YEARLY_DISCOUNT = 0.2;
const SUBSCRIPTION_YEARLY_AMOUNT = Math.round(SUBSCRIPTION_MONTHLY_AMOUNT * 12 * (1 - SUBSCRIPTION_YEARLY_DISCOUNT));

export const PRODUCTS = {
  subscription: {
    monthly: {
      priceId: STRIPE_PRICES.MONTHLY_SUBSCRIPTION,
      amount: SUBSCRIPTION_MONTHLY_AMOUNT, // $6.99
      name: 'AstrologyWiki Pro Monthly',
      interval: 'month' as const,
    },
    yearly: {
      priceId: STRIPE_PRICES.YEARLY_SUBSCRIPTION,
      amount: SUBSCRIPTION_YEARLY_AMOUNT, // 20% off annual billing
      name: 'AstrologyWiki Pro Yearly',
      interval: 'year' as const,
    },
  },
  oneTime: {
    dimension: {
      priceId: STRIPE_PRICES.DIMENSION_UNLOCK,
      amount: 99,  // $0.99
      name: 'Unlock Psychological Dimension',
      scope: 'permanent' as const,
    },
    core_theme: {
      priceId: STRIPE_PRICES.CORE_THEME_UNLOCK,
      amount: 99,  // $0.99
      name: 'Unlock Core Theme',
      scope: 'permanent' as const,
    },
    daily_script: {
      priceId: STRIPE_PRICES.DAILY_SCRIPT,
      amount: 99,  // $0.99
      name: 'Daily Script Access',
      scope: 'daily' as const,
    },
    daily_transit: {
      priceId: STRIPE_PRICES.DAILY_TRANSIT,
      amount: 99,  // $0.99
      name: 'Daily Transit Detail',
      scope: 'daily' as const,
    },
    detail: {
      priceId: STRIPE_PRICES.DETAIL_VIEW,
      amount: 99,
      name: 'Detail View',
      scope: 'permanent' as const,
    },
    synastry: {
      priceId: STRIPE_PRICES.SYNASTRY_FULL,
      amount: 299, // $2.99
      name: 'Synastry Reading',
      scope: 'permanent' as const,
      quantity: 1, // 向后兼容
    },
    synastry_detail: {
      priceId: STRIPE_PRICES.SYNASTRY_DETAIL,
      amount: 99,  // $0.99
      name: 'Synastry Detail View',
      scope: 'per_synastry' as const,
    },
    ask: {
      priceId: STRIPE_PRICES.ASK_SINGLE,
      amount: 199, // $1.99
      name: 'Single Ask Question',
      scope: 'consumable' as const,
      quantity: 1, // 向后兼容
    },
    cbt_stats: {
      priceId: STRIPE_PRICES.CBT_STATS_MONTHLY,
      amount: 199, // $1.99
      name: 'CBT Stats Monthly',
      scope: 'per_month' as const,
    },
    synthetica: {
      priceId: STRIPE_PRICES.SYNTHETICA_USE,
      amount: 99, // $0.99
      name: 'Synthetica Insight',
      scope: 'consumable' as const,
      quantity: 1,
    },
    // 向后兼容 - 旧版产品
    detail_pack: {
      priceId: STRIPE_PRICES.DETAIL_PACK_10,
      amount: 299,
      name: 'Detail Reading Pack (10)',
      quantity: 10,
    },
    cbt_analysis: {
      priceId: STRIPE_PRICES.CBT_ANALYSIS,
      amount: 99,
      name: 'CBT Journal Analysis',
      quantity: 1,
    },
  },
  reports: {
    monthly: {
      priceId: STRIPE_PRICES.REPORT_MONTHLY,
      amount: 199,
      name: 'Monthly Forecast Report',
      type: 'monthly',
    },
    annual: {
      priceId: STRIPE_PRICES.REPORT_ANNUAL,
      amount: 799,
      name: 'Annual Forecast Report',
      type: 'annual',
    },
    // 向后兼容 - 旧版报告类型
    career: {
      priceId: STRIPE_PRICES.REPORT_CAREER,
      amount: 499,
      name: 'Career & Profession Report',
      type: 'career',
    },
    wealth: {
      priceId: STRIPE_PRICES.REPORT_WEALTH,
      amount: 499,
      name: 'Wealth & Finance Report',
      type: 'wealth',
    },
    love: {
      priceId: STRIPE_PRICES.REPORT_LOVE,
      amount: 499,
      name: 'Love & Relationship Report',
      type: 'love',
    },
    saturn_return: {
      priceId: STRIPE_PRICES.REPORT_SATURN_RETURN,
      amount: 699,
      name: 'Saturn Return Report',
      type: 'saturn_return',
    },
    synastry_deep: {
      priceId: STRIPE_PRICES.REPORT_SYNASTRY_DEEP,
      amount: 599,
      name: 'Synastry Deep Report',
      type: 'synastry_deep',
    },
  },
};

// Subscriber discount percentage
export const SUBSCRIBER_DISCOUNT = 0.2; // 20% off (8折)

export default stripe;

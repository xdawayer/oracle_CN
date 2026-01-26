// Supabase client configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 尝试加载多个环境变量文件
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
];
envPaths.forEach((p) => dotenv.config({ path: p }));

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 检查是否为占位配置或无效 URL
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isPlaceholder = !supabaseUrl ||
                      !supabaseServiceKey ||
                      !isValidUrl(supabaseUrl) ||
                      supabaseUrl.includes('placeholder') ||
                      supabaseUrl.includes('your_supabase') ||
                      supabaseUrl.includes('your-project-id');

if (isPlaceholder) {
  console.warn('Warning: Supabase credentials not configured or using placeholder. Authentication features will be disabled.');
}

// Service role client for backend operations (bypasses RLS)
// 使用有效的占位 URL 避免初始化错误，实际调用时会检查 isSupabaseConfigured
const effectiveUrl = (supabaseUrl && isValidUrl(supabaseUrl)) ? supabaseUrl : 'https://placeholder.supabase.co';
const effectiveKey = supabaseServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.placeholder';

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Check if Supabase is configured (not placeholder)
export const isSupabaseConfigured = (): boolean => {
  return !isPlaceholder;
};

// Database types
export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: 'google' | 'apple' | 'email' | 'wechat';
  provider_id: string | null;
  password_hash: string | null;
  wechat_openid?: string | null;
  wechat_unionid?: string | null;
  wechat_session_key?: string | null;
  birth_profile: BirthProfile | null;
  preferences: UserPreferences;
  email_verified: boolean;
  trial_ends_at: string | null;  // 试用期结束时间
  created_at: string;
  updated_at: string;
}

export interface BirthProfile {
  birthDate: string;
  birthTime?: string;
  birthCity: string;
  lat?: number;
  lon?: number;
  timezone: string;
  accuracyLevel: 'exact' | 'time_unknown' | 'approximate';
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
}

export interface DbSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  usage: SubscriptionUsage;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  synastryReads: number;
  monthlyReportClaimed: boolean;
}

export interface DbPurchase {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  product_type: 'ask' | 'detail_pack' | 'synastry' | 'cbt_analysis' | 'report';
  product_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  quantity: number;
  consumed: number;
  created_at: string;
}

export interface DbReport {
  id: string;
  user_id: string;
  report_type: string;
  title: string | null;
  content: Record<string, unknown> | null;
  pdf_url: string | null;
  birth_profile: BirthProfile | null;
  partner_profile: BirthProfile | null;
  generated_at: string;
  created_at: string;
}

export interface DbFreeUsage {
  id: string;
  user_id: string | null;
  device_fingerprint: string | null;
  ip_address: string | null;
  ask_used: number;
  ask_reset_at: string | null;
  detail_used: number;
  synastry_used: number;
  synastry_total_used: number;  // 永久免费合盘次数（最多 3 次）
  synthetica_used: number;
  synthetica_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

// 购买范围类型
export type PurchaseScope = 'permanent' | 'daily' | 'per_synastry' | 'per_month' | 'consumable';

// 购买记录表（新版）
export interface DbPurchaseRecord {
  id: string;
  user_id: string;
  feature_type: string;           // 'dimension_talents', 'daily_script', 'synastry', 'ask', 'cbt_stats' 等
  feature_id: string | null;      // 具体 ID（维度名、合盘哈希、日期等）
  scope: PurchaseScope;
  price_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  valid_until: string | null;
  quantity: number;
  consumed: number;
  created_at: string;
}

// 合盘记录表
export interface DbSynastryRecord {
  id: string;
  user_id: string;
  synastry_hash: string;
  person_a_info: SynastryPersonInfo;
  person_b_info: SynastryPersonInfo;
  relationship_type: string | null;
  is_free: boolean;
  created_at: string;
}

// 合盘人员信息
export interface SynastryPersonInfo {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthCity: string;
  lat: number;
  lon: number;
  timezone: string;
}

// 订阅权益使用表
export interface DbSubscriptionUsage {
  id: string;
  user_id: string;
  week_start: string;
  ask_used: number;
  synastry_used: number;
  created_at: string;
  updated_at: string;
}

export default supabase;

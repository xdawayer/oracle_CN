// Entitlement Service V2 - 重新设计的权益系统
// 支持：7天试用、每周重置、永久解锁、合盘唯一性校验等

import crypto from 'crypto';
import {
  supabase,
  DbFreeUsage,
  DbPurchaseRecord,
  DbSynastryRecord,
  DbSubscriptionUsage,
  SynastryPersonInfo,
  PurchaseScope,
  isSupabaseConfigured,
} from '../db/supabase.js';
import { FREE_TIER_LIMITS, SUBSCRIPTION_BENEFITS, PRICING } from '../config/auth.js';
import subscriptionService from './subscriptionService.js';
import { getOrCreateDevEntitlementState } from './entitlementService.js';

// =====================================================
// 类型定义
// =====================================================

export interface EntitlementsV2 {
  isLoggedIn: boolean;
  isSubscriber: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;

  subscription?: {
    plan: 'monthly' | 'yearly';
    status: string;
    expiresAt: string;
  };

  // Ask 问答额度
  ask: {
    freeLeft: number;           // 本周免费剩余
    subscriptionLeft: number;   // 本周订阅权益剩余
    purchasedLeft: number;
    totalLeft: number;          // 合计可用
    resetAt: string;            // 下次重置时间
  };

  // 合盘额度
  synastry: {
    freeLeft: number;           // 永久免费剩余（最多 3 次）
    subscriptionLeft: number;   // 本周订阅权益剩余
    totalLeft: number;          // 合计可用
    resetAt: string;            // 下次重置时间（仅影响订阅权益）
  };

  // Synthetica 工具额度
  synthetica: {
    freeLeft: number;           // 当日免费剩余
    subscriptionLeft: number;   // 当日订阅权益剩余
    purchasedLeft: number;      // 购买的额外额度剩余
    totalLeft: number;          // 合计可用
    resetAt: string;            // 下次重置时间
  };

  // 已购买的永久内容
  purchasedFeatures: {
    dimensions: string[];       // 已解锁的心理维度
    coreThemes: string[];       // 已解锁的核心主题
    details: string[];
    synastryHashes: string[];   // 已购买的合盘哈希
  };

  // 当月已解锁的内容
  monthlyUnlocked: {
    cbtStats: boolean;          // CBT 统计是否已解锁
  };

  credits: number;
  discount: number;
}

export type FeatureType =
  | 'dimension'         // 心理维度（永久）
  | 'core_theme'        // 核心主题（永久）
  | 'detail'
  | 'daily_script'      // 今日剧本（每日）
  | 'daily_transit'     // 星象详情（每日）
  | 'synastry'          // 合盘（永久）
  | 'synastry_detail'   // 合盘内详情（按合盘绑定）
  | 'ask'               // Ask 问答（消耗型）
  | 'cbt_stats'         // CBT 统计（每月）
  | 'synthetica';       // Synthetica 工具（消耗型）

export type PurchaseFeatureType = FeatureType | 'report';

export interface AccessCheckResult {
  canAccess: boolean;
  reason?: 'subscribed' | 'trial' | 'purchased' | 'free_quota';
  needPurchase?: boolean;
  price?: number;          // 积分
  scope?: PurchaseScope;
}

// =====================================================
// 工具函数
// =====================================================

type DevEntitlementState = ReturnType<typeof getOrCreateDevEntitlementState>;

// 获取当前周起始时间（周一 00:00 UTC）
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d;
}

// 获取当前日起始时间（00:00 UTC）
function getDayStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// 获取下周重置时间
function getNextWeekReset(): string {
  const nextWeek = getWeekStart();
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  return nextWeek.toISOString();
}

// 获取下一日重置时间
function getNextDayReset(): string {
  const nextDay = getDayStart();
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString();
}

// 检查是否同一月
function isSameMonth(date1: Date, date2: Date = new Date()): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth()
  );
}

function getYearMonthKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function ensureDevCollections(state: DevEntitlementState): DevEntitlementState {
  if (!state.purchasedFeatures) {
    state.purchasedFeatures = {
      dimensions: [],
      coreThemes: [],
      details: [],
      synastryHashes: [],
    };
  }
  if (!state.monthlyUnlocks) {
    state.monthlyUnlocks = {
      cbtStatsMonths: [],
    };
  }
  if (typeof state.askTokens !== 'number') {
    state.askTokens = 0;
  }
  if (typeof state.syntheticaTokens !== 'number') {
    state.syntheticaTokens = 0;
  }
  if (typeof state.syntheticaUsed !== 'number') {
    state.syntheticaUsed = 0;
  }
  if (state.syntheticaResetAt === undefined) {
    state.syntheticaResetAt = null;
  }
  return state;
}

function addUnique(list: string[], value?: string | null) {
  if (!value) return;
  if (!list.includes(value)) {
    list.push(value);
  }
}

function applyDevPurchase(
  state: DevEntitlementState,
  featureType: PurchaseFeatureType,
  featureId: string | null,
  scope: PurchaseScope
) {
  const ensured = ensureDevCollections(state);
  switch (scope) {
    case 'permanent': {
      if (featureType === 'dimension') {
        addUnique(ensured.purchasedFeatures.dimensions, featureId);
      } else if (featureType === 'core_theme') {
        addUnique(ensured.purchasedFeatures.coreThemes, featureId);
      } else if (featureType === 'detail') {
        addUnique(ensured.purchasedFeatures.details, featureId);
      } else if (featureType === 'synastry_detail' || featureType === 'synastry') {
        addUnique(ensured.purchasedFeatures.synastryHashes, featureId);
      }
      break;
    }
    case 'per_synastry': {
      addUnique(ensured.purchasedFeatures.synastryHashes, featureId);
      break;
    }
    case 'per_month': {
      if (featureType === 'cbt_stats') {
        const monthKey = featureId || getYearMonthKey();
        addUnique(ensured.monthlyUnlocks.cbtStatsMonths, monthKey);
      }
      break;
    }
    case 'consumable': {
      if (featureType === 'ask') {
        ensured.askTokens = Math.max(0, ensured.askTokens + 1);
      } else if (featureType === 'synthetica') {
        ensured.syntheticaTokens = Math.max(0, ensured.syntheticaTokens + 1);
      }
      break;
    }
    default:
      break;
  }
}

// 生成合盘唯一性哈希
export function generateSynastryHash(
  personA: SynastryPersonInfo,
  personB: SynastryPersonInfo,
  relationshipType: string
): string {
  const normalizePersonInfo = (person: SynastryPersonInfo) => ({
    name: person.name.trim().toLowerCase(),
    birthDate: person.birthDate,
    birthTime: person.birthTime || 'unknown',
    lat: Math.round(person.lat * 100) / 100,
    lon: Math.round(person.lon * 100) / 100,
    timezone: person.timezone,
  });

  const normalized = JSON.stringify({
    a: normalizePersonInfo(personA),
    b: normalizePersonInfo(personB),
    rel: relationshipType,
  });

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// =====================================================
// EntitlementServiceV2 类
// =====================================================

class EntitlementServiceV2 {
  // 获取用户完整权益状态
  async getEntitlements(userId: string | null, deviceFingerprint?: string): Promise<EntitlementsV2> {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const nextReset = getNextWeekReset();
    const dayStart = getDayStart(now);
    const nextDayReset = getNextDayReset();

    const entitlements: EntitlementsV2 = {
        isLoggedIn: !!userId,
        isSubscriber: false,
        isTrialing: false,
        trialEndsAt: null,
        ask: {
          freeLeft: FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK,
          subscriptionLeft: 0,
          purchasedLeft: 0,
          totalLeft: FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK,
          resetAt: nextReset,
        },
        synastry: {
          freeLeft: FREE_TIER_LIMITS.SYNASTRY_TOTAL,
          subscriptionLeft: 0,
          totalLeft: FREE_TIER_LIMITS.SYNASTRY_TOTAL,
          resetAt: nextReset,
        },
        synthetica: {
          freeLeft: FREE_TIER_LIMITS.SYNTHETICA_DAILY,
          subscriptionLeft: 0,
          purchasedLeft: 0,
          totalLeft: FREE_TIER_LIMITS.SYNTHETICA_DAILY,
          resetAt: nextDayReset,
        },
        purchasedFeatures: {
          dimensions: [],
          coreThemes: [],
          details: [],
          synastryHashes: [],
        },
        monthlyUnlocked: {
          cbtStats: false,
        },
        credits: 0,
        discount: SUBSCRIPTION_BENEFITS.REPORT_DISCOUNT,
      };

    if (!isSupabaseConfigured()) {
      if (userId) {
        const devState = ensureDevCollections(getOrCreateDevEntitlementState(userId));
        const weekStartIso = weekStart.toISOString().split('T')[0];
        const currentMonthKey = getYearMonthKey(now);
        const updatedEntitlements: EntitlementsV2 = {
          ...entitlements,
          isSubscriber: devState.isSubscriber,
          credits: devState.gmCredits,
        };

        if (!devState.freeAskResetAt || new Date(devState.freeAskResetAt) < weekStart) {
          devState.freeAskUsed = 0;
          devState.freeAskResetAt = weekStart.toISOString();
        }

        if (!devState.syntheticaResetAt || new Date(devState.syntheticaResetAt) < dayStart) {
          devState.syntheticaUsed = 0;
          devState.syntheticaResetAt = dayStart.toISOString();
        }

        if (devState.subscriptionWeekStart !== weekStartIso) {
          devState.subscriptionAskUsed = 0;
          devState.subscriptionSynastryUsed = 0;
          devState.subscriptionWeekStart = weekStartIso;
        }

        updatedEntitlements.ask.freeLeft = Math.max(
          0,
          FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK - devState.freeAskUsed
        );
        updatedEntitlements.ask.purchasedLeft = Math.max(0, devState.askTokens);
        updatedEntitlements.synastry.freeLeft = Math.max(
          0,
          FREE_TIER_LIMITS.SYNASTRY_TOTAL - devState.freeSynastryUsed
        );
        const syntheticaUsed = devState.syntheticaUsed || 0;
        updatedEntitlements.synthetica.freeLeft = Math.max(
          0,
          FREE_TIER_LIMITS.SYNTHETICA_DAILY - syntheticaUsed
        );
        updatedEntitlements.synthetica.purchasedLeft = Math.max(0, devState.syntheticaTokens || 0);
        updatedEntitlements.purchasedFeatures = {
          dimensions: [...devState.purchasedFeatures.dimensions],
          coreThemes: [...devState.purchasedFeatures.coreThemes],
          details: [...devState.purchasedFeatures.details],
          synastryHashes: [...devState.purchasedFeatures.synastryHashes],
        };
        updatedEntitlements.monthlyUnlocked.cbtStats = devState.monthlyUnlocks.cbtStatsMonths.includes(currentMonthKey);

        if (devState.isSubscriber) {
          updatedEntitlements.subscription = {
            plan: 'monthly',
            status: 'active',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          };
          updatedEntitlements.ask.subscriptionLeft = Math.max(
            0,
            SUBSCRIPTION_BENEFITS.ASK_EXTRA_PER_WEEK - devState.subscriptionAskUsed
          );
          updatedEntitlements.synastry.subscriptionLeft = Math.max(
            0,
            SUBSCRIPTION_BENEFITS.SYNASTRY_EXTRA_PER_WEEK - devState.subscriptionSynastryUsed
          );
          updatedEntitlements.synthetica.subscriptionLeft = Math.max(
            0,
            SUBSCRIPTION_BENEFITS.SYNTHETICA_EXTRA_PER_DAY - Math.max(0, syntheticaUsed - FREE_TIER_LIMITS.SYNTHETICA_DAILY)
          );
          updatedEntitlements.monthlyUnlocked.cbtStats = SUBSCRIPTION_BENEFITS.CBT_STATS_FREE;
        }

        updatedEntitlements.ask.totalLeft = updatedEntitlements.ask.freeLeft
          + updatedEntitlements.ask.subscriptionLeft
          + updatedEntitlements.ask.purchasedLeft;
        updatedEntitlements.synastry.totalLeft = updatedEntitlements.synastry.freeLeft
          + updatedEntitlements.synastry.subscriptionLeft;
        updatedEntitlements.synthetica.totalLeft = updatedEntitlements.synthetica.freeLeft
          + updatedEntitlements.synthetica.subscriptionLeft
          + updatedEntitlements.synthetica.purchasedLeft;

        return updatedEntitlements;
      }
      return entitlements;
    }

    // 未登录用户：基于设备指纹的免费额度
    if (!userId && deviceFingerprint) {
      try {
        const freeUsage = await this.getOrCreateFreeUsageForDevice(deviceFingerprint);
        if (freeUsage) {
          // 检查 Ask 是否需要重置（每周）
          const askResetAt = freeUsage.ask_reset_at ? new Date(freeUsage.ask_reset_at) : null;
          if (!askResetAt || askResetAt < weekStart) {
            // 需要重置
            await this.resetWeeklyFreeUsage(freeUsage.id);
            entitlements.ask.freeLeft = FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK;
          } else {
            entitlements.ask.freeLeft = Math.max(0, FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK - freeUsage.ask_used);
          }

          // 检查 Synthetica 是否需要重置（每日）
          const syntheticaResetAt = freeUsage.synthetica_reset_at ? new Date(freeUsage.synthetica_reset_at) : null;
          if (!syntheticaResetAt || syntheticaResetAt < dayStart) {
            await this.resetDailySyntheticaUsage(freeUsage.id);
            entitlements.synthetica.freeLeft = FREE_TIER_LIMITS.SYNTHETICA_DAILY;
          } else {
            entitlements.synthetica.freeLeft = Math.max(0, FREE_TIER_LIMITS.SYNTHETICA_DAILY - (freeUsage.synthetica_used || 0));
          }

          // 合盘永久免费次数
          entitlements.synastry.freeLeft = Math.max(0, FREE_TIER_LIMITS.SYNASTRY_TOTAL - (freeUsage.synastry_total_used || 0));
        }

        entitlements.ask.totalLeft = entitlements.ask.freeLeft;
        entitlements.synastry.totalLeft = entitlements.synastry.freeLeft;
        entitlements.synthetica.totalLeft = entitlements.synthetica.freeLeft;
        return entitlements;
      } catch (error) {
        console.error('Failed to load free usage for device:', error);
        return entitlements;
      }
    }

    if (!userId) {
      return entitlements;
    }

    // 已登录用户
    // 1. 检查试用期
    const user = await this.getUser(userId);
    if (!user) {
      // 用户不存在（可能是旧 Token），按访客处理
      return entitlements;
    }

    if (user.trial_ends_at) {
      const trialEnd = new Date(user.trial_ends_at);
      entitlements.trialEndsAt = user.trial_ends_at;
      if (trialEnd > now) {
        entitlements.isTrialing = true;
        entitlements.isSubscriber = true; // 试用期视为订阅用户
      }
    }

    // 2. 检查订阅状态
    if (!entitlements.isTrialing) {
      const subscription = await subscriptionService.getSubscription(userId);
      if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
        const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
        if (!expiresAt || expiresAt > now) {
          entitlements.isSubscriber = true;
          entitlements.subscription = {
            plan: subscription.plan,
            status: subscription.status,
            expiresAt: subscription.current_period_end || '',
          };
        }
      }
    }

    // 3. 获取免费额度使用情况
    const freeUsage = await this.getOrCreateFreeUsageForUser(userId, deviceFingerprint);
    let syntheticaUsed = 0;

    if (freeUsage) {
      const askResetAt = freeUsage.ask_reset_at ? new Date(freeUsage.ask_reset_at) : null;
      if (!askResetAt || askResetAt < weekStart) {
        await this.resetWeeklyFreeUsage(freeUsage.id);
        entitlements.ask.freeLeft = FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK;
      } else {
        entitlements.ask.freeLeft = Math.max(0, FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK - freeUsage.ask_used);
      }
      const syntheticaResetAt = freeUsage.synthetica_reset_at ? new Date(freeUsage.synthetica_reset_at) : null;
      if (!syntheticaResetAt || syntheticaResetAt < dayStart) {
        await this.resetDailySyntheticaUsage(freeUsage.id);
        entitlements.synthetica.freeLeft = FREE_TIER_LIMITS.SYNTHETICA_DAILY;
        syntheticaUsed = 0;
      } else {
        syntheticaUsed = freeUsage.synthetica_used || 0;
        entitlements.synthetica.freeLeft = Math.max(0, FREE_TIER_LIMITS.SYNTHETICA_DAILY - syntheticaUsed);
      }
      entitlements.synastry.freeLeft = Math.max(0, FREE_TIER_LIMITS.SYNASTRY_TOTAL - (freeUsage.synastry_total_used || 0));
    }

    // 4. 订阅用户的额外权益
    if (entitlements.isSubscriber) {
      const subUsage = await this.getOrCreateSubscriptionUsage(userId, weekStart);

      // Ask 订阅权益
      entitlements.ask.subscriptionLeft = Math.max(
        0,
        SUBSCRIPTION_BENEFITS.ASK_EXTRA_PER_WEEK - subUsage.ask_used
      );

      // 合盘订阅权益
      entitlements.synastry.subscriptionLeft = Math.max(
        0,
        SUBSCRIPTION_BENEFITS.SYNASTRY_EXTRA_PER_WEEK - subUsage.synastry_used
      );

      entitlements.synthetica.subscriptionLeft = Math.max(
        0,
        SUBSCRIPTION_BENEFITS.SYNTHETICA_EXTRA_PER_DAY - Math.max(0, syntheticaUsed - FREE_TIER_LIMITS.SYNTHETICA_DAILY)
      );

      // CBT 统计自动解锁
      entitlements.monthlyUnlocked.cbtStats = true;
    }

    const purchaseRecords = await this.getPurchaseRecords(userId);
    let askPurchasedLeft = 0;
    let syntheticaPurchasedLeft = 0;
    let credits = 0;

    for (const record of purchaseRecords) {
      if (record.scope === 'permanent') {
        if (record.feature_type === 'dimension' && record.feature_id) {
          entitlements.purchasedFeatures.dimensions.push(record.feature_id);
        } else if (record.feature_type === 'core_theme' && record.feature_id) {
          entitlements.purchasedFeatures.coreThemes.push(record.feature_id);
        } else if (record.feature_type === 'detail' && record.feature_id) {
          entitlements.purchasedFeatures.details.push(record.feature_id);
        } else if ((record.feature_type === 'synastry_detail' || record.feature_type === 'synastry') && record.feature_id) {
          entitlements.purchasedFeatures.synastryHashes.push(record.feature_id);
        }
      } else if (record.scope === 'per_month') {
        if (record.feature_type === 'cbt_stats' && record.valid_until) {
          const validUntil = new Date(record.valid_until);
          if (isSameMonth(validUntil, now) || validUntil > now) {
            entitlements.monthlyUnlocked.cbtStats = true;
          }
        }
      } else if (record.scope === 'consumable') {
        const remaining = Math.max(0, (record.quantity || 0) - (record.consumed || 0));
        if (record.feature_type === 'ask') {
          askPurchasedLeft += remaining;
        } else if (record.feature_type === 'synthetica') {
          syntheticaPurchasedLeft += remaining;
        } else if (record.feature_type === 'gm_credit') {
          credits += remaining;
        }
      }
    }

    entitlements.ask.purchasedLeft = askPurchasedLeft;
    entitlements.synthetica.purchasedLeft = syntheticaPurchasedLeft;
    entitlements.ask.totalLeft = entitlements.ask.freeLeft
      + entitlements.ask.subscriptionLeft
      + entitlements.ask.purchasedLeft;
    entitlements.synastry.totalLeft = entitlements.synastry.freeLeft
      + entitlements.synastry.subscriptionLeft;
    entitlements.synthetica.totalLeft = entitlements.synthetica.freeLeft
      + entitlements.synthetica.subscriptionLeft
      + entitlements.synthetica.purchasedLeft;
    entitlements.credits = credits;

    return entitlements;
  }

  // 检查特定功能是否可访问
  async checkAccess(
    userId: string | null,
    featureType: FeatureType,
    featureId?: string,
    deviceFingerprint?: string
  ): Promise<AccessCheckResult> {
    try {
      const entitlements = await this.getEntitlements(userId, deviceFingerprint);
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      switch (featureType) {
        case 'dimension': {
          // 前 2 个维度免费
          const freeDimensions = ['Emotions', 'Attachment'];
          if (featureId && freeDimensions.includes(featureId)) {
            return { canAccess: true, reason: 'free_quota' };
          }
          // 订阅/试用用户全部解锁
          if (entitlements.isSubscriber) {
            return { canAccess: true, reason: entitlements.isTrialing ? 'trial' : 'subscribed' };
          }
          // 已购买
          if (featureId && entitlements.purchasedFeatures.dimensions.includes(featureId)) {
            return { canAccess: true, reason: 'purchased' };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.DIMENSION_UNLOCK,
            scope: 'permanent',
          };
        }

        case 'core_theme': {
          if (entitlements.isSubscriber) {
            return { canAccess: true, reason: entitlements.isTrialing ? 'trial' : 'subscribed' };
          }
          if (featureId && entitlements.purchasedFeatures.coreThemes.includes(featureId)) {
            return { canAccess: true, reason: 'purchased' };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.CORE_THEME_UNLOCK,
            scope: 'permanent',
          };
        }

        case 'detail': {
          if (entitlements.isSubscriber) {
            return { canAccess: true, reason: entitlements.isTrialing ? 'trial' : 'subscribed' };
          }
          if (featureId && entitlements.purchasedFeatures.details.includes(featureId)) {
            return { canAccess: true, reason: 'purchased' };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.DETAIL_VIEW,
            scope: 'permanent',
          };
        }

        case 'daily_script':
        case 'daily_transit': {
          if (entitlements.isSubscriber) {
            return { canAccess: true, reason: entitlements.isTrialing ? 'trial' : 'subscribed' };
          }
          // 检查今日是否已购买
          const hasPurchased = await this.checkDailyPurchase(userId, featureType, today);
          if (hasPurchased) {
            return { canAccess: true, reason: 'purchased' };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: featureType === 'daily_script' ? PRICING.DAILY_SCRIPT : PRICING.DAILY_TRANSIT_DETAIL,
            scope: 'daily',
          };
        }

        case 'synastry': {
          if (featureId && entitlements.purchasedFeatures.synastryHashes.includes(featureId)) {
            return { canAccess: true, reason: 'purchased' };
          }
          if (entitlements.synastry.totalLeft > 0) {
            const reason = entitlements.synastry.freeLeft > 0 ? 'free_quota' :
              (entitlements.isTrialing ? 'trial' : 'subscribed');
            return { canAccess: true, reason };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.SYNASTRY_FULL,
            scope: 'permanent',
          };
        }

        case 'synastry_detail': {
          if (entitlements.isSubscriber) {
            return { canAccess: true, reason: entitlements.isTrialing ? 'trial' : 'subscribed' };
          }
          // 检查是否已购买该合盘的详情
          if (featureId && entitlements.purchasedFeatures.synastryHashes.includes(featureId)) {
            return { canAccess: true, reason: 'purchased' };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.SYNASTRY_DETAIL,
            scope: 'per_synastry',
          };
        }

        case 'ask': {
          if (entitlements.ask.totalLeft > 0 || entitlements.credits >= PRICING.ASK_SINGLE) {
            let reason: AccessCheckResult['reason'] = 'free_quota';
            if (entitlements.ask.freeLeft > 0) {
              reason = 'free_quota';
            } else if (entitlements.ask.subscriptionLeft > 0 || entitlements.isSubscriber) {
              reason = entitlements.isTrialing ? 'trial' : 'subscribed';
            } else {
              reason = 'purchased';
            }
            return { canAccess: true, reason };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.ASK_SINGLE,
            scope: 'consumable',
          };
        }

        case 'synthetica': {
          if (entitlements.synthetica.totalLeft > 0 || entitlements.credits >= PRICING.SYNTHETICA_USE) {
            let reason: AccessCheckResult['reason'] = 'free_quota';
            if (entitlements.synthetica.freeLeft > 0) {
              reason = 'free_quota';
            } else if (entitlements.synthetica.subscriptionLeft > 0 || entitlements.isSubscriber) {
              reason = entitlements.isTrialing ? 'trial' : 'subscribed';
            } else {
              reason = 'purchased';
            }
            return { canAccess: true, reason };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.SYNTHETICA_USE,
            scope: 'consumable',
          };
        }

        case 'cbt_stats': {
          if (entitlements.isSubscriber || entitlements.monthlyUnlocked.cbtStats) {
            const reason = entitlements.isSubscriber
              ? (entitlements.isTrialing ? 'trial' : 'subscribed')
              : 'purchased';
            return { canAccess: true, reason };
          }
          return {
            canAccess: false,
            needPurchase: true,
            price: PRICING.CBT_STATS_MONTHLY,
            scope: 'per_month',
          };
        }

        default:
          return { canAccess: false };
      }
    } catch (error) {
      console.error('Check access error:', error);
      // Return safe default instead of throwing
      return { canAccess: false };
    }
  }

  // 消耗权益
  async consumeFeature(
    userId: string | null,
    featureType: FeatureType,
    deviceFingerprint?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      if (!userId) {
        return true;
      }
      const devState = getOrCreateDevEntitlementState(userId);
      const weekStart = getWeekStart();
      const weekStartIso = weekStart.toISOString().split('T')[0];

      if (!devState.freeAskResetAt || new Date(devState.freeAskResetAt) < weekStart) {
        devState.freeAskUsed = 0;
        devState.freeAskResetAt = weekStart.toISOString();
      }

      if (devState.subscriptionWeekStart !== weekStartIso) {
        devState.subscriptionAskUsed = 0;
        devState.subscriptionSynastryUsed = 0;
        devState.subscriptionWeekStart = weekStartIso;
      }

      if (featureType === 'ask') {
        if (devState.freeAskUsed < FREE_TIER_LIMITS.ASK_QUESTIONS_PER_WEEK) {
          devState.freeAskUsed += 1;
          return true;
        }
        if (devState.isSubscriber && devState.subscriptionAskUsed < SUBSCRIPTION_BENEFITS.ASK_EXTRA_PER_WEEK) {
          devState.subscriptionAskUsed += 1;
          return true;
        }
        if (devState.askTokens > 0) {
          devState.askTokens = Math.max(0, devState.askTokens - 1);
          return true;
        }
        if (devState.gmCredits >= PRICING.ASK_SINGLE) {
          devState.gmCredits = Math.max(0, devState.gmCredits - PRICING.ASK_SINGLE);
          return true;
        }
        return false;
      }

      if (featureType === 'synastry') {
        if (devState.isSubscriber && devState.subscriptionSynastryUsed < SUBSCRIPTION_BENEFITS.SYNASTRY_EXTRA_PER_WEEK) {
          devState.subscriptionSynastryUsed += 1;
          return true;
        }
        if (devState.freeSynastryUsed < FREE_TIER_LIMITS.SYNASTRY_TOTAL) {
          devState.freeSynastryUsed += 1;
          return true;
        }
        return false;
      }

      if (featureType === 'synthetica') {
        if (!devState.syntheticaResetAt || new Date(devState.syntheticaResetAt) < getDayStart()) {
          devState.syntheticaUsed = 0;
          devState.syntheticaResetAt = getDayStart().toISOString();
        }
        const dailyLimit = FREE_TIER_LIMITS.SYNTHETICA_DAILY
          + (devState.isSubscriber ? SUBSCRIPTION_BENEFITS.SYNTHETICA_EXTRA_PER_DAY : 0);
        if (devState.syntheticaUsed < dailyLimit) {
          devState.syntheticaUsed += 1;
          return true;
        }
        if (devState.syntheticaTokens > 0) {
          devState.syntheticaTokens = Math.max(0, devState.syntheticaTokens - 1);
          return true;
        }
        if (devState.gmCredits >= PRICING.SYNTHETICA_USE) {
          devState.gmCredits = Math.max(0, devState.gmCredits - PRICING.SYNTHETICA_USE);
          return true;
        }
        return false;
      }

      return true;
    }

    const entitlements = await this.getEntitlements(userId, deviceFingerprint);

    if (featureType === 'ask') {
      if (entitlements.ask.freeLeft > 0) {
        return this.consumeFreeAsk(userId, deviceFingerprint);
      }
      if (entitlements.isSubscriber && entitlements.ask.subscriptionLeft > 0) {
        return this.consumeSubscriptionAsk(userId!);
      }
      if (userId && entitlements.ask.purchasedLeft > 0) {
        return this.consumeConsumableRecord(userId, 'ask');
      }
      if (userId && entitlements.credits >= PRICING.ASK_SINGLE) {
        return this.consumeConsumableRecord(userId, 'gm_credit', PRICING.ASK_SINGLE);
      }
      return false;
    }

    if (featureType === 'synastry') {
      if (entitlements.isSubscriber && entitlements.synastry.subscriptionLeft > 0) {
        return this.consumeSubscriptionSynastry(userId!);
      }
      if (entitlements.synastry.freeLeft > 0) {
        return this.consumeFreeSynastry(userId, deviceFingerprint);
      }
      return false;
    }

    if (featureType === 'synthetica') {
      if (entitlements.synthetica.freeLeft > 0 || entitlements.synthetica.subscriptionLeft > 0) {
        return this.consumeFreeSynthetica(userId, deviceFingerprint);
      }
      if (userId && entitlements.synthetica.purchasedLeft > 0) {
        return this.consumeConsumableRecord(userId, 'synthetica');
      }
      if (userId && entitlements.credits >= PRICING.SYNTHETICA_USE) {
        return this.consumeConsumableRecord(userId, 'gm_credit', PRICING.SYNTHETICA_USE);
      }
      return false;
    }

    // 订阅用户的无限权益
    if (entitlements.isSubscriber) {
      return true;
    }

    return false;
  }

  // =====================================================
  // 私有方法
  // =====================================================

  private async getUser(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('trial_ends_at')
      .eq('id', userId)
      .single();
    return data;
  }

  private async getFreeUsage(deviceFingerprint: string): Promise<DbFreeUsage | null> {
    const { data } = await supabase
      .from('free_usage')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .single();
    return data as DbFreeUsage | null;
  }

  private async getFreeUsageByUserId(userId: string): Promise<DbFreeUsage | null> {
    const { data } = await supabase
      .from('free_usage')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data as DbFreeUsage | null;
  }

  private async getOrCreateFreeUsageForUser(
    userId: string,
    deviceFingerprint?: string,
    ipAddress?: string
  ): Promise<DbFreeUsage> {
    // 1. Try to get existing usage
    let existing = await this.getFreeUsageByUserId(userId);
    if (existing) {
      return existing;
    }

    // ... (logic to migrate device usage if needed) ...
    let deviceUsage: DbFreeUsage | null = null;
    if (deviceFingerprint) {
      deviceUsage = await this.getFreeUsage(deviceFingerprint);
      if (deviceUsage && (!deviceUsage.user_id || deviceUsage.user_id === userId)) {
        try {
          const { data, error } = await supabase
            .from('free_usage')
            .update({ user_id: userId })
            .eq('id', deviceUsage.id)
            .select()
            .single();
          if (!error && data) {
            return data as DbFreeUsage;
          }
        } catch (e) {
          // Update failed, possibly race condition or row deleted. Proceed to create new.
        }
      }
    }

    const weekStart = getWeekStart();
    const dayStart = getDayStart();
    const fingerprintValue = deviceUsage && deviceUsage.user_id && deviceUsage.user_id !== userId
      ? null
      : (deviceFingerprint || null);

    // 2. Try to insert new usage
    try {
      const { data, error } = await supabase
        .from('free_usage')
        .insert({
          user_id: userId,
          device_fingerprint: fingerprintValue,
          ip_address: ipAddress || null,
          ask_reset_at: weekStart.toISOString(),
          synthetica_reset_at: dayStart.toISOString(),
          synastry_total_used: 0,
          synthetica_used: 0,
        })
        .select()
        .single();

      if (error) {
        // If error is unique constraint violation, it means another request created it concurrently
        if (error.code === '23505') { // Postgres unique_violation
           // 3. Retry fetching existing usage
           existing = await this.getFreeUsageByUserId(userId);
           if (existing) return existing;
        }
        throw new Error(`Failed to create free usage record: ${error.message}`);
      }
      return data as DbFreeUsage;
    } catch (e) {
      // General error handling - attempt one last fetch just in case
      existing = await this.getFreeUsageByUserId(userId);
      if (existing) return existing;
      throw e;
    }
  }

  private async getOrCreateFreeUsageForDevice(deviceFingerprint: string, ipAddress?: string): Promise<DbFreeUsage> {
    let freeUsage = await this.getFreeUsage(deviceFingerprint);

    if (!freeUsage) {
      const weekStart = getWeekStart();
      const dayStart = getDayStart();
      
      try {
        const { data, error } = await supabase
          .from('free_usage')
          .insert({
            device_fingerprint: deviceFingerprint,
            ip_address: ipAddress || null,
            ask_reset_at: weekStart.toISOString(),
            synthetica_reset_at: dayStart.toISOString(),
            synastry_total_used: 0,
            synthetica_used: 0,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // unique_violation
             // Retry fetch
             freeUsage = await this.getFreeUsage(deviceFingerprint);
             if (freeUsage) return freeUsage;
          }
          throw new Error(`Failed to create free usage record: ${error.message}`);
        }
        return data as DbFreeUsage;
      } catch (e) {
        // Retry fetch
        freeUsage = await this.getFreeUsage(deviceFingerprint);
        if (freeUsage) return freeUsage;
        throw e;
      }
    }

    return freeUsage;
  }

  private async resetWeeklyFreeUsage(freeUsageId: string): Promise<void> {
    const weekStart = getWeekStart();
    await supabase
      .from('free_usage')
      .update({
        ask_used: 0,
        ask_reset_at: weekStart.toISOString(),
      })
      .eq('id', freeUsageId);
  }

  private async resetDailySyntheticaUsage(freeUsageId: string): Promise<void> {
    const dayStart = getDayStart();
    await supabase
      .from('free_usage')
      .update({
        synthetica_used: 0,
        synthetica_reset_at: dayStart.toISOString(),
      })
      .eq('id', freeUsageId);
  }

  private async getOrCreateSubscriptionUsage(userId: string, weekStart: Date): Promise<DbSubscriptionUsage> {
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .single();

    if (existing) {
      return existing as DbSubscriptionUsage;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_usage')
        .insert({
          user_id: userId,
          week_start: weekStartStr,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // unique_violation
           // Retry fetch
           const { data: retryData } = await supabase
            .from('subscription_usage')
            .select('*')
            .eq('user_id', userId)
            .eq('week_start', weekStartStr)
            .single();
           
           if (retryData) return retryData as DbSubscriptionUsage;
        }
        throw new Error(`Failed to create subscription usage: ${error.message}`);
      }
      return data as DbSubscriptionUsage;
    } catch (e) {
      // Retry fetch
      const { data: retryData } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStartStr)
        .single();
        
      if (retryData) return retryData as DbSubscriptionUsage;
      throw e;
    }
  }

  private async getPurchaseRecords(userId: string): Promise<DbPurchaseRecord[]> {
    const { data } = await supabase
      .from('purchase_records')
      .select('*')
      .eq('user_id', userId);

    return (data || []) as DbPurchaseRecord[];
  }

  private async checkDailyPurchase(
    userId: string | null,
    featureType: string,
    date: string
  ): Promise<boolean> {
    if (!userId) return false;

    const { data } = await supabase
      .from('purchase_records')
      .select('id')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .eq('feature_id', date)
      .eq('scope', 'daily')
      .single();

    return !!data;
  }

  private async consumeFreeAsk(userId: string | null, deviceFingerprint?: string): Promise<boolean> {
    const freeUsage = userId
      ? await this.getOrCreateFreeUsageForUser(userId, deviceFingerprint)
      : (deviceFingerprint ? await this.getOrCreateFreeUsageForDevice(deviceFingerprint) : null);
    if (!freeUsage) return false;

    const { error } = await supabase
      .from('free_usage')
      .update({ ask_used: freeUsage.ask_used + 1 })
      .eq('id', freeUsage.id);

    return !error;
  }

  private async consumeFreeSynthetica(userId: string | null, deviceFingerprint?: string): Promise<boolean> {
    const freeUsage = userId
      ? await this.getOrCreateFreeUsageForUser(userId, deviceFingerprint)
      : (deviceFingerprint ? await this.getOrCreateFreeUsageForDevice(deviceFingerprint) : null);
    if (!freeUsage) return false;

    const { error } = await supabase
      .from('free_usage')
      .update({ synthetica_used: (freeUsage.synthetica_used || 0) + 1 })
      .eq('id', freeUsage.id);

    return !error;
  }

  private async consumeSubscriptionAsk(userId: string): Promise<boolean> {
    const weekStart = getWeekStart();
    const usage = await this.getOrCreateSubscriptionUsage(userId, weekStart);

    const { error } = await supabase
      .from('subscription_usage')
      .update({ ask_used: usage.ask_used + 1 })
      .eq('id', usage.id);

    return !error;
  }

  private async consumeFreeSynastry(userId: string | null, deviceFingerprint?: string): Promise<boolean> {
    const freeUsage = userId
      ? await this.getOrCreateFreeUsageForUser(userId, deviceFingerprint)
      : (deviceFingerprint ? await this.getOrCreateFreeUsageForDevice(deviceFingerprint) : null);
    if (!freeUsage) return false;

    const { error } = await supabase
      .from('free_usage')
      .update({ synastry_total_used: (freeUsage.synastry_total_used || 0) + 1 })
      .eq('id', freeUsage.id);

    return !error;
  }

  private async consumeSubscriptionSynastry(userId: string): Promise<boolean> {
    const weekStart = getWeekStart();
    const usage = await this.getOrCreateSubscriptionUsage(userId, weekStart);

    const { error } = await supabase
      .from('subscription_usage')
      .update({ synastry_used: usage.synastry_used + 1 })
      .eq('id', usage.id);

    return !error;
  }

  private async consumeConsumableRecord(
    userId: string,
    featureType: string,
    quantity = 1
  ): Promise<boolean> {
    const { data } = await supabase
      .from('purchase_records')
      .select('id, quantity, consumed')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .eq('scope', 'consumable')
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) {
      return false;
    }

    let remainingToConsume = quantity;

    for (const record of data) {
      const available = Math.max(0, (record.quantity || 0) - (record.consumed || 0));
      if (available <= 0) {
        continue;
      }
      const consumeNow = Math.min(available, remainingToConsume);
      const { error } = await supabase
        .from('purchase_records')
        .update({ consumed: (record.consumed || 0) + consumeNow })
        .eq('id', record.id);
      if (error) {
        return false;
      }
      remainingToConsume -= consumeNow;
      if (remainingToConsume <= 0) {
        return true;
      }
    }

    return false;
  }

  // =====================================================
  // 合盘相关方法
  // =====================================================

  // 检查合盘是否已存在
  async checkSynastryHash(
    userId: string,
    personA: SynastryPersonInfo,
    personB: SynastryPersonInfo,
    relationshipType: string
  ): Promise<{
    exists: boolean;
    hash: string;
    record?: DbSynastryRecord;
  }> {
    const hash = generateSynastryHash(personA, personB, relationshipType);

    const { data } = await supabase
      .from('synastry_records')
      .select('*')
      .eq('user_id', userId)
      .eq('synastry_hash', hash)
      .single();

    return {
      exists: !!data,
      hash,
      record: data as DbSynastryRecord | undefined,
    };
  }

  // 记录合盘使用
  async recordSynastryUsage(
    userId: string,
    personA: SynastryPersonInfo,
    personB: SynastryPersonInfo,
    relationshipType: string,
    isFree: boolean
  ): Promise<DbSynastryRecord> {
    const hash = generateSynastryHash(personA, personB, relationshipType);

    const { data, error } = await supabase
      .from('synastry_records')
      .insert({
        user_id: userId,
        synastry_hash: hash,
        person_a_info: personA,
        person_b_info: personB,
        relationship_type: relationshipType,
        is_free: isFree,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record synastry: ${error.message}`);
    return data as DbSynastryRecord;
  }

  // =====================================================
  // 购买记录方法
  // =====================================================

  async purchaseWithCredits(
    userId: string,
    featureType: PurchaseFeatureType,
    featureId: string | null,
    scope: PurchaseScope,
    priceCents: number
  ): Promise<DbPurchaseRecord | null> {
    if (!isSupabaseConfigured()) {
      const devState = ensureDevCollections(getOrCreateDevEntitlementState(userId));
      if (priceCents > 0 && devState.gmCredits < priceCents) {
        return null;
      }
      if (priceCents > 0) {
        devState.gmCredits = Math.max(0, devState.gmCredits - priceCents);
      }
      applyDevPurchase(devState, featureType, featureId, scope);

      const now = new Date();
      let validUntil: string | null = null;
      if (scope === 'daily') {
        const endOfDay = new Date(now);
        endOfDay.setUTCHours(23, 59, 59, 999);
        validUntil = endOfDay.toISOString();
      } else if (scope === 'per_month') {
        const endOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999);
        validUntil = endOfMonth.toISOString();
      }

      return {
        id: `dev_${Date.now()}`,
        user_id: userId,
        feature_type: featureType,
        feature_id: featureId,
        scope,
        price_cents: priceCents,
        stripe_payment_intent_id: null,
        stripe_checkout_session_id: null,
        valid_until: validUntil,
        quantity: 1,
        consumed: 0,
        created_at: now.toISOString(),
      } as DbPurchaseRecord;
    }

    if (priceCents <= 0) {
      return this.recordPurchase(userId, featureType, featureId, scope, priceCents);
    }

    const consumed = await this.consumeConsumableRecord(userId, 'gm_credit', priceCents);
    if (!consumed) {
      return null;
    }

    return this.recordPurchase(userId, featureType, featureId, scope, priceCents);
  }

  // 记录购买
  async recordPurchase(
    userId: string,
    featureType: PurchaseFeatureType,
    featureId: string | null,
    scope: PurchaseScope,
    priceCents: number,
    stripePaymentIntentId?: string,
    stripeCheckoutSessionId?: string
  ): Promise<DbPurchaseRecord> {
    let validUntil: string | null = null;
    const now = new Date();

    // 设置有效期
    if (scope === 'daily') {
      const endOfDay = new Date(now);
      endOfDay.setUTCHours(23, 59, 59, 999);
      validUntil = endOfDay.toISOString();
    } else if (scope === 'per_month') {
      const endOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999);
      validUntil = endOfMonth.toISOString();
    }

    const payload: Record<string, unknown> = {
      user_id: userId,
      feature_type: featureType,
      feature_id: featureId,
      scope,
      price_cents: priceCents,
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      valid_until: validUntil,
    };

    if (scope === 'consumable') {
      payload.quantity = 1;
      payload.consumed = 0;
    }

    const { data, error } = await supabase
      .from('purchase_records')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Failed to record purchase: ${error.message}`);
    return data as DbPurchaseRecord;
  }

  // 获取用户购买记录
  async getUserPurchases(userId: string): Promise<DbPurchaseRecord[]> {
    const { data } = await supabase
      .from('purchase_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return (data || []) as DbPurchaseRecord[];
  }
}

export const entitlementServiceV2 = new EntitlementServiceV2();
export default entitlementServiceV2;

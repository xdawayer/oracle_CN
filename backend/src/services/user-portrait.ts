/**
 * 用户画像服务
 *
 * 从 natal-overview 输出中提取核心特征，缓存供跨模块使用
 */

import { cacheService } from '../cache/redis.js';
import { hashInput } from '../prompts/index.js';
import { calculateWuxingBalance } from '../prompts/cultural/wuxing.js';

/** 用户画像 */
export interface UserPortrait {
  /** 核心特质（最多3条） */
  coreTraits: string[];
  /** 关键模式（最多3条） */
  keyPatterns: string[];
  /** 成长主题（最多2条） */
  growthThemes: string[];
  /** 五行平衡（如 "火旺水弱"） */
  wuxingBalance?: string;
}

/** 画像缓存 TTL（7天，与 natal 缓存一致） */
const PORTRAIT_TTL = 7 * 24 * 60 * 60;

/** 缓存 key 前缀 */
const PORTRAIT_PREFIX = 'portrait:';

/**
 * 构建画像缓存 key
 */
function buildPortraitKey(birthHash: string): string {
  return `${PORTRAIT_PREFIX}${birthHash}`;
}

/**
 * 从 natal-overview AI 输出中提取用户画像
 *
 * natal-overview 输出格式:
 * {
 *   sun: { title, keywords, description },
 *   moon: { title, keywords, description },
 *   rising: { title, keywords, description },
 *   core_melody: { keywords, explanations },
 *   top_talent: { title, example, advice },
 *   top_pitfall: { title, triggers, protection },
 *   ...
 * }
 */
export function extractPortrait(natalOutput: Record<string, any>): UserPortrait {
  const coreTraits: string[] = [];
  const keyPatterns: string[] = [];
  const growthThemes: string[] = [];

  // 从 sun/moon/rising 提取核心特质
  if (natalOutput.sun?.keywords) {
    coreTraits.push(natalOutput.sun.keywords.slice(0, 2).join('/'));
  }
  if (natalOutput.moon?.keywords) {
    coreTraits.push(`情绪面：${natalOutput.moon.keywords[0] || ''}`);
  }
  if (natalOutput.rising?.keywords) {
    coreTraits.push(`外在：${natalOutput.rising.keywords[0] || ''}`);
  }

  // 从 core_melody 提取关键模式
  if (natalOutput.core_melody?.keywords) {
    keyPatterns.push(...natalOutput.core_melody.keywords.slice(0, 2));
  }
  if (natalOutput.top_talent?.title) {
    keyPatterns.push(`天赋：${natalOutput.top_talent.title}`);
  }

  // 从 top_pitfall 提取成长主题
  if (natalOutput.top_pitfall?.title) {
    growthThemes.push(`留意：${natalOutput.top_pitfall.title}`);
  }
  if (natalOutput.trigger_card?.inner_need) {
    growthThemes.push(`内在需求：${natalOutput.trigger_card.inner_need}`);
  }

  // 从输出中提取行星星座信息，计算五行平衡
  let wuxingBalance: string | undefined;
  try {
    const planetSigns: Record<string, string> = {};
    if (natalOutput.sun?.sign) planetSigns.sun = natalOutput.sun.sign;
    if (natalOutput.moon?.sign) planetSigns.moon = natalOutput.moon.sign;
    if (natalOutput.rising?.sign) planetSigns.rising = natalOutput.rising.sign;
    if (Object.keys(planetSigns).length >= 2) {
      const balance = calculateWuxingBalance(planetSigns);
      wuxingBalance = balance.summary;
    }
  } catch {
    // 五行计算失败不影响画像提取
  }

  return {
    coreTraits: coreTraits.slice(0, 3),
    keyPatterns: keyPatterns.slice(0, 3),
    growthThemes: growthThemes.slice(0, 2),
    wuxingBalance,
  };
}

/**
 * 将画像保存到缓存
 */
export async function savePortrait(birthData: Record<string, unknown>, portrait: UserPortrait): Promise<void> {
  const birthHash = hashInput(birthData);
  const key = buildPortraitKey(birthHash);
  await cacheService.set(key, portrait, PORTRAIT_TTL);
}

/**
 * 从缓存获取画像
 */
export async function getPortrait(birthData: Record<string, unknown>): Promise<UserPortrait | null> {
  const birthHash = hashInput(birthData);
  const key = buildPortraitKey(birthHash);
  return cacheService.get<UserPortrait>(key);
}

/**
 * 将画像转为紧凑字符串（用于注入 prompt）
 *
 * 输出示例: "画像：想太多/完美主义｜情绪面：敏感细腻｜外在：温和可靠｜天赋：共情力强｜留意：过度内耗"
 */
export function compactPortrait(portrait: UserPortrait): string {
  const parts: string[] = [];

  if (portrait.coreTraits.length > 0) {
    parts.push(portrait.coreTraits.join('｜'));
  }
  if (portrait.keyPatterns.length > 0) {
    parts.push(portrait.keyPatterns.join('｜'));
  }
  if (portrait.growthThemes.length > 0) {
    parts.push(portrait.growthThemes.join('｜'));
  }
  if (portrait.wuxingBalance) {
    parts.push(`五行：${portrait.wuxingBalance}`);
  }

  return parts.length > 0 ? `画像：${parts.join('｜')}` : '';
}

/**
 * 从缓存获取紧凑画像字符串（一步到位）
 *
 * 如果缓存不存在，返回空字符串
 */
export async function getCompactPortrait(birthData: Record<string, unknown>): Promise<string> {
  const portrait = await getPortrait(birthData);
  if (!portrait) return '';
  return compactPortrait(portrait);
}

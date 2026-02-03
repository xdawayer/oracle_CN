/**
 * Prompt 缓存工具
 *
 * 提供缓存 key 生成和 TTL 配置
 */

import { createHash } from 'crypto';
import type { PromptModule } from './types';

/** 缓存 TTL 配置（秒） */
export const CACHE_TTL: Record<PromptModule | 'default', number> = {
  daily: 24 * 60 * 60,      // 24 小时
  natal: 7 * 24 * 60 * 60,  // 7 天
  'natal-report': 90 * 24 * 60 * 60, // 90 天（本命深度解读）
  synastry: 30 * 24 * 60 * 60, // 30 天
  cbt: 0,                   // 不缓存
  ask: 0,                   // 不缓存
  synthetica: 24 * 60 * 60, // 24 小时
  kline: 7 * 24 * 60 * 60,  // 7 天
  wiki: 24 * 60 * 60,       // 24 小时
  annual: 30 * 24 * 60 * 60, // 30 天（流年运势）
  monthly: 30 * 24 * 60 * 60, // 30 天（月度运势深度解读）
  'love-topic': 90 * 24 * 60 * 60,   // 90 天（爱情专题）
  'career-topic': 90 * 24 * 60 * 60, // 90 天（事业专题）
  'wealth-topic': 90 * 24 * 60 * 60, // 90 天（财富专题）
  default: 60 * 60,         // 默认 1 小时
};

/**
 * 生成输入内容的哈希值
 *
 * @param input 任意输入对象
 * @returns 8 位 MD5 哈希
 */
export function hashInput(input: unknown): string {
  const str = JSON.stringify(input, Object.keys(input as object).sort());
  return createHash('md5').update(str).digest('hex').slice(0, 16);
}

/**
 * 构建缓存 Key
 *
 * 格式：ai:{promptId}:v{version}:{inputHash}
 *
 * @param promptId Prompt ID
 * @param version Prompt 版本
 * @param inputHash 输入哈希
 * @returns 缓存 key
 */
export function buildCacheKey(
  promptId: string,
  version: string,
  inputHash: string
): string {
  return `ai:${promptId}:v${version}:${inputHash}`;
}

/**
 * 获取模块的缓存 TTL
 *
 * @param module Prompt 模块
 * @returns TTL 秒数，0 表示不缓存
 */
export function getCacheTTL(module: PromptModule): number {
  return CACHE_TTL[module] ?? CACHE_TTL.default;
}

/**
 * 判断是否应该缓存
 *
 * @param module Prompt 模块
 * @returns 是否应该缓存
 */
export function shouldCache(module: PromptModule): boolean {
  return getCacheTTL(module) > 0;
}

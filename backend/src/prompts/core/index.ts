/**
 * Prompt 核心层
 *
 * 提供类型定义、注册表、构建器和缓存工具
 */

// === 类型导出 ===
export type {
  // 元数据
  PromptMeta,
  PromptModule,
  PromptPriority,
  // 上下文
  PromptContext,
  ChartSummary,
  ChartData,
  TransitSummary,
  TransitAspect,
  SpecialEvents,
  SynastrySignals,
  RelationshipType,
  CBTRecord,
  PeriodStats,
  Message,
  SyntheticaConfig,
  // 文化配置
  CulturalConfig,
  PlanetMetaphor,
  AspectMetaphor,
  HouseMetaphor,
  // 模板
  PromptTemplate,
  PromptSystem,
  BuildResult,
} from './types';

// === 注册表 ===
export { registry, PromptRegistry } from './registry';

// === 构建器 ===
export {
  buildPrompt,
  buildPrompts,
  getPromptVersion,
  hasPrompt,
  getCulturalContext,
  BASE_SYSTEM,
} from './builder';

// === 紧凑序列化工具 ===
export {
  compactChartSummary,
  compactTransitSummary,
  compactSynastrySignals,
  compactCBTRecord,
  compactData,
} from './compact';

// === 缓存工具 ===
export {
  CACHE_TTL,
  hashInput,
  buildCacheKey,
  getCacheTTL,
  shouldCache,
} from './cache';

// === 便捷函数 ===

import { registry } from './registry';
import type { PromptTemplate } from './types';

/**
 * 注册 Prompt（便捷函数）
 */
export function registerPrompt(template: PromptTemplate): void {
  registry.register(template);
}

/**
 * 获取 Prompt（便捷函数）
 */
export function getPrompt(id: string): PromptTemplate | undefined {
  return registry.get(id);
}

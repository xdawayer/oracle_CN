/**
 * 爱情专题深度报告 Prompt 模板
 *
 * 包含 4 个模块：
 * - personality: 恋爱人格画像 (P0)
 * - partner: 理想伴侣与关系模式 (P0)
 * - growth: 关系成长课题 (P0)
 * - forecast: 未来12个月感情运势 (P0)
 */

import type { PromptTemplate } from '../../core/types';

// === 导入各模块模板 ===
import { loveTopicPersonalityPrompt } from './personality';
import { loveTopicPartnerPrompt } from './partner';
import { loveTopicGrowthPrompt } from './growth';
import { loveTopicForecastPrompt } from './forecast';

// === 导出系统配置 ===
export {
  LOVE_TOPIC_SYSTEM_PROMPT,
  LOVE_TOPIC_OUTPUT_INSTRUCTION,
  buildTransitText,
} from './system';

// === 模块 ID 定义 ===
export const LOVE_TOPIC_MODULE_IDS = [
  'personality',
  'partner',
  'growth',
  'forecast',
] as const;

export type LoveTopicModuleId = (typeof LOVE_TOPIC_MODULE_IDS)[number];

/** 模块元数据 */
export const LOVE_TOPIC_MODULE_META: Record<LoveTopicModuleId, { name: string; wordCount: string; order: number }> = {
  personality: { name: '恋爱人格画像', wordCount: '700-900字', order: 1 },
  partner:     { name: '理想伴侣与关系模式', wordCount: '800-1000字', order: 2 },
  growth:      { name: '关系成长课题', wordCount: '600-800字', order: 3 },
  forecast:    { name: '未来12个月感情运势', wordCount: '600-800字', order: 4 },
};

/**
 * 模块生成优先级配置（3 批次）
 *
 * 编排逻辑：
 * batch1: personality 独立生成 → 提取摘要注入 _seedSummary
 * batch2: partner + growth 并行（共享 personality 摘要用于过渡衔接）
 * batch3: forecast 收尾（通过 _allModuleSummary 获得前 3 模块汇总）
 */
export const LOVE_TOPIC_MODULE_PRIORITY = {
  batch1: ['personality'],
  batch2: ['partner', 'growth'],
  batch3: ['forecast'],
};

// === 重新导出所有模板 ===
export { loveTopicPersonalityPrompt } from './personality';
export { loveTopicPartnerPrompt } from './partner';
export { loveTopicGrowthPrompt } from './growth';
export { loveTopicForecastPrompt } from './forecast';

/** 所有爱情专题 Prompt 列表 */
export const loveTopicPrompts: PromptTemplate[] = [
  loveTopicPersonalityPrompt,
  loveTopicPartnerPrompt,
  loveTopicGrowthPrompt,
  loveTopicForecastPrompt,
];

/** 模块 ID 到 Prompt 的映射 */
export const loveTopicPromptMap: Record<LoveTopicModuleId, PromptTemplate> = {
  personality: loveTopicPersonalityPrompt,
  partner: loveTopicPartnerPrompt,
  growth: loveTopicGrowthPrompt,
  forecast: loveTopicForecastPrompt,
};

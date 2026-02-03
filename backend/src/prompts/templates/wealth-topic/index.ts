/**
 * 财富专题深度报告 Prompt 模板
 *
 * 包含 4 个模块：
 * - money-relation: 你与金钱的关系 (P0)
 * - potential: 财富潜力与增长路径 (P0)
 * - blindspot: 金钱盲区与理财建议 (P0)
 * - forecast: 未来12个月财富运势 (P0)
 */

import type { PromptTemplate } from '../../core/types';

// === 导入各模块模板 ===
import { wealthTopicMoneyRelationPrompt } from './money-relation';
import { wealthTopicPotentialPrompt } from './potential';
import { wealthTopicBlindspotPrompt } from './blindspot';
import { wealthTopicForecastPrompt } from './forecast';

// === 导出系统配置 ===
export {
  WEALTH_TOPIC_SYSTEM_PROMPT,
  WEALTH_TOPIC_OUTPUT_INSTRUCTION,
  buildTransitText,
} from './system';

// === 模块 ID 定义 ===
export const WEALTH_TOPIC_MODULE_IDS = [
  'money-relation',
  'potential',
  'blindspot',
  'forecast',
] as const;

export type WealthTopicModuleId = (typeof WEALTH_TOPIC_MODULE_IDS)[number];

/** 模块元数据 */
export const WEALTH_TOPIC_MODULE_META: Record<WealthTopicModuleId, { name: string; wordCount: string; order: number }> = {
  'money-relation': { name: '你与金钱的关系', wordCount: '700-900字', order: 1 },
  potential:        { name: '财富潜力与增长路径', wordCount: '700-900字', order: 2 },
  blindspot:        { name: '金钱盲区与理财建议', wordCount: '600-800字', order: 3 },
  forecast:         { name: '未来12个月财富运势', wordCount: '500-700字', order: 4 },
};

/**
 * 模块生成优先级配置（3 批次）
 *
 * 编排逻辑：
 * batch1: money-relation 独立生成 → 提取摘要注入 _seedSummary
 * batch2: potential + blindspot 并行（共享 money-relation 摘要用于过渡衔接）
 * batch3: forecast 收尾（通过 _allModuleSummary 获得前 3 模块汇总）
 */
export const WEALTH_TOPIC_MODULE_PRIORITY = {
  batch1: ['money-relation'],
  batch2: ['potential', 'blindspot'],
  batch3: ['forecast'],
};

// === 重新导出所有模板 ===
export { wealthTopicMoneyRelationPrompt } from './money-relation';
export { wealthTopicPotentialPrompt } from './potential';
export { wealthTopicBlindspotPrompt } from './blindspot';
export { wealthTopicForecastPrompt } from './forecast';

/** 所有财富专题 Prompt 列表 */
export const wealthTopicPrompts: PromptTemplate[] = [
  wealthTopicMoneyRelationPrompt,
  wealthTopicPotentialPrompt,
  wealthTopicBlindspotPrompt,
  wealthTopicForecastPrompt,
];

/** 模块 ID 到 Prompt 的映射 */
export const wealthTopicPromptMap: Record<WealthTopicModuleId, PromptTemplate> = {
  'money-relation': wealthTopicMoneyRelationPrompt,
  potential: wealthTopicPotentialPrompt,
  blindspot: wealthTopicBlindspotPrompt,
  forecast: wealthTopicForecastPrompt,
};

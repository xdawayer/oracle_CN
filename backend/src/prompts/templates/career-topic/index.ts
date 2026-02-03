/**
 * 事业专题深度报告 Prompt 模板
 *
 * 包含 4 个模块：
 * - talent: 天赋与职业方向 (P0)
 * - workplace: 职场人际与领导力 (P0)
 * - mission: 人生使命与蜕变 (P0)
 * - forecast: 未来12个月事业运势 (P0)
 */

import type { PromptTemplate } from '../../core/types';

// === 导入各模块模板 ===
import { careerTopicTalentPrompt } from './talent';
import { careerTopicWorkplacePrompt } from './workplace';
import { careerTopicMissionPrompt } from './mission';
import { careerTopicForecastPrompt } from './forecast';

// === 导出系统配置 ===
export {
  CAREER_TOPIC_SYSTEM_PROMPT,
  CAREER_TOPIC_OUTPUT_INSTRUCTION,
  buildTransitText,
} from './system';

// === 模块 ID 定义 ===
export const CAREER_TOPIC_MODULE_IDS = [
  'talent',
  'workplace',
  'mission',
  'forecast',
] as const;

export type CareerTopicModuleId = (typeof CAREER_TOPIC_MODULE_IDS)[number];

/** 模块元数据 */
export const CAREER_TOPIC_MODULE_META: Record<CareerTopicModuleId, { name: string; wordCount: string; order: number }> = {
  talent:    { name: '天赋与职业方向', wordCount: '900-1200字', order: 1 },
  workplace: { name: '职场人际与领导力', wordCount: '500-700字', order: 2 },
  mission:   { name: '人生使命与蜕变', wordCount: '600-800字', order: 3 },
  forecast:  { name: '未来12个月事业运势', wordCount: '600-800字', order: 4 },
};

/**
 * 模块生成优先级配置（3 批次）
 *
 * 编排逻辑：
 * batch1: talent 独立生成 → 提取摘要注入 _seedSummary
 * batch2: workplace + mission 并行（共享 talent 摘要用于过渡衔接）
 * batch3: forecast 收尾（通过 _allModuleSummary 获得前 3 模块汇总）
 */
export const CAREER_TOPIC_MODULE_PRIORITY = {
  batch1: ['talent'],
  batch2: ['workplace', 'mission'],
  batch3: ['forecast'],
};

// === 重新导出所有模板 ===
export { careerTopicTalentPrompt } from './talent';
export { careerTopicWorkplacePrompt } from './workplace';
export { careerTopicMissionPrompt } from './mission';
export { careerTopicForecastPrompt } from './forecast';

/** 所有事业专题 Prompt 列表 */
export const careerTopicPrompts: PromptTemplate[] = [
  careerTopicTalentPrompt,
  careerTopicWorkplacePrompt,
  careerTopicMissionPrompt,
  careerTopicForecastPrompt,
];

/** 模块 ID 到 Prompt 的映射 */
export const careerTopicPromptMap: Record<CareerTopicModuleId, PromptTemplate> = {
  talent: careerTopicTalentPrompt,
  workplace: careerTopicWorkplacePrompt,
  mission: careerTopicMissionPrompt,
  forecast: careerTopicForecastPrompt,
};

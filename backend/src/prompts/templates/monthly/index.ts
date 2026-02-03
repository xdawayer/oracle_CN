/**
 * 月度运势深度解读 Prompt 模板
 *
 * 包含 6 个模块：
 * - tone: 月度总基调 (P0)
 * - dimensions: 分维度运势 (P0)
 * - rhythm: 上中下旬节奏指南 (P1)
 * - lunar: 新月/满月指南 (P1)
 * - dates: 关键日期速查表 (P1)
 * - actions: 月度行动清单 (P0)
 */

import type { PromptTemplate } from '../../core/types';

// === 导入各模块模板 ===
import { monthlyTonePrompt } from './tone';
import { monthlyDimensionsPrompt } from './dimensions';
import { monthlyRhythmPrompt } from './rhythm';
import { monthlyLunarPrompt } from './lunar';
import { monthlyDatesPrompt } from './dates';
import { monthlyActionsPrompt } from './actions';

// === 导出系统配置 ===
export {
  MONTHLY_REPORT_SYSTEM_PROMPT,
  MONTHLY_REPORT_OUTPUT_INSTRUCTION,
  buildTransitDataText,
  buildPreviousSummariesText,
} from './system';

// === 模块 ID 定义 ===
export const MONTHLY_MODULE_IDS = [
  'tone',
  'dimensions',
  'rhythm',
  'lunar',
  'dates',
  'actions',
] as const;

export type MonthlyModuleId = (typeof MONTHLY_MODULE_IDS)[number];

/** 模块元数据 */
export const MONTHLY_MODULE_META: Record<MonthlyModuleId, { name: string; wordCount: string; order: number }> = {
  tone:       { name: '月度总基调',       wordCount: '300-400字', order: 1 },
  dimensions: { name: '分维度运势',       wordCount: '1000-1500字', order: 2 },
  rhythm:     { name: '上中下旬节奏指南', wordCount: '600-800字', order: 3 },
  lunar:      { name: '新月满月指南',     wordCount: '600-800字', order: 4 },
  dates:      { name: '关键日期速查表',   wordCount: '表格', order: 5 },
  actions:    { name: '月度行动清单',     wordCount: '300-400字', order: 6 },
};

/** 模块生成优先级配置（3 批次） */
export const MONTHLY_MODULE_PRIORITY = {
  /** 第一批：立即启动 */
  batch1: ['tone'],
  /** 第二批：4 模块并行生成 */
  batch2: ['dimensions', 'rhythm', 'lunar', 'dates'],
  /** 第三批：收尾模块（需要前序所有摘要） */
  batch3: ['actions'],
};

// === 重新导出所有模板 ===
export { monthlyTonePrompt } from './tone';
export { monthlyDimensionsPrompt } from './dimensions';
export { monthlyRhythmPrompt } from './rhythm';
export { monthlyLunarPrompt } from './lunar';
export { monthlyDatesPrompt } from './dates';
export { monthlyActionsPrompt } from './actions';

/** 所有月度报告 Prompt 列表 */
export const monthlyPrompts: PromptTemplate[] = [
  monthlyTonePrompt,
  monthlyDimensionsPrompt,
  monthlyRhythmPrompt,
  monthlyLunarPrompt,
  monthlyDatesPrompt,
  monthlyActionsPrompt,
];

/** 模块 ID 到 Prompt 的映射 */
export const monthlyPromptMap: Record<MonthlyModuleId, PromptTemplate> = {
  tone: monthlyTonePrompt,
  dimensions: monthlyDimensionsPrompt,
  rhythm: monthlyRhythmPrompt,
  lunar: monthlyLunarPrompt,
  dates: monthlyDatesPrompt,
  actions: monthlyActionsPrompt,
};

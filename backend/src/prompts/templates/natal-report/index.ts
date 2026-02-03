/**
 * 本命深度解读 Prompt 模板
 *
 * 包含 8 个模块：
 * - overview: 星盘总览与人格画像 (P0)
 * - mind: 思维与沟通方式 (P1)
 * - emotion: 情感世界 (P0)
 * - love: 爱情与亲密关系 (P0)
 * - career: 事业与人生方向 (P0)
 * - wealth: 财富与金钱 (P1)
 * - health: 健康与精力 (P2)
 * - soul: 人生方向与成长 (P1)
 */

import type { PromptTemplate } from '../../core/types';

// === 导入各模块模板 ===
import { natalReportOverviewPrompt } from './overview';
import { natalReportMindPrompt } from './mind';
import { natalReportEmotionPrompt } from './emotion';
import { natalReportLovePrompt } from './love';
import { natalReportCareerPrompt } from './career';
import { natalReportWealthPrompt } from './wealth';
import { natalReportHealthPrompt } from './health';
import { natalReportSoulPrompt } from './soul';

// === 导出系统配置 ===
export {
  NATAL_REPORT_SYSTEM_PROMPT,
  NATAL_REPORT_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

// === 模块 ID 定义 ===
export const NATAL_REPORT_MODULE_IDS = [
  'overview',
  'mind',
  'emotion',
  'love',
  'career',
  'wealth',
  'health',
  'soul',
] as const;

export type NatalReportModuleId = (typeof NATAL_REPORT_MODULE_IDS)[number];

/** 模块元数据 */
export const NATAL_REPORT_MODULE_META: Record<NatalReportModuleId, { name: string; wordCount: string; order: number }> = {
  overview: { name: '星盘总览与人格画像', wordCount: '600-800字', order: 1 },
  mind:     { name: '思维与沟通方式', wordCount: '500-700字', order: 2 },
  emotion:  { name: '情感世界', wordCount: '600-800字', order: 3 },
  love:     { name: '爱情与亲密关系', wordCount: '800-1100字', order: 4 },
  career:   { name: '事业与人生方向', wordCount: '700-900字', order: 5 },
  wealth:   { name: '财富与金钱', wordCount: '500-700字', order: 6 },
  health:   { name: '健康与精力', wordCount: '400-600字', order: 7 },
  soul:     { name: '人生方向与成长', wordCount: '700-900字', order: 8 },
};

/** 模块生成优先级配置（3 批次，最大化并行） */
export const NATAL_REPORT_MODULE_PRIORITY = {
  /** 第一批：立即启动，让用户最快看到 */
  batch1: ['overview'],
  /** 第二批：6 模块全部并行生成 */
  batch2: ['love', 'career', 'emotion', 'mind', 'wealth', 'health'],
  /** 第三批：收尾模块（需要前序所有摘要） */
  batch3: ['soul'],
};

// === 重新导出所有模板 ===
export { natalReportOverviewPrompt } from './overview';
export { natalReportMindPrompt } from './mind';
export { natalReportEmotionPrompt } from './emotion';
export { natalReportLovePrompt } from './love';
export { natalReportCareerPrompt } from './career';
export { natalReportWealthPrompt } from './wealth';
export { natalReportHealthPrompt } from './health';
export { natalReportSoulPrompt } from './soul';

/** 所有本命深度解读 Prompt 列表 */
export const natalReportPrompts: PromptTemplate[] = [
  natalReportOverviewPrompt,
  natalReportMindPrompt,
  natalReportEmotionPrompt,
  natalReportLovePrompt,
  natalReportCareerPrompt,
  natalReportWealthPrompt,
  natalReportHealthPrompt,
  natalReportSoulPrompt,
];

/** 模块 ID 到 Prompt 的映射 */
export const natalReportPromptMap: Record<NatalReportModuleId, PromptTemplate> = {
  overview: natalReportOverviewPrompt,
  mind: natalReportMindPrompt,
  emotion: natalReportEmotionPrompt,
  love: natalReportLovePrompt,
  career: natalReportCareerPrompt,
  wealth: natalReportWealthPrompt,
  health: natalReportHealthPrompt,
  soul: natalReportSoulPrompt,
};

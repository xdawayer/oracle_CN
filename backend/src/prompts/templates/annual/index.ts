/**
 * 流年报告 Prompt 模板
 *
 * 包含 11 个模块：
 * - overview: 年度总览 (P0)
 * - career: 事业财运 (P0)
 * - love: 感情关系 (P0)
 * - health: 健康能量 (P1)
 * - social: 人际社交 (P1)
 * - growth: 学习成长 (P1)
 * - q1-q4: 季度详解 (P1/P2)
 * - lucky: 开运指南 (P2)
 */

import type { PromptTemplate } from '../../core/types';

// === 导入各模块模板 ===
import { annualOverviewPrompt } from './overview';
import { annualCareerPrompt } from './career';
import { annualLovePrompt } from './love';
import { annualHealthPrompt } from './health';
import { annualSocialPrompt } from './social';
import { annualGrowthPrompt } from './growth';
import { annualQ1Prompt, annualQ2Prompt, annualQ3Prompt, annualQ4Prompt } from './quarter';
import { annualLuckyPrompt } from './lucky';

// === 导出系统配置 ===
export { ASTRO_2026, ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

// === 模块 ID 定义 ===
export const ANNUAL_MODULE_IDS = [
  'overview',
  'career',
  'love',
  'health',
  'social',
  'growth',
  'q1',
  'q2',
  'q3',
  'q4',
  'lucky',
] as const;

export type AnnualModuleId = (typeof ANNUAL_MODULE_IDS)[number];

/** 模块元数据 */
export const ANNUAL_MODULE_META: Record<AnnualModuleId, { name: string; wordCount: string; order: number }> = {
  overview: { name: '年度总览', wordCount: '800-1000字', order: 1 },
  career: { name: '事业财运', wordCount: '1200-1500字', order: 2 },
  love: { name: '感情关系', wordCount: '1200-1500字', order: 3 },
  health: { name: '健康能量', wordCount: '800-1000字', order: 4 },
  social: { name: '人际社交', wordCount: '800-1000字', order: 5 },
  growth: { name: '学习成长', wordCount: '800-1000字', order: 6 },
  q1: { name: '第一季度详解', wordCount: '500-600字', order: 7 },
  q2: { name: '第二季度详解', wordCount: '500-600字', order: 8 },
  q3: { name: '第三季度详解', wordCount: '500-600字', order: 9 },
  q4: { name: '第四季度详解', wordCount: '500-600字', order: 10 },
  lucky: { name: '开运指南', wordCount: '600-800字', order: 11 },
};

/** 模块生成优先级配置 */
export const ANNUAL_MODULE_PRIORITY = {
  /** 第一批：立即启动，让用户最快看到内容 */
  batch1: ['overview'],
  /** 第二批：用户最关心的核心模块 */
  batch2: ['career', 'love', 'health'],
  /** 第三批：其他模块并行生成 */
  batch3: ['social', 'growth', 'q1', 'q2', 'q3', 'q4', 'lucky'],
};

// === 重新导出所有模板 ===
export { annualOverviewPrompt } from './overview';
export { annualCareerPrompt } from './career';
export { annualLovePrompt } from './love';
export { annualHealthPrompt } from './health';
export { annualSocialPrompt } from './social';
export { annualGrowthPrompt } from './growth';
export { annualQ1Prompt, annualQ2Prompt, annualQ3Prompt, annualQ4Prompt } from './quarter';
export { annualLuckyPrompt } from './lucky';

/** 所有流年 Prompt 列表 */
export const annualPrompts: PromptTemplate[] = [
  annualOverviewPrompt,
  annualCareerPrompt,
  annualLovePrompt,
  annualHealthPrompt,
  annualSocialPrompt,
  annualGrowthPrompt,
  annualQ1Prompt,
  annualQ2Prompt,
  annualQ3Prompt,
  annualQ4Prompt,
  annualLuckyPrompt,
];

/** 模块 ID 到 Prompt 的映射 */
export const annualPromptMap: Record<AnnualModuleId, PromptTemplate> = {
  overview: annualOverviewPrompt,
  career: annualCareerPrompt,
  love: annualLovePrompt,
  health: annualHealthPrompt,
  social: annualSocialPrompt,
  growth: annualGrowthPrompt,
  q1: annualQ1Prompt,
  q2: annualQ2Prompt,
  q3: annualQ3Prompt,
  q4: annualQ4Prompt,
  lucky: annualLuckyPrompt,
};

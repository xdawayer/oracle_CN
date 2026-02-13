// INPUT: 流年报告异步任务服务（薄封装层）。
// OUTPUT: 导出任务创建、状态查询、后台执行等功能（委托给通用 report-task）。
// POS: 流年报告任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import {
  createReportTask,
  getReportTaskStatus,
  getReportContent as getReportContentGeneric,
  retryReportTask,
  deleteReportTask,
  type ReportConfig,
  type ReportTask,
  type TaskStatus,
} from './report-task.js';
import {
  ANNUAL_MODULE_IDS,
  ANNUAL_MODULE_META,
} from '../prompts/templates/annual/index.js';
import type { BirthInput, Language } from '../types/api.js';

// ============================================================
// 向后兼容的类型导出
// ============================================================

/** 任务状态（向后兼容） */
export type { TaskStatus };

/** 任务数据结构（向后兼容） */
export type AnnualReportTask = ReportTask;

// ============================================================
// Annual 报告配置
// ============================================================

const ANNUAL_REPORT_CONFIG: ReportConfig = {
  reportType: 'annual',
  reportTitle: { zh: `${new Date().getFullYear()}年度成长报告`, en: `${new Date().getFullYear()} Annual Report` },
  moduleIds: ANNUAL_MODULE_IDS,
  moduleMeta: ANNUAL_MODULE_META,
  batches: [
    { name: 'batch1', moduleIds: ['overview'] },
    { name: 'batch2', moduleIds: ['career', 'love', 'health'] },
    { name: 'batch3', moduleIds: ['social', 'growth', 'q1', 'q2', 'q3', 'q4', 'lucky'] },
  ],
  promptPrefix: 'annual-',
  taskTTL: 7 * 24 * 60 * 60,       // 7 天
  contentTTL: 30 * 24 * 60 * 60,   // 30 天
  maxTokens: 4096,
  estimatedMinutes: 5,
};

// ============================================================
// 向后兼容的 API 封装
// ============================================================

/** 获取任务状态 */
export async function getTaskStatus(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<AnnualReportTask | null> {
  return getReportTaskStatus(ANNUAL_REPORT_CONFIG, userId, birthData);
}

/** 创建异步任务 */
export async function createTask(
  userId: string,
  birthData: Partial<BirthInput>,
  lang: Language = 'zh'
): Promise<{ task: AnnualReportTask; isNew: boolean }> {
  return createReportTask(ANNUAL_REPORT_CONFIG, userId, birthData, lang);
}

/** 获取报告内容 */
export async function getReportContent(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<{
  modules: Record<string, unknown>;
  meta: typeof ANNUAL_MODULE_META;
  completedModules: string[];
} | null> {
  return getReportContentGeneric(ANNUAL_REPORT_CONFIG, userId, birthData);
}

/** 手动重试失败的任务 */
export async function retryTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<{ success: boolean; task?: AnnualReportTask; error?: string }> {
  return retryReportTask(ANNUAL_REPORT_CONFIG, userId, birthData);
}

/** 删除任务和相关内容 */
export async function deleteTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  return deleteReportTask(ANNUAL_REPORT_CONFIG, userId, birthData);
}

/** 导出配置供外部使用 */
export { ANNUAL_REPORT_CONFIG };

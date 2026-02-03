// INPUT: 本命深度解读报告任务服务（薄封装层）。
// OUTPUT: 导出本命报告任务创建、状态查询等功能（委托给通用 report-task）。
// POS: 本命深度解读任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import {
  createReportTask,
  getReportTaskStatus,
  getReportContent as getReportContentGeneric,
  retryReportTask,
  deleteReportTask,
  type ReportConfig,
  type ReportTask,
} from './report-task.js';
import {
  NATAL_REPORT_MODULE_IDS,
  NATAL_REPORT_MODULE_META,
} from '../prompts/templates/natal-report/index.js';
import type { BirthInput, Language } from '../types/api.js';

// ============================================================
// 摘要提取工具
// ============================================================

/**
 * 从模块生成内容中提取摘要（前 2-3 句核心结论）
 * 策略：提取前 200 个字符，在句号处截断（最终不超过 150 字符）
 */
function extractModuleSummary(content: unknown): string {
  if (!content) return '';
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  // 去掉 markdown 标记
  const clean = text
    .replace(/#{1,4}\s+/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/>\s+/g, '')
    .trim();
  // 取前 150 个字符，在句号处截断
  const truncated = clean.slice(0, 200);
  const lastPeriod = truncated.lastIndexOf('。');
  if (lastPeriod > 50) return truncated.slice(0, lastPeriod + 1);
  return truncated.slice(0, 150) + '…';
}

// ============================================================
// 本命深度解读报告配置
// ============================================================

const NATAL_REPORT_CONFIG: ReportConfig = {
  reportType: 'natal-report',
  moduleIds: NATAL_REPORT_MODULE_IDS,
  moduleMeta: NATAL_REPORT_MODULE_META,
  batches: [
    { name: 'batch1-overview', moduleIds: ['overview'] },
    { name: 'batch2-parallel', moduleIds: ['love', 'career', 'emotion', 'mind', 'wealth', 'health'] },
    { name: 'batch3-soul', moduleIds: ['soul'] },
  ],
  promptPrefix: 'natal-report-',
  taskTTL: 7 * 24 * 60 * 60,       // 7 天
  contentTTL: 90 * 24 * 60 * 60,   // 90 天
  maxTokens: {
    overview: 4096,
    mind: 3072,
    emotion: 4096,
    love: 5120,   // 最长模块
    career: 4096,
    wealth: 3072,
    health: 2048,
    soul: 4096,
  },
  estimatedMinutes: 2,

  // 构建 prompt 上下文
  buildContext: (chartSummary: Record<string, unknown>, lang: Language) => ({
    chart_summary: chartSummary,
    lang,
  }),

  // 批次完成回调：提取摘要注入后续模块上下文
  onBatchComplete: (
    batchIndex: number,
    completedModules: Map<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> => {
    const summaries: string[] = [];

    // 收集已完成模块的摘要
    for (const [moduleId, content] of completedModules) {
      const summary = extractModuleSummary(content);
      if (summary) {
        const moduleName = NATAL_REPORT_MODULE_META[moduleId as keyof typeof NATAL_REPORT_MODULE_META]?.name || moduleId;
        summaries.push(`【${moduleName}】${summary}`);
      }
    }

    const seedSummary = summaries.join('\n');

    // 更新上下文
    return {
      ...context,
      _seedSummary: seedSummary,
      // soul 之前的批次（batch index >= 1）需要全部摘要
      ...(batchIndex >= 1 ? { _allModuleSummary: seedSummary } : {}),
    };
  },

  // 模块级上下文覆盖（soul 模块需要特殊处理）
  getModuleContext: (
    moduleId: string,
    baseContext: Record<string, unknown>,
    completedModules: Map<string, unknown>
  ): Record<string, unknown> => {
    if (moduleId === 'soul') {
      // soul 模块需要所有前序模块的完整摘要
      const allSummaries: string[] = [];
      for (const [mId, content] of completedModules) {
        const summary = extractModuleSummary(content);
        if (summary) {
          const moduleName = NATAL_REPORT_MODULE_META[mId as keyof typeof NATAL_REPORT_MODULE_META]?.name || mId;
          allSummaries.push(`【${moduleName}】${summary}`);
        }
      }
      return {
        ...baseContext,
        _allModuleSummary: allSummaries.join('\n'),
      };
    }
    return baseContext;
  },

  // 质量校验配置
  qualityChecks: {
    overview: {
      wordCount: { min: 600, max: 800 },
      requiredKeywords: { words: ['太阳', '月亮', '上升'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    mind: {
      wordCount: { min: 500, max: 700 },
      requiredKeywords: { words: ['水星', '思维', '沟通'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    emotion: {
      wordCount: { min: 600, max: 800 },
      requiredKeywords: { words: ['月亮', '情感', '安全感'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    love: {
      wordCount: { min: 800, max: 1100 },
      requiredKeywords: { words: ['金星', '火星', '关系'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    career: {
      wordCount: { min: 700, max: 900 },
      requiredKeywords: { words: ['事业', '职业'], minMatch: 1 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    wealth: {
      wordCount: { min: 500, max: 700 },
      requiredKeywords: { words: ['财富', '金钱', '不构成'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'flag',
    },
    health: {
      wordCount: { min: 400, max: 600 },
      requiredKeywords: { words: ['能量', '不构成医学建议'], minMatch: 1 },
      forbiddenWords: [],
      onFail: 'flag',
    },
    soul: {
      wordCount: { min: 700, max: 900 },
      requiredKeywords: { words: ['北交', '凯龙'], minMatch: 1 },
      forbiddenWords: [],
      onFail: 'flag',
    },
  },
};

// ============================================================
// API 封装
// ============================================================

/** 获取任务状态 */
export async function getNatalReportStatus(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<ReportTask | null> {
  return getReportTaskStatus(NATAL_REPORT_CONFIG, userId, birthData);
}

/** 创建异步任务 */
export async function createNatalReportTask(
  userId: string,
  birthData: Partial<BirthInput>,
  lang: Language = 'zh'
): Promise<{ task: ReportTask; isNew: boolean }> {
  return createReportTask(NATAL_REPORT_CONFIG, userId, birthData, lang);
}

/** 获取报告内容 */
export async function getNatalReportContent(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return getReportContentGeneric(NATAL_REPORT_CONFIG, userId, birthData);
}

/** 重试失败的任务 */
export async function retryNatalReportTask(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return retryReportTask(NATAL_REPORT_CONFIG, userId, birthData);
}

/** 删除任务 */
export async function deleteNatalReportTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  return deleteReportTask(NATAL_REPORT_CONFIG, userId, birthData);
}

/** 导出配置供通用 API 注册 */
export { NATAL_REPORT_CONFIG };

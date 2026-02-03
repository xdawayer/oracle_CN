// INPUT: 爱情专题深度报告任务服务（薄封装层）。
// OUTPUT: 导出爱情专题报告任务配置（委托给通用 report-task）。
// POS: 爱情专题任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

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
  LOVE_TOPIC_MODULE_IDS,
  LOVE_TOPIC_MODULE_META,
} from '../prompts/templates/love-topic/index.js';
import type { BirthInput, Language } from '../types/api.js';

// ============================================================
// 摘要提取工具
// ============================================================

function extractModuleSummary(content: unknown): string {
  if (!content) return '';
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  const clean = text
    .replace(/#{1,4}\s+/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/>\s+/g, '')
    .trim();
  const truncated = clean.slice(0, 200);
  const lastPeriod = truncated.lastIndexOf('。');
  if (lastPeriod > 50) return truncated.slice(0, lastPeriod + 1);
  return truncated.slice(0, 150) + '…';
}

// ============================================================
// 爱情专题深度报告配置
// ============================================================

const LOVE_TOPIC_CONFIG: ReportConfig = {
  reportType: 'love-topic',
  moduleIds: LOVE_TOPIC_MODULE_IDS,
  moduleMeta: LOVE_TOPIC_MODULE_META,
  batches: [
    { name: 'batch1-personality', moduleIds: ['personality'] },
    { name: 'batch2-parallel', moduleIds: ['partner', 'growth'] },
    { name: 'batch3-forecast', moduleIds: ['forecast'] },
  ],
  promptPrefix: 'love-topic-',
  taskTTL: 7 * 24 * 60 * 60,       // 7 天
  contentTTL: 90 * 24 * 60 * 60,   // 90 天
  maxTokens: {
    personality: 4096,
    partner: 4096,
    growth: 3072,
    forecast: 3072,
  },
  estimatedMinutes: 2,

  buildContext: (chartSummary: Record<string, unknown>, lang: Language) => ({
    chart_summary: chartSummary,
    lang,
  }),

  onBatchComplete: (
    batchIndex: number,
    completedModules: Map<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> => {
    const summaries: string[] = [];

    for (const [moduleId, content] of completedModules) {
      const summary = extractModuleSummary(content);
      if (summary) {
        const moduleName = LOVE_TOPIC_MODULE_META[moduleId as keyof typeof LOVE_TOPIC_MODULE_META]?.name || moduleId;
        summaries.push(`【${moduleName}】${summary}`);
      }
    }

    const seedSummary = summaries.join('\n');

    return {
      ...context,
      _seedSummary: seedSummary,
      ...(batchIndex >= 1 ? { _allModuleSummary: seedSummary } : {}),
    };
  },

  getModuleContext: (
    moduleId: string,
    baseContext: Record<string, unknown>,
    completedModules: Map<string, unknown>
  ): Record<string, unknown> => {
    if (moduleId === 'forecast') {
      const allSummaries: string[] = [];
      for (const [mId, content] of completedModules) {
        const summary = extractModuleSummary(content);
        if (summary) {
          const moduleName = LOVE_TOPIC_MODULE_META[mId as keyof typeof LOVE_TOPIC_MODULE_META]?.name || mId;
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

  qualityChecks: {
    personality: {
      wordCount: { min: 700, max: 900 },
      requiredKeywords: { words: ['金星', '火星', '月亮'], minMatch: 2 },
      forbiddenWords: ['灵魂伴侣', '双生火焰', '命中注定', '内在小孩', '依恋模式'],
      onFail: 'retry',
    },
    partner: {
      wordCount: { min: 800, max: 1000 },
      requiredKeywords: { words: ['7宫', '伴侣', '关系'], minMatch: 2 },
      forbiddenWords: ['灵魂伴侣', '双生火焰', '命中注定', '内在小孩', '依恋模式'],
      onFail: 'retry',
    },
    growth: {
      wordCount: { min: 600, max: 800 },
      requiredKeywords: { words: ['成长', '建议'], minMatch: 1 },
      forbiddenWords: ['灵魂伴侣', '双生火焰', '命中注定', '内在小孩', '依恋模式'],
      onFail: 'retry',
    },
    forecast: {
      wordCount: { min: 600, max: 800 },
      requiredKeywords: { words: ['行运', '运势'], minMatch: 1 },
      forbiddenWords: ['灵魂伴侣', '双生火焰', '命中注定'],
      // forecast 作为最后一批，失败后仅标记而非重试，避免阻塞整个报告完成
      onFail: 'flag',
    },
  },
};

// ============================================================
// API 封装
// ============================================================

export async function getLoveTopicStatus(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<ReportTask | null> {
  return getReportTaskStatus(LOVE_TOPIC_CONFIG, userId, birthData);
}

export async function createLoveTopicTask(
  userId: string,
  birthData: Partial<BirthInput>,
  lang: Language = 'zh'
): Promise<{ task: ReportTask; isNew: boolean }> {
  return createReportTask(LOVE_TOPIC_CONFIG, userId, birthData, lang);
}

export async function getLoveTopicContent(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return getReportContentGeneric(LOVE_TOPIC_CONFIG, userId, birthData);
}

export async function retryLoveTopicTask(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return retryReportTask(LOVE_TOPIC_CONFIG, userId, birthData);
}

export async function deleteLoveTopicTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  return deleteReportTask(LOVE_TOPIC_CONFIG, userId, birthData);
}

export { LOVE_TOPIC_CONFIG };

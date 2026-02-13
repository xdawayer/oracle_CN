// INPUT: 财富专题深度报告任务服务（薄封装层）。
// OUTPUT: 导出财富专题报告任务配置（委托给通用 report-task）。
// POS: 财富专题任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

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
  WEALTH_TOPIC_MODULE_IDS,
  WEALTH_TOPIC_MODULE_META,
} from '../prompts/templates/wealth-topic/index.js';
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
// 财富专题深度报告配置
// ============================================================

const WEALTH_TOPIC_CONFIG: ReportConfig = {
  reportType: 'wealth-topic',
  reportTitle: { zh: '财富专题深度报告', en: 'Wealth Topic Report' },
  moduleIds: WEALTH_TOPIC_MODULE_IDS,
  moduleMeta: WEALTH_TOPIC_MODULE_META,
  batches: [
    { name: 'batch1-money-relation', moduleIds: ['money-relation'] },
    { name: 'batch2-parallel', moduleIds: ['potential', 'blindspot'] },
    { name: 'batch3-forecast', moduleIds: ['forecast'] },
  ],
  promptPrefix: 'wealth-topic-',
  taskTTL: 7 * 24 * 60 * 60,
  contentTTL: 90 * 24 * 60 * 60,
  maxTokens: {
    'money-relation': 4096,
    potential: 4096,
    blindspot: 3072,
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
        const moduleName = WEALTH_TOPIC_MODULE_META[moduleId as keyof typeof WEALTH_TOPIC_MODULE_META]?.name || moduleId;
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
          const moduleName = WEALTH_TOPIC_MODULE_META[mId as keyof typeof WEALTH_TOPIC_MODULE_META]?.name || mId;
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
    'money-relation': {
      wordCount: { min: 700, max: 900 },
      requiredKeywords: { words: ['2宫', '金钱', '金星'], minMatch: 2 },
      forbiddenWords: ['财富自由', '一夜暴富', '躺赚', '宇宙能量'],
      onFail: 'retry',
    },
    potential: {
      wordCount: { min: 700, max: 900 },
      requiredKeywords: { words: ['木星', '财富', '潜力'], minMatch: 2 },
      forbiddenWords: ['财富自由', '一夜暴富', '躺赚', '宇宙能量'],
      onFail: 'retry',
    },
    blindspot: {
      wordCount: { min: 600, max: 800 },
      // 确保免责声明存在：'不构成' 是声明中的关键词
      requiredKeywords: { words: ['不构成', '建议'], minMatch: 2 },
      forbiddenWords: ['财富自由', '一夜暴富', '躺赚', '宇宙能量'],
      onFail: 'retry',
    },
    forecast: {
      wordCount: { min: 500, max: 700 },
      requiredKeywords: { words: ['行运', '运势'], minMatch: 1 },
      forbiddenWords: ['财富自由', '一夜暴富', '躺赚'],
      // forecast 作为最后一批，失败后仅标记而非重试，避免阻塞整个报告完成
      onFail: 'flag',
    },
  },
};

// ============================================================
// API 封装
// ============================================================

export async function getWealthTopicStatus(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<ReportTask | null> {
  return getReportTaskStatus(WEALTH_TOPIC_CONFIG, userId, birthData);
}

export async function createWealthTopicTask(
  userId: string,
  birthData: Partial<BirthInput>,
  lang: Language = 'zh'
): Promise<{ task: ReportTask; isNew: boolean }> {
  return createReportTask(WEALTH_TOPIC_CONFIG, userId, birthData, lang);
}

export async function getWealthTopicContent(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return getReportContentGeneric(WEALTH_TOPIC_CONFIG, userId, birthData);
}

export async function retryWealthTopicTask(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return retryReportTask(WEALTH_TOPIC_CONFIG, userId, birthData);
}

export async function deleteWealthTopicTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  return deleteReportTask(WEALTH_TOPIC_CONFIG, userId, birthData);
}

export { WEALTH_TOPIC_CONFIG };

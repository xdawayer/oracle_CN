// INPUT: 事业专题深度报告任务服务（薄封装层）。
// OUTPUT: 导出事业专题报告任务配置（委托给通用 report-task）。
// POS: 事业专题任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

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
  CAREER_TOPIC_MODULE_IDS,
  CAREER_TOPIC_MODULE_META,
} from '../prompts/templates/career-topic/index.js';
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
// 事业专题深度报告配置
// ============================================================

const CAREER_TOPIC_CONFIG: ReportConfig = {
  reportType: 'career-topic',
  moduleIds: CAREER_TOPIC_MODULE_IDS,
  moduleMeta: CAREER_TOPIC_MODULE_META,
  batches: [
    { name: 'batch1-talent', moduleIds: ['talent'] },
    { name: 'batch2-parallel', moduleIds: ['workplace', 'mission'] },
    { name: 'batch3-forecast', moduleIds: ['forecast'] },
  ],
  promptPrefix: 'career-topic-',
  taskTTL: 7 * 24 * 60 * 60,
  contentTTL: 90 * 24 * 60 * 60,
  maxTokens: {
    talent: 5120,     // 最长模块
    workplace: 3072,
    mission: 3072,
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
        const moduleName = CAREER_TOPIC_MODULE_META[moduleId as keyof typeof CAREER_TOPIC_MODULE_META]?.name || moduleId;
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
          const moduleName = CAREER_TOPIC_MODULE_META[mId as keyof typeof CAREER_TOPIC_MODULE_META]?.name || mId;
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
    talent: {
      wordCount: { min: 900, max: 1200 },
      requiredKeywords: { words: ['事业', '职业', '天顶'], minMatch: 2 },
      forbiddenWords: ['灵性成长', '灵性觉醒', '使命召唤', '灵魂契约', '宇宙能量'],
      onFail: 'retry',
    },
    workplace: {
      wordCount: { min: 500, max: 700 },
      requiredKeywords: { words: ['团队', '领导', '职场'], minMatch: 1 },
      forbiddenWords: ['灵性成长', '灵性觉醒', '使命召唤', '灵魂契约', '宇宙能量'],
      onFail: 'retry',
    },
    mission: {
      wordCount: { min: 600, max: 800 },
      requiredKeywords: { words: ['方向', '成长'], minMatch: 1 },
      forbiddenWords: ['灵性成长', '灵性觉醒', '使命召唤', '灵魂契约', '宇宙能量'],
      onFail: 'retry',
    },
    forecast: {
      wordCount: { min: 600, max: 800 },
      requiredKeywords: { words: ['行运', '运势'], minMatch: 1 },
      forbiddenWords: ['灵性成长', '灵性觉醒', '使命召唤', '宇宙能量'],
      // forecast 作为最后一批，失败后仅标记而非重试，避免阻塞整个报告完成
      onFail: 'flag',
    },
  },
};

// ============================================================
// API 封装
// ============================================================

export async function getCareerTopicStatus(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<ReportTask | null> {
  return getReportTaskStatus(CAREER_TOPIC_CONFIG, userId, birthData);
}

export async function createCareerTopicTask(
  userId: string,
  birthData: Partial<BirthInput>,
  lang: Language = 'zh'
): Promise<{ task: ReportTask; isNew: boolean }> {
  return createReportTask(CAREER_TOPIC_CONFIG, userId, birthData, lang);
}

export async function getCareerTopicContent(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return getReportContentGeneric(CAREER_TOPIC_CONFIG, userId, birthData);
}

export async function retryCareerTopicTask(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return retryReportTask(CAREER_TOPIC_CONFIG, userId, birthData);
}

export async function deleteCareerTopicTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  return deleteReportTask(CAREER_TOPIC_CONFIG, userId, birthData);
}

export { CAREER_TOPIC_CONFIG };

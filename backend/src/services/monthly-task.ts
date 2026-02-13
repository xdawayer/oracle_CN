// INPUT: 月度运势深度解读报告任务服务（薄封装层）。
// OUTPUT: 导出月度报告任务创建、状态查询等功能（委托给通用 report-task）。
// POS: 月度运势深度解读任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

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
  MONTHLY_MODULE_IDS,
  MONTHLY_MODULE_META,
} from '../prompts/templates/monthly/index.js';
import { ephemerisService, buildCompactChartSummary, buildCompactTransitSummary } from './ephemeris.js';
import type { BirthInput, Language } from '../types/api.js';

// ============================================================
// 行运数据构建
// ============================================================

/**
 * 构建月度行运数据包
 *
 * 将用户本命盘 + 当月行运数据组合为 Prompt 可用的上下文。
 * 数据包以紧凑文本格式传入 Prompt，减少 token 消耗。
 */
async function buildMonthlyTransitData(
  birthInput: BirthInput,
  year: number,
  month: number,
): Promise<string> {
  // 计算本命盘
  const natalChart = await ephemerisService.calculateNatalChart(birthInput);
  const natalSummary = buildCompactChartSummary(natalChart);

  // 计算月初、月中、月末的行运
  const transitDates = [
    new Date(Date.UTC(year, month - 1, 1)),   // 月初
    new Date(Date.UTC(year, month - 1, 8)),   // 新月附近
    new Date(Date.UTC(year, month - 1, 15)),  // 月中
    new Date(Date.UTC(year, month - 1, 22)),  // 满月附近
    new Date(Date.UTC(year, month, 0)),       // 月末
  ];

  const transitSnapshots = await Promise.all(
    transitDates.map(d => ephemerisService.calculateTransits(birthInput, d))
  );

  const transitSummaries = transitSnapshots.map(t => buildCompactTransitSummary(t));

  // 构建月份中文名
  const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const monthName = monthNames[month - 1];

  // 组装紧凑文本格式的数据包
  const lines: string[] = [];

  lines.push(`═══ 基础信息 ═══`);
  lines.push(`报告月份：${year}年${monthName}月`);
  lines.push(``);

  // 本命盘核心数据
  lines.push(`═══ 用户本命盘核心数据 ═══`);
  const big3 = natalSummary.big3;
  if (big3.sun) lines.push(`太阳：${big3.sun.sign}（第${big3.sun.house}宫）`);
  if (big3.moon) lines.push(`月亮：${big3.moon.sign}（第${big3.moon.house}宫）`);
  if (big3.rising) lines.push(`上升：${big3.rising.sign}`);

  if (natalSummary.personal_planets) {
    for (const p of natalSummary.personal_planets) {
      if (p) lines.push(`${p.name}：${p.sign}（第${p.house}宫）${p.retrograde ? ' R' : ''}`);
    }
  }

  if (natalSummary.top_aspects && natalSummary.top_aspects.length > 0) {
    lines.push(`\n本命主要相位：`);
    for (const a of natalSummary.top_aspects) {
      lines.push(`- ${a.planet1} ${a.type} ${a.planet2}（${a.orb}°）`);
    }
  }

  // 行运快照
  lines.push(`\n═══ 本月行运快照 ═══`);
  for (let i = 0; i < transitSummaries.length; i++) {
    const ts = transitSummaries[i];
    const dateLabel = ['月初(1日)', '上旬(8日)', '月中(15日)', '下旬(22日)', '月末'][i];
    lines.push(`\n--- ${dateLabel} ---`);
    lines.push(`月相：${ts.moon_phase}`);

    if (ts.key_transits) {
      lines.push(`行运行星：`);
      for (const t of ts.key_transits) {
        if (t) lines.push(`  ${t.name}：${t.sign}${t.retrograde ? ' (逆行)' : ''}`);
      }
    }

    if (ts.top_aspects && ts.top_aspects.length > 0) {
      lines.push(`行运-本命相位：`);
      for (const a of ts.top_aspects) {
        lines.push(`  ${a.planet1} ${a.type} ${a.planet2}（${a.orb}°）`);
      }
    }
  }

  // 元素分布
  if (natalSummary.dominance) {
    const elem = natalSummary.dominance.elements;
    lines.push(`\n═══ 本命元素分布 ═══`);
    lines.push(`火${elem.fire} 土${elem.earth} 风${elem.air} 水${elem.water}`);
  }

  return lines.join('\n');
}

// ============================================================
// 摘要提取工具
// ============================================================

/**
 * 从模块生成内容中提取摘要（前 2-3 句核心结论）
 */
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
// 月度报告配置
// ============================================================

export const MONTHLY_REPORT_CONFIG: ReportConfig = {
  reportType: 'monthly',
  reportTitle: { zh: '月度运势报告', en: 'Monthly Report' },
  moduleIds: MONTHLY_MODULE_IDS,
  moduleMeta: MONTHLY_MODULE_META,
  batches: [
    { name: 'batch1-tone', moduleIds: ['tone'] },
    { name: 'batch2-parallel', moduleIds: ['dimensions', 'rhythm', 'lunar', 'dates'] },
    { name: 'batch3-actions', moduleIds: ['actions'] },
  ],
  promptPrefix: 'monthly-',
  taskTTL: 3 * 24 * 60 * 60,       // 3 天
  contentTTL: 30 * 24 * 60 * 60,   // 30 天
  maxTokens: {
    tone: 2000,
    dimensions: 4000,
    rhythm: 3000,
    lunar: 3000,
    dates: 2000,
    actions: 2000,
  },
  estimatedMinutes: 2,

  // 构建 prompt 上下文
  buildContext: (chartSummary: Record<string, unknown>, lang: Language) => ({
    chart_summary: chartSummary,
    lang,
    // transit_data 将在实际调用时由 monthly-task 注入
  }),

  // 批次完成回调：提取摘要注入后续模块上下文（累积所有前序摘要）
  onBatchComplete: (
    batchIndex: number,
    completedModules: Map<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> => {
    const newSummaries: string[] = [];

    for (const [moduleId, content] of completedModules) {
      const summary = extractModuleSummary(content);
      if (summary) {
        const moduleName = MONTHLY_MODULE_META[moduleId as keyof typeof MONTHLY_MODULE_META]?.name || moduleId;
        newSummaries.push(`【${moduleName}】${summary}`);
      }
    }

    // 累积：将前序摘要和当前批次摘要拼接
    const previousSummary = (context._seedSummary as string) || '';
    const currentBatchSummary = newSummaries.join('\n');
    const allSummaries = [previousSummary, currentBatchSummary].filter(Boolean).join('\n');

    return {
      ...context,
      _seedSummary: allSummaries,
      _allModuleSummary: allSummaries,
    };
  },

  // 模块级上下文覆盖（actions 模块需要所有前序摘要）
  getModuleContext: (
    moduleId: string,
    baseContext: Record<string, unknown>,
    completedModules: Map<string, unknown>
  ): Record<string, unknown> => {
    if (moduleId === 'actions') {
      const allSummaries: string[] = [];
      for (const [mId, content] of completedModules) {
        const summary = extractModuleSummary(content);
        if (summary) {
          const moduleName = MONTHLY_MODULE_META[mId as keyof typeof MONTHLY_MODULE_META]?.name || mId;
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
    tone: {
      wordCount: { min: 250, max: 500 },
      requiredKeywords: { words: ['/5'], minMatch: 1 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    dimensions: {
      wordCount: { min: 800, max: 1800 },
      requiredKeywords: { words: ['事业', '感情', '财务'], minMatch: 3 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    rhythm: {
      wordCount: { min: 500, max: 1000 },
      requiredKeywords: { words: ['上旬', '中旬', '下旬'], minMatch: 3 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    lunar: {
      wordCount: { min: 500, max: 1000 },
      requiredKeywords: { words: ['新月', '满月'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'retry',
    },
    dates: {
      wordCount: { min: 200, max: 800 },
      forbiddenWords: [],
      onFail: 'flag',
    },
    actions: {
      wordCount: { min: 250, max: 500 },
      requiredKeywords: { words: ['[宜]', '[忌]'], minMatch: 2 },
      forbiddenWords: [],
      onFail: 'retry',
    },
  },
};

// ============================================================
// API 封装
// ============================================================

/** 获取任务状态 */
export async function getMonthlyReportStatus(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<ReportTask | null> {
  return getReportTaskStatus(MONTHLY_REPORT_CONFIG, userId, birthData);
}

/** 创建异步任务 */
export async function createMonthlyReportTask(
  userId: string,
  birthData: Partial<BirthInput>,
  year: number,
  month: number,
  lang: Language = 'zh'
): Promise<{ task: ReportTask; isNew: boolean }> {
  // 先构建行运数据，注入到出生数据的扩展字段中
  const birthInput: BirthInput = {
    date: birthData.date || '',
    time: birthData.time,
    city: birthData.city || '',
    lat: birthData.lat,
    lon: birthData.lon,
    timezone: birthData.timezone || 'Asia/Shanghai',
    accuracy: birthData.accuracy || 'exact',
  };

  // 构建行运数据文本
  let transitDataText: string;
  try {
    transitDataText = await buildMonthlyTransitData(birthInput, year, month);
  } catch (err) {
    console.error('[MonthlyTask] Failed to build transit data:', err);
    transitDataText = `${year}年${month}月行运数据计算失败，请基于用户本命盘数据生成通用月运分析。`;
  }

  // 覆盖 buildContext 以注入行运数据（通过闭包捕获，不污染 birthData）
  const configWithTransit: ReportConfig = {
    ...MONTHLY_REPORT_CONFIG,
    buildContext: (chartSummary: Record<string, unknown>, lang: Language) => ({
      chart_summary: chartSummary,
      transit_data: transitDataText,
      lang,
    }),
  };

  return createReportTask(configWithTransit, userId, birthData, lang);
}

/** 获取报告内容 */
export async function getMonthlyReportContent(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return getReportContentGeneric(MONTHLY_REPORT_CONFIG, userId, birthData);
}

/** 重试失败的任务 */
export async function retryMonthlyReportTask(
  userId: string,
  birthData: Partial<BirthInput>
) {
  return retryReportTask(MONTHLY_REPORT_CONFIG, userId, birthData);
}

/** 删除任务 */
export async function deleteMonthlyReportTask(
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  return deleteReportTask(MONTHLY_REPORT_CONFIG, userId, birthData);
}

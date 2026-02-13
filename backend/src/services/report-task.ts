// INPUT: 通用报告异步任务服务。
// OUTPUT: 导出报告任务创建、状态查询、后台执行等通用功能。
// POS: 通用报告任务服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { cacheService } from '../cache/redis.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { generateAIContent } from './ai.js';
import { buildCompactChartSummary, ephemerisService } from './ephemeris.js';
import { resolveLocation } from './geocoding.js';
import { hashInput } from '../cache/strategy.js';
import type { BirthInput, Language } from '../types/api.js';

// ============================================================
// 类型定义
// ============================================================

/** 任务状态 */
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 通用报告任务数据结构 */
export interface ReportTask {
  taskId: string;
  userId: string;
  reportType: string;
  status: TaskStatus;
  progress: number; // 0-100
  completedModules: string[];
  failedModules: string[];
  birthData: Partial<BirthInput>;
  chartHash: string;
  lang: Language;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  error: string | null;
  /** 预计完成时间（分钟） */
  estimatedMinutes: number;
}

/** 模块元数据 */
export interface ModuleMeta {
  name: string;
  wordCount: string;
  order: number;
}

/** 质量校验配置 */
export interface QualityCheck {
  /** 字数范围 */
  wordCount?: { min: number; max: number };
  /** 必须包含的关键词（至少命中 minMatch 个） */
  requiredKeywords?: { words: string[]; minMatch: number };
  /** 禁止词黑名单 */
  forbiddenWords?: string[];
  /** 不通过时处理方式 */
  onFail?: 'retry' | 'flag';
}

/** 批次配置 */
export interface BatchConfig {
  /** 批次名称（调试用） */
  name: string;
  /** 该批次包含的模块 ID */
  moduleIds: string[];
}

/** 报告配置接口 — 每种报告类型需实现 */
export interface ReportConfig {
  /** 报告类型标识（如 'annual', 'natal-report'） */
  reportType: string;
  /** 报告标题（多语言），用于写入 reports 表 */
  reportTitle: Record<string, string>;
  /** 所有模块 ID（有序） */
  moduleIds: readonly string[];
  /** 模块元数据 */
  moduleMeta: Record<string, ModuleMeta>;
  /** 分批策略 */
  batches: BatchConfig[];
  /** prompt ID 前缀（如 'annual-', 'natal-report-'） */
  promptPrefix: string;
  /** 任务缓存 TTL（秒） */
  taskTTL: number;
  /** 内容缓存 TTL（秒） */
  contentTTL: number;
  /** 各模块 maxTokens */
  maxTokens: number | Record<string, number>;
  /** 预计生成时间（分钟） */
  estimatedMinutes: number;
  /** 构建 prompt 上下文（可选，默认使用 chart_summary） */
  buildContext?: (chartSummary: Record<string, unknown>, lang: Language) => Record<string, unknown>;
  /** 批次间回调（可选，用于摘要注入等） */
  onBatchComplete?: (
    batchIndex: number,
    completedModules: Map<string, unknown>,
    context: Record<string, unknown>
  ) => Record<string, unknown>;
  /** 模块级上下文覆盖（可选，为特定模块提供独立上下文） */
  getModuleContext?: (
    moduleId: string,
    baseContext: Record<string, unknown>,
    completedModules: Map<string, unknown>
  ) => Record<string, unknown>;
  /** 质量校验配置（可选） */
  qualityChecks?: Record<string, QualityCheck>;
}

// ============================================================
// 内部工具函数
// ============================================================

/** 生成任务 ID */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 构建任务缓存 key */
function buildTaskKey(config: ReportConfig, userId: string, chartHash: string): string {
  return `report_task:${config.reportType}:${userId}:${chartHash}`;
}

/** 构建内容缓存 key */
function buildContentKey(config: ReportConfig, userId: string, moduleId: string, chartHash: string): string {
  return `report:${config.reportType}:${userId}:${moduleId}:${chartHash}`;
}

/** 解析出生信息 */
async function parseBirthInput(query: Record<string, unknown>): Promise<BirthInput> {
  const city = (query.city as string) || '';
  const latParam = query.lat;
  const lonParam = query.lon;
  const timezoneParam = query.timezone as string | undefined;
  const hasLat = latParam !== undefined && latParam !== '';
  const hasLon = lonParam !== undefined && lonParam !== '';
  const hasTimezone = typeof timezoneParam === 'string' && timezoneParam.trim() !== '';
  const shouldResolve = !hasLat || !hasLon || !hasTimezone;
  const geo = shouldResolve ? await resolveLocation(city) : null;

  let birthDate = query.date as string;
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    if (!birthDate) birthDate = new Date().toISOString().split('T')[0];
  }

  return {
    date: birthDate,
    time: query.time as string | undefined,
    city: geo?.city || city || 'Unknown',
    lat: hasLat ? Number(latParam) : geo?.lat,
    lon: hasLon ? Number(lonParam) : geo?.lon,
    timezone: hasTimezone ? (timezoneParam as string) : (geo?.timezone || 'UTC'),
    accuracy: (query.accuracy as BirthInput['accuracy']) || 'exact',
  };
}

/** 延迟函数 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 获取模块的 maxTokens */
function getModuleMaxTokens(config: ReportConfig, moduleId: string): number {
  if (typeof config.maxTokens === 'number') return config.maxTokens;
  return config.maxTokens[moduleId] ?? 4096;
}

// ============================================================
// 禁止词列表（全局共享）
// ============================================================

const GLOBAL_FORBIDDEN_WORDS = [
  '注定', '命中注定', '劫难', '一定会', '绝对不会', '肯定会',
  '你的盘很凶', '这个相位很危险',
];

// ============================================================
// 质量校验
// ============================================================

/** 执行质量校验 */
function runQualityCheck(content: string, check: QualityCheck): { passed: boolean; reason?: string } {
  // 字数检查（±20% 容差）
  if (check.wordCount) {
    const wordCount = content.length; // 中文按字符数
    const tolerance = 0.2;
    const minWithTolerance = Math.floor(check.wordCount.min * (1 - tolerance));
    const maxWithTolerance = Math.ceil(check.wordCount.max * (1 + tolerance));
    if (wordCount < minWithTolerance || wordCount > maxWithTolerance) {
      return { passed: false, reason: `字数 ${wordCount} 超出范围 [${minWithTolerance}, ${maxWithTolerance}]` };
    }
  }

  // 关键词检查
  if (check.requiredKeywords) {
    const matchCount = check.requiredKeywords.words.filter(w => content.includes(w)).length;
    if (matchCount < check.requiredKeywords.minMatch) {
      return { passed: false, reason: `关键词命中 ${matchCount}/${check.requiredKeywords.minMatch}` };
    }
  }

  // 禁止词检查（合并全局 + 模块级）
  const allForbidden = [...GLOBAL_FORBIDDEN_WORDS, ...(check.forbiddenWords || [])];
  for (const word of allForbidden) {
    if (content.includes(word)) {
      return { passed: false, reason: `包含禁止词: ${word}` };
    }
  }

  return { passed: true };
}

// ============================================================
// 核心公共 API
// ============================================================

/** 获取任务状态 */
export async function getReportTaskStatus(
  config: ReportConfig,
  userId: string,
  birthData: Partial<BirthInput>
): Promise<ReportTask | null> {
  try {
    const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    const taskKey = buildTaskKey(config, userId, chartHash);
    return await cacheService.get<ReportTask>(taskKey);
  } catch (error) {
    console.error(`[ReportTask:${config.reportType}] Failed to get task status:`, error);
    return null;
  }
}

/** 创建异步任务 */
export async function createReportTask(
  config: ReportConfig,
  userId: string,
  birthData: Partial<BirthInput>,
  lang: Language = 'zh'
): Promise<{ task: ReportTask; isNew: boolean }> {
  const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
  const chart = await ephemerisService.calculateNatalChart(birthInput);
  const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
  const chartHash = hashInput(chartSummary);

  const taskKey = buildTaskKey(config, userId, chartHash);

  // 检查是否已有任务
  const existingTask = await cacheService.get<ReportTask>(taskKey);
  if (existingTask) {
    if (existingTask.status === 'completed' || existingTask.status === 'processing') {
      return { task: existingTask, isNew: false };
    }
    if (existingTask.status === 'failed') {
      console.log(`[ReportTask:${config.reportType}] Recreating failed task for user ${userId}`);
    }
  }

  // 创建新任务
  const task: ReportTask = {
    taskId: generateTaskId(),
    userId,
    reportType: config.reportType,
    status: 'pending',
    progress: 0,
    completedModules: [],
    failedModules: [],
    birthData,
    chartHash,
    lang,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    error: null,
    estimatedMinutes: config.estimatedMinutes,
  };

  await cacheService.set(taskKey, task, config.taskTTL);

  // 启动后台生成（不阻塞）
  setImmediate(() => {
    executeReportTask(config, userId, chartHash, chartSummary, lang).catch((err) => {
      console.error(`[ReportTask:${config.reportType}] Background execution failed:`, err);
    });
  });

  return { task, isNew: true };
}

/** 更新任务状态 */
async function updateTask(
  config: ReportConfig,
  userId: string,
  chartHash: string,
  updates: Partial<ReportTask>
): Promise<void> {
  const taskKey = buildTaskKey(config, userId, chartHash);
  const task = await cacheService.get<ReportTask>(taskKey);
  if (!task) return;

  const updatedTask: ReportTask = {
    ...task,
    ...updates,
    updatedAt: Date.now(),
  };

  await cacheService.set(taskKey, updatedTask, config.taskTTL);
}

// ============================================================
// 模块生成
// ============================================================

/** 单个模块的最大重试次数 */
const MAX_MODULE_RETRIES = 3;

/** 重试延迟（毫秒） */
const RETRY_DELAY_MS = 2000;

/** 生成单个模块（带重试+质量校验） */
async function generateModuleWithRetry(
  config: ReportConfig,
  moduleId: string,
  context: Record<string, unknown>,
  lang: Language,
  userId: string,
  chartHash: string
): Promise<{ success: boolean; content?: unknown }> {
  const contentKey = buildContentKey(config, userId, moduleId, chartHash);

  // 检查缓存
  const cached = await cacheService.get<unknown>(contentKey);
  if (cached) {
    console.log(`[ReportTask:${config.reportType}] Module ${moduleId} loaded from cache`);
    return { success: true, content: cached };
  }

  const maxTokens = getModuleMaxTokens(config, moduleId);
  const qualityCheck = config.qualityChecks?.[moduleId];

  // 带重试的生成（含质量校验重试）
  for (let attempt = 1; attempt <= MAX_MODULE_RETRIES; attempt++) {
    try {
      console.log(`[ReportTask:${config.reportType}] Generating module: ${moduleId} (attempt ${attempt}/${MAX_MODULE_RETRIES})`);

      const promptId = `${config.promptPrefix}${moduleId}`;
      const result = await generateAIContent({
        promptId,
        context: { ...context, lang },
        lang,
        maxTokens,
      });

      // 质量校验
      if (qualityCheck && result.content) {
        const contentStr = typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content);
        const checkResult = runQualityCheck(contentStr, qualityCheck);
        if (!checkResult.passed) {
          console.warn(`[ReportTask:${config.reportType}] Module ${moduleId} quality check failed: ${checkResult.reason}`);
          if (qualityCheck.onFail === 'retry' && attempt < MAX_MODULE_RETRIES) {
            console.log(`[ReportTask:${config.reportType}] Retrying ${moduleId} due to quality check failure...`);
            await delay(RETRY_DELAY_MS);
            continue;
          }
          // flag 模式或最后一次重试：接受结果但记录
          console.warn(`[ReportTask:${config.reportType}] Module ${moduleId} quality flagged but accepted`);
        }
      }

      // 保存到缓存
      await cacheService.set(contentKey, result.content, config.contentTTL);
      console.log(`[ReportTask:${config.reportType}] Module ${moduleId} generated successfully`);

      return { success: true, content: result.content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ReportTask:${config.reportType}] Module ${moduleId} attempt ${attempt} failed: ${message}`);

      if (attempt < MAX_MODULE_RETRIES) {
        console.log(`[ReportTask:${config.reportType}] Retrying ${moduleId} after ${RETRY_DELAY_MS * attempt}ms...`);
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }

  return { success: false };
}

/** 执行后台任务（分批并行生成） */
async function executeReportTask(
  config: ReportConfig,
  userId: string,
  chartHash: string,
  chartSummary: Record<string, unknown>,
  lang: Language
): Promise<void> {
  console.log(`[ReportTask:${config.reportType}] Starting background task for user ${userId}, chartHash ${chartHash.slice(0, 8)}...`);

  await updateTask(config, userId, chartHash, { status: 'processing' });

  const completedModules: string[] = [];
  const failedModules: string[] = [];
  const totalModules = config.moduleIds.length;

  // 已完成模块的内容（用于摘要注入）
  const completedContents = new Map<string, unknown>();

  // 构建基础上下文
  let baseContext = config.buildContext
    ? config.buildContext(chartSummary, lang)
    : { chart_summary: chartSummary, lang };

  // 分批并行生成
  for (let batchIdx = 0; batchIdx < config.batches.length; batchIdx++) {
    const batch = config.batches[batchIdx];
    console.log(`[ReportTask:${config.reportType}] Processing batch ${batch.name}: ${batch.moduleIds.join(', ')}`);

    const results = await Promise.allSettled(
      batch.moduleIds.map((moduleId) => {
        // 为每个模块获取可能的独立上下文
        const moduleContext = config.getModuleContext
          ? config.getModuleContext(moduleId, baseContext, completedContents)
          : baseContext;

        return generateModuleWithRetry(config, moduleId, moduleContext, lang, userId, chartHash)
          .then((result) => ({ moduleId, ...result }));
      })
    );

    // 处理结果（通过索引追踪模块 ID，避免 indexOf 不可靠）
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const moduleId = batch.moduleIds[i];
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          completedModules.push(result.value.moduleId);
          if (result.value.content) {
            completedContents.set(result.value.moduleId, result.value.content);
          }
        } else {
          failedModules.push(result.value.moduleId);
        }
      } else {
        failedModules.push(moduleId);
        console.error(`[ReportTask:${config.reportType}] Module ${moduleId} failed unexpectedly:`, result.reason);
      }
    }

    // 更新进度
    const progress = Math.round((completedModules.length + failedModules.length) / totalModules * 100);
    await updateTask(config, userId, chartHash, {
      progress,
      completedModules: [...completedModules],
      failedModules: [...failedModules],
    });

    console.log(`[ReportTask:${config.reportType}] Batch ${batch.name} completed. Progress: ${progress}%, completed: ${completedModules.length}, failed: ${failedModules.length}`);

    // 批次间回调（用于摘要注入等）
    if (config.onBatchComplete) {
      baseContext = config.onBatchComplete(batchIdx, completedContents, baseContext);
    }
  }

  // 完成任务：全部失败 → failed，部分失败 → completed（带 failedModules 信息），全部成功 → completed
  const finalStatus: TaskStatus = failedModules.length === totalModules ? 'failed' : 'completed';
  await updateTask(config, userId, chartHash, {
    status: finalStatus,
    progress: 100,
    completedModules: [...completedModules],
    failedModules: [...failedModules],
    completedAt: Date.now(),
    error: failedModules.length > 0
      ? `${failedModules.length}/${totalModules} 个模块生成失败: ${failedModules.join(', ')}`
      : null,
  });

  console.log(`[ReportTask:${config.reportType}] Task ${finalStatus}: ${completedModules.length} success, ${failedModules.length} failed`);

  // 报告完成后写入 Supabase reports 表（fire-and-forget，不阻塞任务结束）
  if (finalStatus === 'completed') {
    saveReportToDatabase(config, userId, chartHash, completedModules, lang).catch((err) => {
      console.error(`[ReportTask:${config.reportType}] saveReportToDatabase error:`, err);
    });
  }
}

/** 手动重试失败的任务 */
export async function retryReportTask(
  config: ReportConfig,
  userId: string,
  birthData: Partial<BirthInput>
): Promise<{ success: boolean; task?: ReportTask; error?: string }> {
  try {
    const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    const taskKey = buildTaskKey(config, userId, chartHash);
    const existingTask = await cacheService.get<ReportTask>(taskKey);

    if (!existingTask) {
      return { success: false, error: '未找到任务记录' };
    }

    if (existingTask.status === 'processing') {
      return { success: false, error: '任务正在进行中', task: existingTask };
    }

    if (existingTask.status === 'completed' && existingTask.failedModules.length === 0) {
      return { success: false, error: '任务已完成，无需重试', task: existingTask };
    }

    // 重置任务状态
    const updatedTask: ReportTask = {
      ...existingTask,
      status: 'pending',
      progress: Math.round(existingTask.completedModules.length / totalModulesCount(config) * 100),
      failedModules: [],
      updatedAt: Date.now(),
      error: null,
    };

    await cacheService.set(taskKey, updatedTask, config.taskTTL);

    // 启动后台重试
    const modulesToRetry = existingTask.failedModules;
    setImmediate(() => {
      retryFailedModules(config, userId, chartHash, chartSummary, existingTask.lang, modulesToRetry)
        .catch((err) => {
          console.error(`[ReportTask:${config.reportType}] Retry execution failed:`, err);
        });
    });

    return { success: true, task: updatedTask };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/** 获取模块总数 */
function totalModulesCount(config: ReportConfig): number {
  return config.moduleIds.length;
}

/** 重试失败的模块 */
async function retryFailedModules(
  config: ReportConfig,
  userId: string,
  chartHash: string,
  chartSummary: Record<string, unknown>,
  lang: Language,
  modulesToRetry: string[]
): Promise<void> {
  console.log(`[ReportTask:${config.reportType}] Retrying ${modulesToRetry.length} failed modules for user ${userId}`);

  await updateTask(config, userId, chartHash, { status: 'processing' });

  const taskKey = buildTaskKey(config, userId, chartHash);
  const task = await cacheService.get<ReportTask>(taskKey);
  if (!task) return;

  const completedModules = [...task.completedModules];
  const failedModules: string[] = [];
  const totalModules = totalModulesCount(config);

  const baseContext = config.buildContext
    ? config.buildContext(chartSummary, lang)
    : { chart_summary: chartSummary, lang };

  for (const moduleId of modulesToRetry) {
    const result = await generateModuleWithRetry(config, moduleId, baseContext, lang, userId, chartHash);

    if (result.success) {
      completedModules.push(moduleId);
    } else {
      failedModules.push(moduleId);
    }

    const progress = Math.round((completedModules.length + failedModules.length) / totalModules * 100);
    await updateTask(config, userId, chartHash, {
      progress,
      completedModules: [...completedModules],
      failedModules: [...failedModules],
    });
  }

  const finalStatus: TaskStatus = completedModules.length === 0 ? 'failed' : 'completed';
  await updateTask(config, userId, chartHash, {
    status: finalStatus,
    progress: 100,
    completedAt: Date.now(),
    error: failedModules.length > 0 ? `${failedModules.length} modules failed` : null,
  });

  console.log(`[ReportTask:${config.reportType}] Retry completed: ${completedModules.length} total success, ${failedModules.length} still failed`);

  // 重试完成后写入 Supabase reports 表（fire-and-forget）
  if (finalStatus === 'completed') {
    saveReportToDatabase(config, userId, chartHash, completedModules, lang).catch((err) => {
      console.error(`[ReportTask:${config.reportType}] saveReportToDatabase error:`, err);
    });
  }
}

// ============================================================
// 报告持久化（写入 Supabase）
// ============================================================

/** 报告完成后写入 reports 表（供收藏列表读取） */
async function saveReportToDatabase(
  config: ReportConfig,
  userId: string,
  chartHash: string,
  completedModuleIds: string[],
  lang: Language,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(`[ReportTask:${config.reportType}] Supabase not configured, skipping DB save`);
    return;
  }

  try {
    // 查重：同一用户 + 同一报告类型 + 同一 chartHash（数据库层 JSONB 过滤）
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('user_id', userId)
      .eq('report_type', config.reportType)
      .filter('content->>chartHash', 'eq', chartHash)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[ReportTask:${config.reportType}] Report already in DB for chartHash ${chartHash.slice(0, 8)}, skipping`);
      return;
    }

    // 从缓存读取所有已完成模块的内容
    const modules: Record<string, unknown> = {};
    for (const moduleId of completedModuleIds) {
      const contentKey = buildContentKey(config, userId, moduleId, chartHash);
      const content = await cacheService.get<unknown>(contentKey);
      if (content) modules[moduleId] = content;
    }

    // 获取 birthData
    const taskKey = buildTaskKey(config, userId, chartHash);
    const task = await cacheService.get<ReportTask>(taskKey);
    const birthData = task?.birthData || {};

    // 组装 content JSONB
    const title = config.reportTitle[lang] || config.reportTitle.zh || config.reportType;
    const content = {
      title,
      chartHash,
      generatedAt: new Date().toISOString(),
      modules,
      meta: config.moduleMeta,
    };

    const { error } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        report_type: config.reportType,
        title,
        content,
        birth_profile: birthData,
        generated_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`[ReportTask:${config.reportType}] Failed to save to DB:`, error.message);
    } else {
      console.log(`[ReportTask:${config.reportType}] Report saved to database successfully`);
    }
  } catch (err) {
    console.error(`[ReportTask:${config.reportType}] Error saving to database:`, err);
  }
}

/** 获取报告内容 */
export async function getReportContent(
  config: ReportConfig,
  userId: string,
  birthData: Partial<BirthInput>
): Promise<{
  modules: Record<string, unknown>;
  meta: Record<string, ModuleMeta>;
  completedModules: string[];
} | null> {
  try {
    const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    const taskKey = buildTaskKey(config, userId, chartHash);
    const task = await cacheService.get<ReportTask>(taskKey);

    if (!task || (task.status !== 'completed' && task.status !== 'processing')) {
      return null;
    }

    const modules: Record<string, unknown> = {};
    const completedModules: string[] = [];

    for (const moduleId of config.moduleIds) {
      const contentKey = buildContentKey(config, userId, moduleId, chartHash);
      const content = await cacheService.get<unknown>(contentKey);
      if (content) {
        modules[moduleId] = content;
        completedModules.push(moduleId);
      }
    }

    return {
      modules,
      meta: config.moduleMeta,
      completedModules,
    };
  } catch (error) {
    console.error(`[ReportTask:${config.reportType}] Failed to get report content:`, error);
    return null;
  }
}

/** 删除任务和相关内容 */
export async function deleteReportTask(
  config: ReportConfig,
  userId: string,
  birthData: Partial<BirthInput>
): Promise<boolean> {
  try {
    const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    const taskKey = buildTaskKey(config, userId, chartHash);
    await cacheService.del(taskKey);

    for (const moduleId of config.moduleIds) {
      const contentKey = buildContentKey(config, userId, moduleId, chartHash);
      await cacheService.del(contentKey);
    }

    return true;
  } catch (error) {
    console.error(`[ReportTask:${config.reportType}] Failed to delete task:`, error);
    return false;
  }
}

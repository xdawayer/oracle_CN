// INPUT: 2026 流年运势报告 API（SSE 流式生成，11 个模块全并行）。
// OUTPUT: 导出 annual-report 路由（支持流式生成与缓存）。
// POS: 流年报告端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import type { BirthInput, Language } from '../types/api.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { buildCompactChartSummary, ephemerisService } from '../services/ephemeris.js';
import { resolveLocation } from '../services/geocoding.js';
import { cacheService } from '../cache/redis.js';
import { hashInput } from '../cache/strategy.js';
import { authMiddleware } from './auth.js';

/** 开发模式默认用户 ID */
const DEV_USER_ID = 'dev-user-annual-report';
import {
  ANNUAL_MODULE_IDS,
  ANNUAL_MODULE_META,
  type AnnualModuleId,
} from '../prompts/templates/annual/index.js';

export const annualReportRouter = Router();

/** 缓存配置 */
const ANNUAL_CACHE_TTL = 30 * 24 * 60 * 60; // 30 天
const ANNUAL_CACHE_PREFIX = 'annual:2026:';

/** 并发控制：最大同时生成的模块数 */
const MAX_CONCURRENT_GENERATIONS = 4;

/** 构建缓存 key */
function buildAnnualCacheKey(userId: string, moduleId: string, chartHash: string): string {
  return `${ANNUAL_CACHE_PREFIX}${userId}:${moduleId}:${chartHash}`;
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

/** SSE 事件发送器 */
function sendSSEEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** 模块生成结果类型 */
interface ModuleResult {
  moduleId: AnnualModuleId;
  content: unknown;
  cached: boolean;
  error?: string;
  durationMs?: number;
}

/** 生成单个模块内容 */
async function generateModule(
  moduleId: AnnualModuleId,
  chartSummary: Record<string, unknown>,
  userId: string,
  chartHash: string,
  lang: Language = 'zh',
  options?: { awaitCacheWrite?: boolean }
): Promise<ModuleResult> {
  const startTime = performance.now();
  const cacheKey = buildAnnualCacheKey(userId, moduleId, chartHash);

  // 检查缓存
  const cached = await cacheService.get<unknown>(cacheKey);
  if (cached) {
    console.log(`[AnnualReport] Module ${moduleId} loaded from cache`);
    return { moduleId, content: cached, cached: true, durationMs: Math.round(performance.now() - startTime) };
  }

  try {
    const promptId = `annual-${moduleId}`;
    console.log(`[AnnualReport] >>> Starting generation: ${moduleId}`);

    const result = await generateAIContent({
      promptId,
      context: { chart_summary: chartSummary, lang },
      lang,
      maxTokens: 4096,
    });

    const durationMs = Math.round(performance.now() - startTime);
    console.log(`[AnnualReport] <<< Completed ${moduleId} in ${durationMs}ms`);

    const cacheWrite = cacheService.set(cacheKey, result.content, ANNUAL_CACHE_TTL);
    if (options?.awaitCacheWrite) {
      try {
        await cacheWrite;
      } catch (err) {
        console.warn(`[AnnualReport] Cache write failed for ${moduleId}:`, err);
      }
    } else {
      // 异步写入缓存（不阻塞返回）
      cacheWrite.catch((err) => {
        console.warn(`[AnnualReport] Cache write failed for ${moduleId}:`, err);
      });
    }

    return { moduleId, content: result.content, cached: false, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Math.round(performance.now() - startTime);
    console.error(`[AnnualReport] !!! Module ${moduleId} FAILED after ${durationMs}ms: ${message}`);
    return { moduleId, content: null, cached: false, error: message, durationMs };
  }
}

/** 简化的全并行生成器 */
async function generateAllModulesParallel(
  moduleIds: AnnualModuleId[],
  chartSummary: Record<string, unknown>,
  userId: string,
  chartHash: string,
  lang: Language,
  onModuleComplete: (result: ModuleResult) => void,
  checkDisconnected: () => boolean,
  options?: { awaitCacheWrite?: boolean }
): Promise<void> {
  console.log(`[AnnualReport] generateAllModulesParallel called with ${moduleIds.length} modules`);

  // 直接全并行，让 DeepSeek API 自己处理并发
  const promises = moduleIds.map(async (moduleId) => {
    console.log(`[AnnualReport] Launching module: ${moduleId}`);

    try {
      const result = await generateModule(moduleId, chartSummary, userId, chartHash, lang, options);
      if (!checkDisconnected()) {
        onModuleComplete(result);
      }
    } catch (error) {
      const result: ModuleResult = {
        moduleId,
        content: null,
        cached: false,
        error: error instanceof Error ? error.message : String(error),
      };
      if (!checkDisconnected()) {
        onModuleComplete(result);
      }
    }
  });

  await Promise.all(promises);
  console.log(`[AnnualReport] All modules completed`);
}


/** SSE 生成超时时间（5 分钟） */
const SSE_TIMEOUT_MS = 5 * 60 * 1000;

// POST /api/annual-report/generate - SSE 流式生成流年报告
annualReportRouter.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  const requestStart = performance.now();
  const userId = req.userId || DEV_USER_ID; // 开发模式使用默认用户

  // 解析请求体
  const { birth, lang = 'zh', streamMode = 'full' } = req.body as {
    birth?: Partial<BirthInput>;
    lang?: Language;
    streamMode?: 'full' | 'lite';
  };
  const liteStream = streamMode === 'lite';
  const continueAfterDisconnect = liteStream;

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  // ★ 立即设置 SSE headers，保持连接活跃
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
  res.flushHeaders();

  // 发送连接建立事件
  sendSSEEvent(res, 'connected', { status: 'preparing', message: '正在准备数据...' });

  // 客户端断开标志
  let clientDisconnected = false;
  let heartbeatId: NodeJS.Timeout | null = null;
  req.on('close', () => {
    clientDisconnected = true;
    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }
    console.log('[AnnualReport] Client disconnected');
  });

  // 发送心跳，保持连接活跃（部分客户端/代理需要持续输出）
  heartbeatId = setInterval(() => {
    if (clientDisconnected) return;
    sendSSEEvent(res, 'ping', { ts: Date.now() });
  }, 15000);

  // 设置超时
  const timeoutId = setTimeout(() => {
    if (!clientDisconnected) {
      sendSSEEvent(res, 'error', { error: 'Generation timeout', timeout: SSE_TIMEOUT_MS });
      if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeatId = null;
      }
      res.end();
    }
  }, SSE_TIMEOUT_MS);

  try {
    // 发送心跳，告知客户端正在计算星盘
    if (!clientDisconnected) {
      sendSSEEvent(res, 'status', { step: 'calculating', message: '正在计算星盘...' });
    }

    // 解析出生信息
    const birthInput = await parseBirthInput({
      date: birth.date,
      time: birth.time,
      city: birth.city,
      lat: birth.lat,
      lon: birth.lon,
      timezone: birth.timezone,
      accuracy: birth.accuracy,
    });

    // 检查客户端是否断开
    if (clientDisconnected && !continueAfterDisconnect) {
      clearTimeout(timeoutId);
      return;
    }

    // 计算本命盘
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    // 检查客户端是否断开
    if (clientDisconnected && !continueAfterDisconnect) {
      clearTimeout(timeoutId);
      return;
    }

    // 发送初始化事件
    if (!clientDisconnected) {
      sendSSEEvent(res, 'init', {
        modules: ANNUAL_MODULE_IDS,
        meta: ANNUAL_MODULE_META,
        chartHash,
      });
    }

    // 记录已完成的模块
    const completedModules: string[] = [];
    const failedModules: string[] = [];

    // 模块完成回调
    const onModuleComplete = (result: ModuleResult) => {
      // 客户端已断开，跳过发送
      if (clientDisconnected) return;

      if (result.error) {
        failedModules.push(result.moduleId);
        sendSSEEvent(res, 'module-error', {
          moduleId: result.moduleId,
          error: result.error,
        });
      } else {
        completedModules.push(result.moduleId);
        const payload: Record<string, unknown> = {
          moduleId: result.moduleId,
          cached: result.cached,
          meta: ANNUAL_MODULE_META[result.moduleId],
          durationMs: result.durationMs,
          contentReady: true,
        };
        if (!liteStream) {
          payload.content = result.content;
        }
        sendSSEEvent(res, 'module-complete', payload);
      }

      // 发送进度事件
      sendSSEEvent(res, 'progress', {
        completed: completedModules.length,
        failed: failedModules.length,
        total: ANNUAL_MODULE_IDS.length,
        percent: Math.round(((completedModules.length + failedModules.length) / ANNUAL_MODULE_IDS.length) * 100),
      });
    };

    // 全并行生成所有模块（带并发控制）
    console.log(`[AnnualReport] Starting parallel generation for ${ANNUAL_MODULE_IDS.length} modules (max concurrent: ${MAX_CONCURRENT_GENERATIONS})`);

    await generateAllModulesParallel(
      [...ANNUAL_MODULE_IDS], // 复制数组避免修改原数组
      chartSummary,
      userId,
      chartHash,
      lang,
      onModuleComplete,
      () => clientDisconnected,
      liteStream ? { awaitCacheWrite: true } : undefined
    );

    // 清除超时
    clearTimeout(timeoutId);
    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }

    // 客户端已断开，不发送完成事件
    if (clientDisconnected) {
      return;
    }

    // 发送完成事件
    const totalMs = performance.now() - requestStart;
    sendSSEEvent(res, 'complete', {
      completedModules,
      failedModules,
      totalMs: Math.round(totalMs),
    });

    res.end();
  } catch (error) {
    clearTimeout(timeoutId);
    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }
    if (clientDisconnected) {
      return;
    }
    if (error instanceof AIUnavailableError) {
      sendSSEEvent(res, 'error', { error: 'AI unavailable', reason: error.reason });
    } else {
      sendSSEEvent(res, 'error', { error: (error as Error).message });
    }
    res.end();
  }
});

// GET /api/annual-report/module/:moduleId - 获取单个模块（支持缓存）
annualReportRouter.get('/module/:moduleId', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;
  const moduleId = req.params.moduleId as AnnualModuleId;
  const lang = (req.query.lang as Language) || 'zh';

  if (!ANNUAL_MODULE_IDS.includes(moduleId)) {
    res.status(400).json({ error: `Invalid module: ${moduleId}` });
    return;
  }

  const { birth } = req.query as { birth?: string };
  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const birthData = JSON.parse(birth) as Partial<BirthInput>;
    const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    const result = await generateModule(moduleId, chartSummary, userId, chartHash, lang);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({
      moduleId: result.moduleId,
      content: result.content,
      cached: result.cached,
      meta: ANNUAL_MODULE_META[moduleId],
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/annual-report/cached - 获取用户已缓存的模块列表
annualReportRouter.get('/cached', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;
  const { birth } = req.query as { birth?: string };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const birthData = JSON.parse(birth) as Partial<BirthInput>;
    const birthInput = await parseBirthInput(birthData as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    // 并行检查每个模块的缓存状态
    const cacheChecks = await Promise.all(
      ANNUAL_MODULE_IDS.map(async (moduleId) => {
        const cacheKey = buildAnnualCacheKey(userId, moduleId, chartHash);
        const exists = await cacheService.exists(cacheKey);
        return [moduleId, exists] as const;
      })
    );
    const cachedStatus: Record<string, boolean> = Object.fromEntries(cacheChecks);

    res.json({
      chartHash,
      modules: cachedStatus,
      meta: ANNUAL_MODULE_META,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/annual-report/cache - 清除用户的流年报告缓存
annualReportRouter.delete('/cache', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;
  const { birth } = req.body as { birth?: Partial<BirthInput> };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const birthInput = await parseBirthInput(birth as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birthInput);
    const chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
    const chartHash = hashInput(chartSummary);

    // 删除所有模块的缓存
    const deletePromises = ANNUAL_MODULE_IDS.map((moduleId) => {
      const cacheKey = buildAnnualCacheKey(userId, moduleId, chartHash);
      return cacheService.del(cacheKey);
    });
    await Promise.all(deletePromises);

    res.json({ cleared: true, modules: ANNUAL_MODULE_IDS.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/annual-report/meta - 获取模块元数据
annualReportRouter.get('/meta', (_req: Request, res: Response) => {
  res.json({
    year: 2026,
    modules: ANNUAL_MODULE_META,
    moduleIds: ANNUAL_MODULE_IDS,
  });
});

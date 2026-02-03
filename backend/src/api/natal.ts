// INPUT: Natal API 路由。
// OUTPUT: 导出 natal 路由（含 overview/core/dimension/full 与模块级 stream、紧凑摘要与 Server-Timing）。
// POS: Natal 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type {
  BirthInput,
  Language,
  NatalChartResponse,
  NatalOverviewResponse,
  NatalCoreThemesResponse,
  NatalDimensionResponse,
} from '../types/api.js';
import { buildCompactChartSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContent, generateAIContentWithMeta } from '../services/ai.js';
import { resolveLocation } from '../services/geocoding.js';
import { generateParallel, extractSuccessContent } from '../services/parallel-generator.js';
import { extractPortrait, savePortrait } from '../services/user-portrait.js';

export const natalRouter = Router();

function writeSSE(res: any, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

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
  return {
    date: query.date as string,
    time: query.time as string | undefined,
    city: (geo?.city || city || 'Unknown'),
    lat: hasLat ? Number(latParam) : geo?.lat,
    lon: hasLon ? Number(lonParam) : geo?.lon,
    timezone: hasTimezone ? (timezoneParam as string) : (geo?.timezone || 'UTC'),
    accuracy: (query.accuracy as BirthInput['accuracy']) || 'exact',
  };
}

function resolveLang(value: unknown): Language {
  return value === 'en' ? 'en' : 'zh';
}

// GET /api/natal/chart - 仅返回 Real Data
natalRouter.get('/chart', async (req, res) => {
  try {
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    const chart = await ephemerisService.calculateNatalChart(birth);
    res.json({ chart } as NatalChartResponse);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/natal/overview - Real Data + AI 内容
natalRouter.get('/overview', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    const coreStart = performance.now();
    const chart = await ephemerisService.calculateNatalChart(birth);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'natal-overview',
      context: { chart_summary: chartSummary },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);
    res.json({ chart, lang: result.lang, content: result.content } as NatalOverviewResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/natal/core-themes
natalRouter.get('/core-themes', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    const coreStart = performance.now();
    const chart = await ephemerisService.calculateNatalChart(birth);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'natal-core-themes',
      context: { chart_summary: chartSummary },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);
    res.json({ chart, lang: result.lang, content: result.content } as NatalCoreThemesResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/natal/dimension
natalRouter.get('/dimension', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    const dimension = req.query.dimension as string;
    const coreStart = performance.now();
    const chart = await ephemerisService.calculateNatalChart(birth);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'natal-dimension',
      context: { chart_summary: chartSummary, dimension },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);
    res.json({ chart, lang: result.lang, content: result.content } as NatalDimensionResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/natal/full - 并行生成所有本命盘内容块
natalRouter.get('/full', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const dimension = (req.query.dimension as string) || 'career';
    const birth = await parseBirthInput(req.query as Record<string, unknown>);

    // 1. 计算星盘
    const coreStart = performance.now();
    const chart = await ephemerisService.calculateNatalChart(birth);
    const coreMs = performance.now() - coreStart;

    // 2. 构建紧凑摘要
    const chartSummary = buildCompactChartSummary(chart);

    // 3. 构建种子摘要（big3 + 主导元素），保证并行生成内容一致性
    const big3 = chartSummary.big3;
    const seedParts: string[] = [];
    if (big3.sun) seedParts.push(`日${(big3.sun as any).sign || ''}`);
    if (big3.moon) seedParts.push(`月${(big3.moon as any).sign || ''}`);
    if (big3.rising) seedParts.push(`升${(big3.rising as any).sign || ''}`);
    if (chartSummary.dominance) {
      const dom = chartSummary.dominance as Record<string, unknown>;
      if (dom.element) seedParts.push(`主导元素:${dom.element}`);
      if (dom.modality) seedParts.push(`主导模式:${dom.modality}`);
    }
    const seedSummary = seedParts.join('｜');

    // 4. 并行生成所有内容块
    const aiStart = performance.now();
    const parallelResult = await generateParallel({
      promptIds: ['natal-overview', 'natal-core-themes', 'natal-dimension'],
      sharedContext: { chart_summary: chartSummary, dimension },
      seedSummary,
      lang,
    });
    const aiMs = performance.now() - aiStart;

    // 5. 提取成功内容
    const contents = extractSuccessContent(parallelResult.results);

    // 6. 从 overview 结果提取并保存用户画像
    const overviewResult = parallelResult.results.get('natal-overview');
    if (overviewResult?.success && overviewResult.content) {
      try {
        const portrait = extractPortrait(overviewResult.content.content as Record<string, any>);
        const birthData = { date: birth.date, time: birth.time, city: birth.city, lat: birth.lat, lon: birth.lon };
        await savePortrait(birthData, portrait);
      } catch (portraitError) {
        // 画像保存失败不影响主流程
        console.warn('[natal/full] Portrait save failed:', portraitError);
      }
    }

    // 7. 构建响应
    const totalMs = performance.now() - requestStart;
    res.setHeader(
      'Server-Timing',
      `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`
    );

    res.json({
      chart,
      overview: contents['natal-overview'] ?? null,
      coreThemes: contents['natal-core-themes'] ?? null,
      dimension: contents['natal-dimension'] ?? null,
      timing: {
        coreMs: Math.round(coreMs),
        aiMs: Math.round(aiMs),
        totalMs: Math.round(totalMs),
        parallelSuccess: parallelResult.successCount,
        parallelFail: parallelResult.failCount,
      },
    });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/natal/full/stream - 模块级 SSE 流式输出
natalRouter.get('/full/stream', async (req, res) => {
  const requestStart = performance.now();
  let headersSent = false;
  try {
    const lang = resolveLang(req.query.lang);
    const dimension = (req.query.dimension as string) || 'career';
    const birth = await parseBirthInput(req.query as Record<string, unknown>);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Trailer', 'Server-Timing');
    res.flushHeaders();
    headersSent = true;

    let disconnected = false;
    req.on('close', () => { disconnected = true; });

    const coreStart = performance.now();
    const chart = await ephemerisService.calculateNatalChart(birth);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);

    // 构建种子摘要（big3 + 主导元素），保证并行生成内容一致性
    const big3 = chartSummary.big3;
    const seedParts: string[] = [];
    if (big3.sun) seedParts.push(`日${(big3.sun as any).sign || ''}`);
    if (big3.moon) seedParts.push(`月${(big3.moon as any).sign || ''}`);
    if (big3.rising) seedParts.push(`升${(big3.rising as any).sign || ''}`);
    if (chartSummary.dominance) {
      const dom = chartSummary.dominance as Record<string, unknown>;
      if (dom.element) seedParts.push(`主导元素:${dom.element}`);
      if (dom.modality) seedParts.push(`主导模式:${dom.modality}`);
    }
    const seedSummary = seedParts.join('｜');

    if (!disconnected) {
      writeSSE(res, { type: 'meta', chart, timing: { coreMs: Math.round(coreMs) } });
    }

    const promptMap: Record<string, string> = {
      'natal-overview': 'overview',
      'natal-core-themes': 'coreThemes',
      'natal-dimension': 'dimension',
    };

    const baseContext: Record<string, unknown> = {
      chart_summary: chartSummary,
      dimension,
    };
    if (seedSummary) baseContext._seedSummary = seedSummary;

    const aiStart = performance.now();
    const tasks = Object.entries(promptMap).map(async ([promptId, moduleId]) => {
      const moduleStart = performance.now();
      try {
        const result = await generateAIContentWithMeta({
          promptId,
          context: baseContext,
          lang,
        });
        if (!disconnected) {
          writeSSE(res, {
            type: 'module',
            moduleId,
            content: result.content.content,
            meta: result.meta,
            durationMs: Math.round(performance.now() - moduleStart),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!disconnected) {
          writeSSE(res, {
            type: 'module',
            moduleId,
            content: null,
            error: message,
            durationMs: Math.round(performance.now() - moduleStart),
          });
        }
      }
    });

    await Promise.all(tasks);
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;

    if (!disconnected) {
      writeSSE(res, { type: 'timing', timing: { coreMs: Math.round(coreMs), aiMs: Math.round(aiMs), totalMs: Math.round(totalMs) } });
      res.write('data: [DONE]\n\n');
    }
    res.addTrailers({
      'Server-Timing': `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`,
    });
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (headersSent) {
      writeSSE(res, { type: 'error', message });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: message });
  }
});

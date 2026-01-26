// INPUT: Natal API 路由。
// OUTPUT: 导出 natal 路由（含 overview/core/dimension、紧凑摘要与 Server-Timing）。
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
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { resolveLocation } from '../services/geocoding.js';

export const natalRouter = Router();

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

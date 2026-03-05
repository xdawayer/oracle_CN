// INPUT: 技术规格详情解读 API 路由（含本我页面 Big3/深度解析类型）。
// OUTPUT: 导出 detail 路由（懒加载 AI 详情解读与 Server-Timing，支持自我页扩展类型）。
// POS: Detail 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { BirthInput, Language, PlanetPosition } from '../types/api.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { resolveLocation } from '../services/geocoding.js';
import { SIGNS } from '../data/sources.js';
import { createTask, completeTask, failTask, getTask } from '../utils/taskStore.js';

export const detailRouter = Router();

type DetailType =
  | 'big3'
  | 'elements'
  | 'aspects'
  | 'planets'
  | 'asteroids'
  | 'rulers'
  | 'synthesis'
  | 'dimension'
  | 'deep'
  | 'advice'
  | 'time-windows'
  | 'weekly-trend'
  | 'aspect-matrix'
  | 'astro-report';
type DetailContext = 'natal' | 'transit' | 'synastry' | 'composite';

interface DetailRequest {
  type: DetailType;
  context: DetailContext;
  lang: 'zh' | 'en';
  chartData?: Record<string, unknown>;
  transitDate?: string;
  date?: string;
  birth?: Partial<BirthInput>;
  dimension?: 'career' | 'wealth' | 'love' | 'health';
  nameA?: string;
  nameB?: string;
}

const SIGN_ORDER = [...SIGNS];
const MODERN_RULERS: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Pluto',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Uranus',
  Pisces: 'Neptune',
};

const MINOR_BODIES = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta', 'North Node', 'South Node', 'Lilith', 'Fortune', 'Vertex', 'East Point'];

function buildHouseRulers(positions: PlanetPosition[]) {
  const ascendant = positions.find((p) => p.name === 'Ascendant');
  const ascSign = ascendant?.sign;
  const startIndex = ascSign ? SIGN_ORDER.indexOf(ascSign as any) : -1;
  const houseSigns = startIndex >= 0
    ? Array.from({ length: 12 }, (_, i) => SIGN_ORDER[(startIndex + i) % SIGN_ORDER.length])
    : [...SIGN_ORDER];

  return houseSigns.map((sign, index) => {
    const ruler = MODERN_RULERS[sign] || 'Unknown';
    const rulerPos = positions.find((p) => p.name === ruler);
    return {
      house: index + 1,
      sign,
      ruler,
      fliesTo: rulerPos?.house ?? 0,
      fliesToSign: rulerPos?.sign,
    };
  });
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

  let birthDate = query.date as string;
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    if (!birthDate) birthDate = new Date().toISOString().split('T')[0];
  }

  return {
    date: birthDate,
    time: query.time as string | undefined,
    city: (geo?.city || city || 'Unknown'),
    lat: hasLat ? Number(latParam) : geo?.lat,
    lon: hasLon ? Number(lonParam) : geo?.lon,
    timezone: hasTimezone ? (timezoneParam as string) : (geo?.timezone || 'UTC'),
    accuracy: (query.accuracy as BirthInput['accuracy']) || 'exact',
  };
}

function positionToAbsDegree(position?: PlanetPosition | null): number | null {
  if (!position) return null;
  const signIndex = SIGN_ORDER.indexOf(position.sign as any);
  if (signIndex < 0) return null;
  return signIndex * 30 + (position.degree || 0) + (position.minute || 0) / 60;
}

function computeChironReturn(natalPositions: PlanetPosition[], transitPositions: PlanetPosition[]) {
  const natal = natalPositions.find((p) => p.name === 'Chiron');
  const transit = transitPositions.find((p) => p.name === 'Chiron');
  const natalDeg = positionToAbsDegree(natal);
  const transitDeg = positionToAbsDegree(transit);
  if (natalDeg === null || transitDeg === null) {
    return { is_return: false };
  }
  const diff = Math.abs(natalDeg - transitDeg);
  const orb = diff > 180 ? 360 - diff : diff;
  return { is_return: orb <= 2, orb: Number(orb.toFixed(2)) };
}

function resolveLang(value: unknown): Language {
  return value === 'en' ? 'en' : 'zh';
}

function resolvePromptId(type: DetailType, context: DetailContext): string {
  return `detail-${type}-${context}`;
}

// 后台处理 Detail AI 生成
async function processDetailTask(taskId: string, body: DetailRequest) {
  try {
    const requestStart = performance.now();
    const { type, context, chartData, transitDate, nameA, nameB, date, birth, dimension } = body;
    const lang = resolveLang(body.lang);
    const promptId = resolvePromptId(type, context);
    let resolvedChartData = chartData;
    let chartSummary: Record<string, unknown> | null = null;
    let transitSummary: Record<string, unknown> | null = null;
    let transitAspects: Record<string, unknown>[] | null = null;
    let specialEvents: Record<string, unknown> | null = null;
    let resolvedDate = date || transitDate || new Date().toISOString().split('T')[0];

    if (context === 'transit' && birth) {
      const birthInput = await parseBirthInput({
        date: birth.date,
        time: birth.time,
        city: birth.city,
        lat: birth.lat,
        lon: birth.lon,
        timezone: birth.timezone,
        accuracy: birth.accuracy,
      });

      const targetDate = new Date(resolvedDate);
      if (Number.isNaN(targetDate.getTime())) {
        resolvedDate = new Date().toISOString().split('T')[0];
      }

      const [chart, transits] = await Promise.all([
        ephemerisService.calculateNatalChart(birthInput),
        ephemerisService.calculateTransits(birthInput, new Date(resolvedDate)),
      ]);

      chartSummary = buildCompactChartSummary(chart) as Record<string, unknown>;
      transitSummary = buildCompactTransitSummary(transits) as Record<string, unknown>;
      transitAspects = (transits.aspects || []) as unknown as Record<string, unknown>[];
      specialEvents = { chiron_return: computeChironReturn(chart.positions, transits.positions) };

      if (!resolvedChartData) {
        if (type === 'planets') {
          resolvedChartData = transits.positions as unknown as Record<string, unknown>;
        } else if (type === 'aspects' || type === 'aspect-matrix') {
          resolvedChartData = transits.aspects as unknown as Record<string, unknown>;
        } else if (type === 'asteroids') {
          resolvedChartData = transits.positions.filter((p) => MINOR_BODIES.includes(p.name)) as unknown as Record<string, unknown>;
        } else if (type === 'rulers') {
          resolvedChartData = buildHouseRulers(chart.positions) as unknown as Record<string, unknown>;
        }
      }
    }

    const requiresChartData = [
      'big3', 'elements', 'aspects', 'planets', 'asteroids',
      'rulers', 'synthesis', 'deep', 'aspect-matrix',
    ].includes(type);
    if (requiresChartData && !resolvedChartData) {
      await failTask(taskId, 'Missing required fields: chartData or birth', 400);
      return;
    }

    const promptContext: Record<string, unknown> = {
      type,
      context,
      chartData: resolvedChartData,
      transitDate,
      date: resolvedDate,
      nameA,
      nameB,
      dimension,
      chart_summary: chartSummary,
      transit_summary: transitSummary,
      transit_aspects: transitAspects,
      special_events: specialEvents,
    };

    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId,
      context: promptContext,
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    console.log(`[Detail] Task ${taskId} completed: type=${type}, context=${context}, aiMs=${aiMs.toFixed(0)}, totalMs=${totalMs.toFixed(0)}`);

    await completeTask(taskId, {
      type,
      context,
      lang: result.lang,
      content: result.content,
    });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      console.warn(`[Detail] Task ${taskId} AIUnavailableError: ${error.reason}`);
      await failTask(taskId, 'AI unavailable', 503);
      return;
    }
    console.error(`[Detail] Task ${taskId} error: ${(error as Error).message}`);
    await failTask(taskId, (error as Error).message, 500);
  }
}

// POST /api/detail - 提交详情解读任务（立即返回 taskId，AI 生成在后台执行）
detailRouter.post('/', async (req, res) => {
  try {
    const body = req.body as DetailRequest;
    const { type, context, chartData } = body;

    // Quick validation only — no slow operations in POST handler
    if (!type || !context) {
      res.status(400).json({ error: 'Missing required fields: type, context' });
      return;
    }

    const validTypes: DetailType[] = [
      'big3',
      'elements',
      'aspects',
      'planets',
      'asteroids',
      'rulers',
      'synthesis',
      'dimension',
      'deep',
      'advice',
      'time-windows',
      'weekly-trend',
      'aspect-matrix',
      'astro-report',
    ];
    const validContexts: DetailContext[] = ['natal', 'transit', 'synastry', 'composite'];

    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    if (!validContexts.includes(context)) {
      res.status(400).json({ error: `Invalid context: ${context}. Must be one of: ${validContexts.join(', ')}` });
      return;
    }

    const requiresChartData = [
      'big3', 'elements', 'aspects', 'planets', 'asteroids',
      'rulers', 'synthesis', 'deep', 'aspect-matrix',
    ].includes(type);
    if (requiresChartData && !chartData && !body.birth) {
      res.status(400).json({ error: 'Missing required fields: chartData or birth' });
      return;
    }

    const taskId = await createTask();
    processDetailTask(taskId, body).catch(async (err) => {
      console.error(`[Detail] Unhandled task error ${taskId}:`, err);
      await failTask(taskId, 'Internal error', 500);
    });

    console.log(`[Detail] Task ${taskId} created: type=${type}, context=${context}`);
    res.json({ taskId, status: 'pending' });
  } catch (error) {
    console.error(`[Detail] Submit error: ${(error as Error).message}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/detail/result/:taskId - 轮询详情解读任务结果
detailRouter.get('/result/:taskId', async (req, res) => {
  const task = await getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found or expired' });
  }
  if (task.status === 'pending') {
    return res.json({ status: 'pending' });
  }
  if (task.status === 'failed') {
    return res.json({ status: 'failed', error: task.error, statusCode: task.statusCode || 500 });
  }
  // completed
  res.json({ status: 'completed', ...task.result });
});

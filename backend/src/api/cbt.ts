// INPUT: CBT API 路由。
// OUTPUT: 导出 cbt 路由（含 AI 分析、紧凑摘要与 Server-Timing）。
// POS: CBT 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { BirthInput, CBTAnalysisResponse, Language } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { generateParallel } from '../services/parallel-generator.js';
import { cacheService } from '../cache/redis.js';
import { resolveLocation } from '../services/geocoding.js';
import { calculateAge, getAgeGroup } from '../utils/age.js';
import { sanitizeUserInput } from '../services/content-security.js';

export const cbtRouter = Router();

// 情绪日记记录保留 3 个月（秒）
const CBT_RETENTION_TTL = 90 * 24 * 60 * 60;

interface CBTRecord {
  id: string;
  timestamp: number;
  situation: string;
  moods: Array<{ id: string; name: string; initialIntensity: number; finalIntensity?: number }>;
  automaticThoughts: string[];
  hotThought: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedEntries: Array<{ id: string; text: string; belief: number }>;
  bodySignal?: string;
  analysis?: unknown;
}

async function parseBirthInput(body: Record<string, unknown>): Promise<BirthInput> {
  const birth = body.birth as Record<string, unknown>;
  const city = (birth.city as string) || '';
  const latParam = birth.lat;
  const lonParam = birth.lon;
  const timezoneParam = birth.timezone as string | undefined;
  const hasLat = latParam !== undefined && latParam !== '';
  const hasLon = lonParam !== undefined && lonParam !== '';
  const hasTimezone = typeof timezoneParam === 'string' && timezoneParam.trim() !== '';
  const shouldResolve = !hasLat || !hasLon || !hasTimezone;
  const geo = shouldResolve ? await resolveLocation(city) : null;
  return {
    date: birth.date as string,
    time: birth.time as string | undefined,
    city: (geo?.city || city || 'Unknown'),
    lat: hasLat ? Number(latParam) : geo?.lat,
    lon: hasLon ? Number(lonParam) : geo?.lon,
    timezone: hasTimezone ? (timezoneParam as string) : (geo?.timezone || 'UTC'),
    accuracy: (birth.accuracy as BirthInput['accuracy']) || 'exact',
  };
}

// POST /api/cbt/analysis - 情绪日记分析
cbtRouter.post('/analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(req.body);
    const { situation: rawSituation, moods, automaticThoughts, hotThought, evidenceFor, evidenceAgainst, balancedEntries, bodySignal, moodGroup, scene, sleep, bodyTags, note: rawNote } = req.body;
    const situation = rawSituation ? sanitizeUserInput(rawSituation) : rawSituation;
    const note = rawNote ? sanitizeUserInput(rawNote) : rawNote;

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'cbt-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        cbt_record: {
          // 新字段（心情日记 v2）
          moodGroup,
          moods,
          scene,
          sleep,
          bodyTags,
          note,
          // 向后兼容旧字段
          situation,
          automaticThoughts,
          hotThought,
          evidenceFor,
          evidenceAgainst,
          balancedEntries,
          bodySignal,
        },
      },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ lang: result.lang, content: result.content } as CBTAnalysisResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/cbt/aggregate-analysis - 情绪日记聚合分析 (月度/阶段性)
cbtRouter.post('/aggregate-analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(req.body);
    const { period, somatic_stats, root_stats, mood_stats, competence_stats } = req.body;

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const result = await generateAIContent({
      promptId: 'cbt-aggregate-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        period,
        somatic_stats,
        root_stats,
        mood_stats,
        competence_stats
      },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ lang: result.lang, content: result.content });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/cbt/somatic-analysis - 身心信号统计报告
cbtRouter.post('/somatic-analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(req.body);
    const { period, somatic_stats } = req.body;

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const result = await generateAIContent({
      promptId: 'cbt-somatic-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        period,
        somatic_stats
      },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ lang: result.lang, content: result.content });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/cbt/root-analysis - 根源与资源统计报告
cbtRouter.post('/root-analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(req.body);
    const { period, root_stats } = req.body;

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const result = await generateAIContent({
      promptId: 'cbt-root-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        period,
        root_stats
      },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ lang: result.lang, content: result.content });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/cbt/mood-analysis - 情绪配方统计报告
cbtRouter.post('/mood-analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(req.body);
    const { period, mood_stats } = req.body;

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const result = await generateAIContent({
      promptId: 'cbt-mood-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        period,
        mood_stats
      },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ lang: result.lang, content: result.content });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/cbt/competence-analysis - 内在力量统计报告
cbtRouter.post('/competence-analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(req.body);
    const { period, competence_stats } = req.body;

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const result = await generateAIContent({
      promptId: 'cbt-competence-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        period,
        competence_stats
      },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ lang: result.lang, content: result.content });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// 批量分析类型映射
const BATCH_PROMPT_MAP: Record<string, string> = {
  somatic: 'cbt-somatic-analysis',
  root: 'cbt-root-analysis',
  mood: 'cbt-mood-analysis',
  competence: 'cbt-competence-analysis',
};

// POST /api/cbt/batch-analysis - 批量并行分析（多种分析类型同时生成）
cbtRouter.post('/batch-analysis', async (req, res) => {
  try {
    const requestStart = performance.now();
    const langInput = (req.body as Record<string, unknown>).lang;
    const lang = (langInput === 'en' ? 'en' : 'zh') as import('../types/api.js').Language;
    const birth = await parseBirthInput(req.body);
    const { types, period, somatic_stats, root_stats, mood_stats, competence_stats } = req.body as Record<string, any>;

    // 验证 types 参数
    const validTypes = (types as string[] || []).filter(t => t in BATCH_PROMPT_MAP);
    if (validTypes.length === 0) {
      return res.status(400).json({ error: 'types must contain at least one of: somatic, root, mood, competence' });
    }

    const coreStart = performance.now();
    const now = new Date();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, now),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);

    // 构建每个分析类型的独立上下文
    const sharedContext = {
      chart_summary: chartSummary,
      transit_summary: transitSummary,
      userAge,
      userAgeGroup,
      userBirthDate: birth.date,
      period,
    };

    const statsMap: Record<string, Record<string, unknown>> = {
      somatic: { somatic_stats },
      root: { root_stats },
      mood: { mood_stats },
      competence: { competence_stats },
    };

    const contextMap: Record<string, Record<string, unknown>> = {};
    const promptIds: string[] = [];
    for (const type of validTypes) {
      const promptId = BATCH_PROMPT_MAP[type];
      promptIds.push(promptId);
      contextMap[promptId] = { ...sharedContext, ...statsMap[type] };
    }

    const aiStart = performance.now();
    const parallelResult = await generateParallel({
      promptIds,
      sharedContext,
      contextMap,
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    // 转换结果：promptId → type
    const results: Record<string, unknown> = {};
    for (const type of validTypes) {
      const promptId = BATCH_PROMPT_MAP[type];
      const r = parallelResult.results.get(promptId);
      results[type] = r?.success
        ? { lang: r.content?.lang, content: r.content?.content }
        : { error: r?.error || 'unknown error' };
    }

    res.json({
      results,
      successCount: parallelResult.successCount,
      failCount: parallelResult.failCount,
      totalMs: Math.round(parallelResult.totalMs),
    });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/cbt/records - 创建情绪日记记录
cbtRouter.post('/records', async (req, res) => {
  try {
    const { userId, record } = req.body as { userId: string; record: CBTRecord };
    const key = `cbt:records:${userId}`;

    // 获取现有记录
    const existing = await cacheService.get<CBTRecord[]>(key) || [];

    // 添加新记录
    existing.push(record);

    // 过滤过期记录（3 个月前）
    const cutoff = Date.now() - CBT_RETENTION_TTL * 1000;
    const filtered = existing.filter(r => r.timestamp > cutoff);

    // 保存（带 TTL）
    await cacheService.set(key, filtered, CBT_RETENTION_TTL);

    res.json({ success: true, count: filtered.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/cbt/records - 获取情绪日记记录列表
cbtRouter.get('/records', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const key = `cbt:records:${userId}`;

    const records = await cacheService.get<CBTRecord[]>(key) || [];

    // 过滤过期记录
    const cutoff = Date.now() - CBT_RETENTION_TTL * 1000;
    const filtered = records.filter(r => r.timestamp > cutoff);

    res.json({ records: filtered });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

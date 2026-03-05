// INPUT: CBT API 路由。
// OUTPUT: 导出 cbt 路由（含 AI 分析、紧凑摘要与 Server-Timing）。
// POS: CBT 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BirthInput, Language } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { generateParallel } from '../services/parallel-generator.js';
import { cacheService } from '../cache/redis.js';
import { resolveLocation } from '../services/geocoding.js';
import { calculateAge, getAgeGroup } from '../utils/age.js';
import { sanitizeUserInput } from '../services/content-security.js';
import { createTask, completeTask, failTask, getTask } from '../utils/taskStore.js';
import { isDatabaseConfigured, upsert, query } from '../db/mysql.js';
import type { DbCbtRecord } from '../db/mysql.js';

export const cbtRouter = Router();

// 情绪日记记录保留 3 个月（秒）
const CBT_RETENTION_TTL = 90 * 24 * 60 * 60;

interface CBTRecord {
  id: string;
  timestamp: number;
  date?: string;
  dateKey?: string;
  moodGroup?: unknown;
  moods: unknown[];
  scene?: unknown;
  sleep?: unknown;
  bodyTags?: unknown[];
  note?: string;
  situation: string;
  automaticThoughts: string[];
  hotThought: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedEntries: unknown[];
  bodySignal?: string;
  summary?: string;
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

// 后台处理 CBT AI 分析
async function processCbtAnalysisTask(taskId: string, body: Record<string, unknown>) {
  try {
    const requestStart = performance.now();
    const langInput = body.lang;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const birth = await parseBirthInput(body);
    const { situation: rawSituation, moods, automaticThoughts, hotThought, evidenceFor, evidenceAgainst, balancedEntries, bodySignal, moodGroup, scene, sleep, bodyTags, note: rawNote } = body;
    const situation = rawSituation ? sanitizeUserInput(rawSituation as string) : rawSituation;
    const note = rawNote ? sanitizeUserInput(rawNote as string) : rawNote;

    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, new Date()),
    ]);
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const result = await generateAIContent({
      promptId: 'cbt-analysis',
      context: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
        cbt_record: {
          moodGroup, moods, scene, sleep, bodyTags, note,
          situation, automaticThoughts, hotThought, evidenceFor, evidenceAgainst, balancedEntries, bodySignal,
        },
      },
      lang,
    });

    const totalMs = performance.now() - requestStart;
    console.log(`[CBT] Task ${taskId} completed: totalMs=${totalMs.toFixed(0)}, contentSize=${JSON.stringify(result.content).length}`);
    await completeTask(taskId, { lang: result.lang, content: result.content } as unknown as Record<string, unknown>);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      console.warn(`[CBT] Task ${taskId} AIUnavailableError: ${error.reason}`);
      await failTask(taskId, 'AI unavailable', 503);
      return;
    }
    console.error(`[CBT] Task ${taskId} error: ${(error as Error).message}`);
    await failTask(taskId, (error as Error).message, 500);
  }
}

// POST /api/cbt/analysis - 提交情绪日记分析任务（立即返回 taskId）
cbtRouter.post('/analysis', async (req, res) => {
  try {
    const taskId = await createTask();
    processCbtAnalysisTask(taskId, req.body as Record<string, unknown>)
      .catch(async (err) => {
        console.error(`[CBT] Unhandled task error ${taskId}:`, err);
        await failTask(taskId, 'Internal error', 500);
      });
    console.log(`[CBT] Analysis task ${taskId} created`);
    res.json({ taskId, status: 'pending' });
  } catch (error) {
    console.error(`[CBT] Submit error: ${(error as Error).message}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/cbt/analysis/result/:taskId - 轮询分析结果
cbtRouter.get('/analysis/result/:taskId', async (req, res) => {
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
  res.json({ status: 'completed', ...task.result });
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
    const { userId, dateKey, record } = req.body as { userId: string; dateKey?: string; record: CBTRecord };
    const useDb = isDatabaseConfigured() && userId !== 'anonymous';

    if (useDb) {
      // MySQL 持久化：upsert by (user_id, date_key)
      const dk = dateKey || record.dateKey || new Date(record.timestamp).toISOString().slice(0, 10);
      const recordDate = record.date || new Date(record.timestamp).toISOString();

      await upsert<DbCbtRecord>('cbt_records', {
        id: uuidv4(),
        user_id: userId,
        date_key: dk,
        record_date: recordDate,
        timestamp: record.timestamp,
        mood_group: record.moodGroup ?? null,
        moods: record.moods ?? null,
        scene: record.scene ?? null,
        sleep_tag: record.sleep ?? null,
        body_tags: record.bodyTags ?? null,
        note: record.note ?? null,
        situation: record.situation ?? null,
        automatic_thoughts: record.automaticThoughts ?? null,
        hot_thought: record.hotThought ?? null,
        evidence_for: record.evidenceFor ?? null,
        evidence_against: record.evidenceAgainst ?? null,
        balanced_entries: record.balancedEntries ?? null,
        body_signal: record.bodySignal ?? null,
        summary: record.summary ?? null,
      });

      // 查询该用户总记录数
      const rows = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM cbt_records WHERE user_id = ?', [userId]);
      const count = rows[0]?.cnt ?? 0;
      res.json({ success: true, count });
    } else {
      // Fallback: Redis/内存缓存（anonymous 用户或无 DB）
      const key = `cbt:records:${userId}`;
      const existing = await cacheService.get<CBTRecord[]>(key) || [];
      existing.push(record);
      const cutoff = Date.now() - CBT_RETENTION_TTL * 1000;
      const filtered = existing.filter(r => r.timestamp > cutoff);
      await cacheService.set(key, filtered, CBT_RETENTION_TTL);
      res.json({ success: true, count: filtered.length });
    }
  } catch (error) {
    console.error('[CBT] Save record error:', (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/cbt/records - 获取情绪日记记录列表
cbtRouter.get('/records', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const useDb = isDatabaseConfigured() && userId !== 'anonymous';

    if (useDb) {
      // MySQL 查询
      const rows = await query<DbCbtRecord>(
        'SELECT * FROM cbt_records WHERE user_id = ? ORDER BY date_key DESC',
        [userId]
      );
      // snake_case → camelCase 映射回前端格式
      const records = rows.map(r => ({
        id: r.id,
        timestamp: Number(r.timestamp),
        date: r.record_date,
        dateKey: r.date_key,
        moodGroup: r.mood_group,
        moods: r.moods ?? [],
        scene: r.scene,
        sleep: r.sleep_tag,
        bodyTags: r.body_tags ?? [],
        note: r.note ?? '',
        situation: r.situation ?? '',
        automaticThoughts: r.automatic_thoughts ?? [],
        hotThought: r.hot_thought ?? '',
        evidenceFor: r.evidence_for ?? [],
        evidenceAgainst: r.evidence_against ?? [],
        balancedEntries: r.balanced_entries ?? [],
        bodySignal: r.body_signal ?? '',
        summary: r.summary ?? '',
      }));
      res.json({ records });
    } else {
      // Fallback: Redis/内存缓存
      const key = `cbt:records:${userId}`;
      const records = await cacheService.get<CBTRecord[]>(key) || [];
      const cutoff = Date.now() - CBT_RETENTION_TTL * 1000;
      const filtered = records.filter(r => r.timestamp > cutoff);
      res.json({ records: filtered });
    }
  } catch (error) {
    console.error('[CBT] Get records error:', (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
});

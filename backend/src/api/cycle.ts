// INPUT: Cycle API 路由。
// OUTPUT: 导出 cycle 路由（list/naming 与单语言输出、Server-Timing）。
// POS: Cycle 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { BirthInput, CycleListResponse, CycleNamingResponse, Language } from '../types/api.js';
import { ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { resolveLocation } from '../services/geocoding.js';

export const cycleRouter = Router();

async function parseBirthInput(query: Record<string, unknown>): Promise<BirthInput> {
  const city = query.city as string;
  const geo = await resolveLocation(city);
  const latParam = query.lat;
  const lonParam = query.lon;
  return {
    date: query.date as string,
    time: query.time as string | undefined,
    city: geo.city,
    lat: latParam === undefined || latParam === '' ? geo.lat : Number(latParam),
    lon: lonParam === undefined || lonParam === '' ? geo.lon : Number(lonParam),
    timezone: query.timezone as string || geo.timezone,
    accuracy: (query.accuracy as BirthInput['accuracy']) || 'exact',
  };
}

function resolveLang(value: unknown): Language {
  return value === 'en' ? 'en' : 'zh';
}

// GET /api/cycle/list - 周期列表
cycleRouter.get('/list', async (req, res) => {
  try {
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    const months = Number(req.query.months) || 12;
    const cycles = await ephemerisService.calculateCycles(birth, months);
    res.json({ cycles } as CycleListResponse);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/cycle/naming - 周期命名
cycleRouter.get('/naming', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const { planet, cycleType, start, peak, end } = req.query as Record<string, string>;
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'cycle-naming',
      context: { planet, cycleType, start, peak, end },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=0,ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);
    res.json({ lang: result.lang, content: result.content } as CycleNamingResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

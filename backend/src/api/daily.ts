// INPUT: Daily API 路由。
// OUTPUT: 导出 daily 路由（含 detail、紧凑摘要与 Server-Timing）。
// POS: Daily 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { BirthInput, DailyResponse, DailyDetailResponse, Language, PlanetPosition } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';
import { resolveLocation } from '../services/geocoding.js';
import { SIGNS, PLANETS } from '../data/sources.js';

export const dailyRouter = Router();

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
  
  let birthDate = query.birthDate as string;
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    if (!birthDate) birthDate = new Date().toISOString().split('T')[0];
  }

  return {
    date: birthDate,
    time: query.birthTime as string | undefined,
    city: (geo?.city || city || 'Unknown'),
    lat: hasLat ? Number(latParam) : geo?.lat,
    lon: hasLon ? Number(lonParam) : geo?.lon,
    timezone: hasTimezone ? (timezoneParam as string) : (geo?.timezone || 'UTC'),
    accuracy: (query.accuracy as BirthInput['accuracy']) || 'exact',
  };
}

// GET /api/daily - 每日运势
dailyRouter.get('/', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang: Language = 'zh';
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    let date = new Date(req.query.date as string || new Date().toISOString().split('T')[0]);
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, date),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'daily-forecast',
      context: { chart_summary: chartSummary, transit_summary: transitSummary, date: date.toISOString().split('T')[0] },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    const technical = {
      transit_planets: transits.positions.filter(p => PLANETS.includes(p.name as any)),
      transit_asteroids: transits.positions.filter(p => MINOR_BODIES.includes(p.name)),
      house_rulers: buildHouseRulers(chart.positions),
      cross_aspects: transits.aspects,
    };

    res.json({ transits, natal: chart, technical, lang: result.lang, content: result.content } as DailyResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/daily/detail - 详细日运
dailyRouter.get('/detail', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang: Language = 'zh';
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    let date = new Date(req.query.date as string || new Date().toISOString().split('T')[0]);
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, date),
    ]);
    const coreMs = performance.now() - coreStart;
    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'daily-detail',
      context: { chart_summary: chartSummary, transit_summary: transitSummary, date: date.toISOString().split('T')[0] },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({ transits, lang: result.lang, content: result.content } as DailyDetailResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

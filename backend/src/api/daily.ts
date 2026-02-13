// INPUT: Daily API 路由。
// OUTPUT: 导出 daily 路由（含 detail、full 并行与 stream 端点、紧凑摘要与 Server-Timing）。
// POS: Daily 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { BirthInput, DailyResponse, DailyDetailResponse, Language, PlanetPosition } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContent, generateAIContentWithMeta } from '../services/ai.js';
import { generateParallel, extractSuccessContent } from '../services/parallel-generator.js';
import { getCompactPortrait } from '../services/user-portrait.js';
import { compactTransitSummary as transitToString } from '../prompts/core/compact.js';
import { resolveLocation } from '../services/geocoding.js';
import { SIGNS, PLANETS } from '../data/sources.js';
import { calculateAge, getAgeGroup } from '../utils/age.js';

export const dailyRouter = Router();

function writeSSE(res: any, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
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

// === 首页卡片评分逻辑（与前端 home.js 保持一致） ===

const MOON_THEME: Record<string, { title: string; desc: string; color: string; base: number }> = {
  Aries:       { title: '行动力充沛的一天', desc: '月亮落入白羊座，直觉敏锐，适合主动出击、开启新计划。', color: '红色', base: 72 },
  Taurus:      { title: '稳步积累的一天', desc: '月亮落入金牛座，身体和感官需要被照顾，适合享受美食与自然。', color: '绿色', base: 70 },
  Gemini:      { title: '灵感活跃的一天', desc: '月亮落入双子座，思维敏捷、社交欲增强，适合沟通与学习。', color: '金色', base: 68 },
  Cancer:      { title: '关注内心的一天', desc: '月亮落入巨蟹座，情感细腻，适合陪伴家人、整理内在感受。', color: '白色', base: 66 },
  Leo:         { title: '展现自我的一天', desc: '月亮落入狮子座，创造力和表现欲旺盛，适合大胆表达。', color: '橙色', base: 74 },
  Virgo:       { title: '精细梳理的一天', desc: '月亮落入处女座，注意力集中在细节上，适合规划和优化。', color: '大地棕', base: 65 },
  Libra:       { title: '和谐共处的一天', desc: '月亮落入天秤座，人际关系和审美感受力提升，适合合作与社交。', color: '粉色', base: 70 },
  Scorpio:     { title: '深度探索的一天', desc: '月亮落入天蝎座，洞察力增强，适合面对深层议题、做重要决定。', color: '深蓝', base: 64 },
  Sagittarius: { title: '视野开阔的一天', desc: '月亮落入射手座，乐观向上，适合探索新领域、接触不同文化。', color: '紫色', base: 73 },
  Capricorn:   { title: '脚踏实地的一天', desc: '月亮落入摩羯座，务实能量强，适合处理重要事务、推进长期目标。', color: '大地棕', base: 67 },
  Aquarius:    { title: '突破常规的一天', desc: '月亮落入水瓶座，思维跳脱，适合尝试新方法、关注社群议题。', color: '天蓝', base: 69 },
  Pisces:      { title: '灵性滋养的一天', desc: '月亮落入双鱼座，感受力和共情能力增强，适合艺术创作与冥想。', color: '紫色', base: 68 },
};

const ASPECT_HINT: Record<string, { text: string; score: number }> = {
  'Sun-Jupiter-trine':       { text: '太阳拱木星，信心和好运同步上升。', score: 6 },
  'Sun-Jupiter-conjunction': { text: '太阳合木星，扩展与机遇的能量汇聚。', score: 5 },
  'Sun-Jupiter-sextile':     { text: '太阳六合木星，小幸运悄然降临。', score: 4 },
  'Venus-Jupiter-trine':     { text: '金星拱木星，人际与财运都很顺畅。', score: 6 },
  'Venus-Jupiter-conjunction': { text: '金星合木星，感情和物质层面都有好消息。', score: 5 },
  'Venus-Mars-conjunction':  { text: '金星合火星，感情中充满激情和吸引力。', score: 3 },
  'Venus-Mars-trine':        { text: '金星拱火星，情感表达与行动力和谐统一。', score: 4 },
  'Mercury-Jupiter-trine':   { text: '水星拱木星，思路清晰，学习效率翻倍。', score: 5 },
  'Mercury-Jupiter-sextile': { text: '水星六合木星，沟通顺畅、思维开阔。', score: 3 },
  'Moon-Venus-trine':        { text: '月亮拱金星，情感细腻，人际关系温润。', score: 4 },
  'Moon-Venus-conjunction':  { text: '月亮合金星，内心柔软，适合表达爱意。', score: 3 },
  'Moon-Jupiter-trine':      { text: '月亮拱木星，情绪乐观，直觉可信赖。', score: 5 },
  'Sun-Saturn-square':       { text: '太阳刑土星，可能感到压力，但也是磨炼耐力的时机。', score: -4 },
  'Sun-Saturn-opposition':   { text: '太阳冲土星，外部阻力增大，需要耐心应对。', score: -5 },
  'Moon-Saturn-square':      { text: '月亮刑土星，情绪低沉，给自己多一些空间。', score: -3 },
  'Moon-Saturn-opposition':  { text: '月亮冲土星，内心感到孤独或受限，试着放松。', score: -4 },
  'Mars-Saturn-square':      { text: '火星刑土星，行动受阻，不宜冲动决策。', score: -4 },
  'Mars-Saturn-opposition':  { text: '火星冲土星，挫败感较强，适合放慢节奏。', score: -5 },
  'Mercury-Saturn-square':   { text: '水星刑土星，沟通容易受阻，措辞需谨慎。', score: -3 },
  'Mercury-Neptune-square':  { text: '水星刑海王星，信息容易混淆，重要决定再确认。', score: -3 },
  'Venus-Saturn-square':     { text: '金星刑土星，关系中可能有距离感，保持真诚。', score: -3 },
  'Sun-Pluto-square':        { text: '太阳刑冥王星，深层转化在发生，觉察内在的控制欲。', score: -3 },
  'Sun-Uranus-trine':        { text: '太阳拱天王星，突然的灵感和机遇，拥抱变化。', score: 4 },
  'Sun-Uranus-square':       { text: '太阳刑天王星，计划可能被打乱，灵活应变。', score: -3 },
  'Venus-Neptune-trine':     { text: '金星拱海王星，浪漫氛围浓厚，灵感与美感倍增。', score: 4 },
  'Mars-Jupiter-trine':      { text: '火星拱木星，行动力与好运兼得，适合推进大事。', score: 5 },
  'Mars-Pluto-conjunction':  { text: '火星合冥王星，意志力极强，深度变革的能量。', score: 2 },
};

const stripAspectPrefix = (n: string) => n.replace(/^[TN]-/, '');

/** 基于行运数据计算首页评分和摘要（与前端保持一致） */
function interpretTransit(transits: { positions: PlanetPosition[]; aspects: any[] }): {
  summary: string; description: string; score: number;
} {
  const positions = transits.positions || [];
  const aspects = transits.aspects || [];

  const moonPos = positions.find((p: any) => p.name === 'Moon');
  const moonSign = moonPos?.sign || 'Aries';
  const theme = MOON_THEME[moonSign] || MOON_THEME.Aries;

  const hints: { text: string; score: number }[] = [];
  for (const a of aspects) {
    const p1 = stripAspectPrefix(a.planet1);
    const p2 = stripAspectPrefix(a.planet2);
    const hint = ASPECT_HINT[`${p1}-${p2}-${a.type}`] || ASPECT_HINT[`${p2}-${p1}-${a.type}`];
    if (hint) hints.push(hint);
  }
  hints.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  let scoreAdj = 0;
  for (let i = 0; i < Math.min(hints.length, 5); i++) {
    scoreAdj += hints[i].score * Math.pow(0.6, i);
  }
  const score = Math.max(30, Math.min(95, Math.round(theme.base + scoreAdj)));

  const bestHint = hints[0] || null;
  const summary = theme.title;
  const description = bestHint ? bestHint.text : theme.desc;

  return { summary, description, score };
}

// === 幸运数字：行星数理学（Planetary Numerology） ===
// Sun=1, Moon=2, Jupiter=3, Uranus=4, Mercury=5, Venus=6, Neptune=7, Saturn=8, Mars=9
const PLANET_NUMBER: Record<string, number> = {
  Sun: 1, Moon: 2, Jupiter: 3, Uranus: 4, Mercury: 5,
  Venus: 6, Neptune: 7, Saturn: 8, Mars: 9, Pluto: 9,
};

// === 吉位：元素方位体系（四元素 × 八方位） ===
// 火→南 土→西 风→东 水→北；细分方位由太阳星座元素交叉决定
const SIGN_ELEMENT: Record<string, string> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water',
};

// 主方位（月亮星座元素决定）
const ELEMENT_DIRECTION: Record<string, string> = {
  fire: '南方', earth: '西方', air: '东方', water: '北方',
};

// 细分方位：月亮元素主导主方位，太阳元素交叉细分出八方位
const CROSS_DIRECTION: Record<string, Record<string, string>> = {
  fire:  { fire: '南方', earth: '西南', air: '东南', water: '南方' },
  earth: { fire: '西南', earth: '西方', air: '西方', water: '西北' },
  air:   { fire: '东南', earth: '东方', air: '东方', water: '东北' },
  water: { fire: '北方', earth: '西北', air: '东北', water: '北方' },
};

/** 基于日月星座计算确定性幸运值（轻量版，不遍历 aspects） */
function computeLuckyFromSigns(moonSign: string, sunSign: string) {
  const moonRuler = MODERN_RULERS[moonSign] || 'Mars';
  const luckyNumber = (PLANET_NUMBER[moonRuler] || 1).toString();
  const moonElement = SIGN_ELEMENT[moonSign] || 'fire';
  const sunElement = SIGN_ELEMENT[sunSign] || 'fire';
  const luckyDirection = CROSS_DIRECTION[moonElement]?.[sunElement]
    || ELEMENT_DIRECTION[moonElement]
    || '南方';
  const luckyColor = (MOON_THEME[moonSign] || MOON_THEME.Aries).color;
  return { color: luckyColor, number: luckyNumber, direction: luckyDirection };
}

/** 基于行运数据计算确定性幸运值 + 评分摘要（完整版，/transit 端点用） */
function computeLucky(transits: { positions: PlanetPosition[]; aspects: any[] }) {
  const interpreted = interpretTransit(transits);
  const lucky = computeLuckyFromPositions(transits.positions);
  return { ...lucky, interpreted };
}

/** 从行运位置中提取日月星座并计算幸运值（/full、/full/stream 端点用） */
function computeLuckyFromPositions(positions: PlanetPosition[]) {
  const moonPos = positions.find((p: any) => p.name === 'Moon');
  const sunPos = positions.find((p: any) => p.name === 'Sun');
  return computeLuckyFromSigns(moonPos?.sign || 'Aries', sunPos?.sign || 'Aries');
}

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

/** 快速解析出生数据（不调用 geocoding，适用于快速端点） */
function parseBirthInputFast(query: Record<string, unknown>): BirthInput {
  const latParam = query.lat;
  const lonParam = query.lon;
  const hasLat = latParam !== undefined && latParam !== '';
  const hasLon = lonParam !== undefined && lonParam !== '';

  if (!hasLat || !hasLon) {
    throw new Error('快速端点需要 lat/lon 参数');
  }

  let birthDate = query.birthDate as string;
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    if (!birthDate) birthDate = new Date().toISOString().split('T')[0];
  }

  return {
    date: birthDate,
    time: query.birthTime as string | undefined,
    city: (query.city as string) || 'Unknown',
    lat: Number(latParam),
    lon: Number(lonParam),
    timezone: (query.timezone as string) || 'UTC',
    accuracy: (query.accuracy as BirthInput['accuracy']) || 'exact',
  };
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

    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'daily-forecast',
      context: { chart_summary: chartSummary, transit_summary: transitSummary, date: date.toISOString().split('T')[0], userAge, userAgeGroup, userBirthDate: birth.date },
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

// GET /api/daily/transit - 纯确定性行运计算数据（无 AI 调用）
dailyRouter.get('/transit', async (req, res) => {
  try {
    const requestStart = performance.now();
    const query = req.query as Record<string, unknown>;
    // 优先使用快速解析（无 geocoding），缺少 lat/lon 时 fallback
    let birth: BirthInput;
    try {
      birth = parseBirthInputFast(query);
    } catch {
      birth = await parseBirthInput(query);
    }
    let date = new Date(query.date as string || new Date().toISOString().split('T')[0]);
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, date),
    ]);
    const coreMs = performance.now() - coreStart;

    const technical = {
      transit_planets: transits.positions.filter(p => PLANETS.includes(p.name as any)),
      transit_asteroids: transits.positions.filter(p => MINOR_BODIES.includes(p.name)),
      house_rulers: buildHouseRulers(chart.positions),
      cross_aspects: transits.aspects,
    };

    // 后端内部计算评分和摘要（与前端保持一致的算法）
    const { color: luckyColor, number: luckyNumber, direction: luckyDirection, interpreted } = computeLucky(transits);

    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({
      natal: chart,
      transits,
      technical,
      homeCard: null, // TODO: 前端不再读取此字段，待旧版本淘汰后移除
      // 后端计算的评分数据，前端可直接使用
      interpreted: {
        score: interpreted.score,
        summary: interpreted.summary,
        description: interpreted.description,
        luckyColor: luckyColor,
        luckyNumber: luckyNumber,
        luckyDirection: luckyDirection,
      },
    });
  } catch (error) {
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

    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId: 'daily-detail',
      context: { chart_summary: chartSummary, transit_summary: transitSummary, date: date.toISOString().split('T')[0], userAge, userAgeGroup, userBirthDate: birth.date },
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

// GET /api/daily/full - 并行生成所有日运内容（forecast + detail）
dailyRouter.get('/full', async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang: Language = 'zh';
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    let date = new Date(req.query.date as string || new Date().toISOString().split('T')[0]);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    const dateStr = date.toISOString().split('T')[0];

    // 1. 计算星盘与行运（并行）
    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, date),
    ]);
    const coreMs = performance.now() - coreStart;

    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    // 2. 获取用户画像（可选，失败不阻断）
    let portraitStr = '';
    try {
      portraitStr = await getCompactPortrait({
        date: birth.date,
        time: birth.time,
        lat: birth.lat,
        lon: birth.lon,
        timezone: birth.timezone,
      });
    } catch {
      // 画像不可用时静默跳过
    }

    // 3. 构建种子摘要（行运 + 画像）
    const seedParts: string[] = [transitToString(transitSummary)];
    if (portraitStr) seedParts.push(portraitStr);
    const seedSummary = seedParts.join('\n');

    // 4. 注入用户年龄
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);

    // 5. 并行生成 forecast + detail
    const aiStart = performance.now();
    const parallelResult = await generateParallel({
      promptIds: ['daily-forecast', 'daily-detail'],
      sharedContext: {
        chart_summary: chartSummary,
        transit_summary: transitSummary,
        date: dateStr,
        userAge,
        userAgeGroup,
        userBirthDate: birth.date,
      },
      seedSummary,
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;

    // 5. Server-Timing 头
    res.setHeader(
      'Server-Timing',
      `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`
    );

    // 6. 提取内容
    const contents = extractSuccessContent(parallelResult.results);

    // 7. 构建技术数据（同 forecast 端点）
    const technical = {
      transit_planets: transits.positions.filter(p => PLANETS.includes(p.name as any)),
      transit_asteroids: transits.positions.filter(p => MINOR_BODIES.includes(p.name)),
      house_rulers: buildHouseRulers(chart.positions),
      cross_aspects: transits.aspects,
    };

    // 8. 确定性幸运值 + 评分（与 /transit 端点一致，完整版含 score）
    const { interpreted: luckyInterp, ...luckyBase } = computeLucky(transits);
    const lucky = { ...luckyBase, score: luckyInterp.score };

    res.json({
      chart: { natal: chart, transits, technical },
      forecast: contents['daily-forecast'] ?? null,
      detail: contents['daily-detail'] ?? null,
      lucky,
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

// GET /api/daily/full/stream - 模块级 SSE 流式输出
dailyRouter.get('/full/stream', async (req, res) => {
  const requestStart = performance.now();
  let headersSent = false;
  try {
    const lang: Language = 'zh';
    const birth = await parseBirthInput(req.query as Record<string, unknown>);
    let date = new Date(req.query.date as string || new Date().toISOString().split('T')[0]);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    const dateStr = date.toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Trailer', 'Server-Timing');
    res.flushHeaders();
    headersSent = true;

    let disconnected = false;
    req.on('close', () => { disconnected = true; });

    // 1. 计算星盘与行运（并行）
    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, date),
    ]);
    const coreMs = performance.now() - coreStart;

    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    // 2. 获取用户画像（可选，失败不阻断）
    let portraitStr = '';
    try {
      portraitStr = await getCompactPortrait({
        date: birth.date,
        time: birth.time,
        lat: birth.lat,
        lon: birth.lon,
        timezone: birth.timezone,
      });
    } catch {
      // 画像不可用时静默跳过
    }

    // 3. 构建种子摘要（行运 + 画像）
    const seedParts: string[] = [transitToString(transitSummary)];
    if (portraitStr) seedParts.push(portraitStr);
    const seedSummary = seedParts.join('\n');

    // 技术数据（同 forecast 端点）
    const technical = {
      transit_planets: transits.positions.filter(p => PLANETS.includes(p.name as any)),
      transit_asteroids: transits.positions.filter(p => MINOR_BODIES.includes(p.name)),
      house_rulers: buildHouseRulers(chart.positions),
      cross_aspects: transits.aspects,
    };

    // 确定性幸运值 + 评分（与 /transit 端点一致，完整版含 score）
    const { interpreted: luckyStreamInterp, ...luckyStreamBase } = computeLucky(transits);
    const luckyStream = { ...luckyStreamBase, score: luckyStreamInterp.score };

    if (!disconnected) {
      writeSSE(res, {
        type: 'meta',
        chart: { natal: chart, transits, technical },
        lucky: luckyStream,
        timing: { coreMs: Math.round(coreMs) },
      });
    }

    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);
    const baseContext: Record<string, unknown> = {
      chart_summary: chartSummary,
      transit_summary: transitSummary,
      date: dateStr,
      userAge,
      userAgeGroup,
      userBirthDate: birth.date,
    };
    if (seedSummary) baseContext._seedSummary = seedSummary;

    const promptMap: Record<string, string> = {
      'daily-forecast': 'forecast',
      'daily-detail': 'detail',
    };

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

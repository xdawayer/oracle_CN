// INPUT: Synastry API 路由（含综述分区懒加载、权益校验与技术附录同步）。
// OUTPUT: 导出 synastry 路由（含 overview 分区端点与权益校验逻辑）。
// POS: Synastry 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type {
  BirthInput,
  SynastryResponse,
  SynastryData,
  SynastryTechnicalData,
  SynastrySuggestion,
  SynastryTab,
  SynastryOverviewSection,
  SynastryOverviewSectionResponse,
  Language,
  ExtendedNatalData,
  NatalChart,
  Aspect,
  PlanetPosition,
} from '../types/api.js';
import { ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContentWithMeta } from '../services/ai.js';
import { ASPECT_TYPES, PLANETS, SIGNS } from '../data/sources.js';
import { authMiddleware } from './auth.js';
import entitlementServiceV2 from '../services/entitlementServiceV2.js';
import { PRICING } from '../config/auth.js';
import { isSupabaseConfigured, type SynastryPersonInfo } from '../db/supabase.js';

export const synastryRouter = Router();

const SIGN_ORDER = [...SIGNS];
const ELEMENT_META: Record<string, { element: string; modality: string }> = {
  Aries: { element: 'Fire', modality: 'Cardinal' },
  Taurus: { element: 'Earth', modality: 'Fixed' },
  Gemini: { element: 'Air', modality: 'Mutable' },
  Cancer: { element: 'Water', modality: 'Cardinal' },
  Leo: { element: 'Fire', modality: 'Fixed' },
  Virgo: { element: 'Earth', modality: 'Mutable' },
  Libra: { element: 'Air', modality: 'Cardinal' },
  Scorpio: { element: 'Water', modality: 'Fixed' },
  Sagittarius: { element: 'Fire', modality: 'Mutable' },
  Capricorn: { element: 'Earth', modality: 'Cardinal' },
  Aquarius: { element: 'Air', modality: 'Fixed' },
  Pisces: { element: 'Water', modality: 'Mutable' },
};

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

const MAJOR_BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Ascendant',
  'Descendant',
  'Midheaven',
  'IC',
];
const ELEMENT_BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];
const MINOR_BODIES = [
  'Chiron',
  'Ceres',
  'Pallas',
  'Juno',
  'Vesta',
  'North Node',
  'South Node',
  'Lilith',
  'Fortune',
  'Vertex',
  'East Point',
];
const ASPECT_BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'North Node',
  'Ascendant',
  'Descendant',
  'Midheaven',
  'IC',
];
const OVERVIEW_SIGNAL_LIMIT = 3;
const OVERVIEW_SWEET_LIMIT = 4;
const OVERVIEW_FRICTION_LIMIT = 4;
const OVERVIEW_OVERLAY_HOUSES = [7, 8, 4];
const OVERVIEW_OVERLAY_LIMIT = 2;
const OVERVIEW_OVERLAY_PLANETS = ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'];
const HIGHLIGHT_ASPECT_LIMIT = 5;
const HIGHLIGHT_OVERLAY_LIMIT = 6;
const CORE_DYNAMICS_PLANETS = ['Moon', 'Venus', 'Saturn', 'Pluto', 'Chiron'];
const CORE_COMPOSITE_PLANETS = [...CORE_DYNAMICS_PLANETS, 'North Node'];
const CORE_HOUSE_FOCUS = [4, 8];
const CORE_ASPECT_PLANETS = ['Moon', 'Venus'];
const CORE_ASPECT_LIMIT = 12;
const CORE_OVERLAY_LIMIT = 12;

const resolveLang = (value: unknown): Language => (value === 'en' ? 'en' : 'zh');
const resolveTab = (value: unknown): SynastryTab => {
  switch (value) {
    case 'natal_a':
    case 'natal_b':
    case 'syn_ab':
    case 'syn_ba':
    case 'composite':
      return value;
    default:
      return 'overview';
  }
};
const resolveOverviewSection = (value: unknown): SynastryOverviewSection | null => {
  if (value === undefined || value === null) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = String(raw).trim().toLowerCase();
  switch (normalized) {
    case 'core_dynamics':
    case 'practice_tools':
    case 'relationship_timing':
    case 'highlights':
    case 'vibe_tags':
    case 'growth_task':
    case 'conflict_loop':
    case 'weather_forecast':
    case 'action_plan':
      return normalized as SynastryOverviewSection;
    case 'highlight':
      return 'highlights';
    default:
      return null;
  }
};

const buildSynastryPersonInfo = (birth: BirthInput, name: string): SynastryPersonInfo => ({
  name,
  birthDate: birth.date,
  birthTime: birth.time,
  birthCity: birth.city,
  lat: birth.lat ?? 0,
  lon: birth.lon ?? 0,
  timezone: birth.timezone,
});

const TAB_PROMPT_MAP: Record<SynastryTab, string> = {
  overview: 'synastry-overview',
  natal_a: 'synastry-natal-a',
  natal_b: 'synastry-natal-b',
  syn_ab: 'synastry-compare-ab',
  syn_ba: 'synastry-compare-ba',
  composite: 'synastry-composite',
};
const OVERVIEW_SECTION_PROMPT_MAP: Record<SynastryOverviewSection, string> = {
  core_dynamics: 'synastry-core-dynamics',
  practice_tools: 'synastry-practice-tools',
  relationship_timing: 'synastry-relationship-timing',
  highlights: 'synastry-highlights',
  vibe_tags: 'synastry-vibe-tags',
  growth_task: 'synastry-growth-task',
  conflict_loop: 'synastry-conflict-loop',
  weather_forecast: 'synastry-weather-forecast',
  action_plan: 'synastry-action-plan',
};

const OVERVIEW_MAX_TOKENS = 1800;
const HIGHLIGHTS_MAX_TOKENS = 1400;

const normalizeLongitude = (value: number) => ((value % 360) + 360) % 360;

const toLongitude = (pos: PlanetPosition): number => {
  const signIndex = SIGN_ORDER.indexOf(pos.sign as typeof SIGN_ORDER[number]);
  if (signIndex < 0) return 0;
  return signIndex * 30 + pos.degree + (pos.minute || 0) / 60;
};

const degreeToSign = (lon: number) => {
  const normalized = normalizeLongitude(lon);
  const signIndex = Math.floor(normalized / 30);
  const signDegree = Math.floor(normalized % 30);
  const minute = Math.floor((normalized % 1) * 60);
  return { sign: SIGN_ORDER[signIndex], degree: signDegree, minute };
};

const resolveHouse = (longitude: number, houses: number[]): number | undefined => {
  if (houses.length < 12) return undefined;
  const normLon = normalizeLongitude(longitude);
  for (let h = 0; h < 12; h++) {
    const nextH = (h + 1) % 12;
    const start = houses[h];
    const end = houses[nextH];
    if (end > start) {
      if (normLon >= start && normLon < end) return h + 1;
    } else {
      if (normLon >= start || normLon < end) return h + 1;
    }
  }
  return undefined;
};

const buildHouseCusps = (ascendantLon: number) =>
  Array.from({ length: 12 }, (_, i) => normalizeLongitude(ascendantLon + i * 30));

const buildHouseRulers = (positions: PlanetPosition[]) => {
  const ascendant = positions.find((p) => p.name === 'Ascendant');
  const ascSign = ascendant?.sign;
  const startIndex = ascSign ? SIGN_ORDER.indexOf(ascSign as typeof SIGN_ORDER[number]) : -1;
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
};

const buildExtendedNatalData = (positions: PlanetPosition[]): ExtendedNatalData => {
  const positionsByName = new Map(positions.map((pos) => [pos.name, pos]));
  const planets = MAJOR_BODIES.map((name) => positionsByName.get(name)).filter(Boolean) as PlanetPosition[];
  const asteroids = MINOR_BODIES.map((name) => positionsByName.get(name)).filter(Boolean) as PlanetPosition[];

  const elements: Record<string, Record<string, string[]>> = {};
  ELEMENT_BODIES.forEach((planetName) => {
    const planet = positionsByName.get(planetName);
    if (!planet) return;
    const meta = ELEMENT_META[planet.sign];
    if (!meta) return;
    elements[meta.element] = elements[meta.element] || {};
    elements[meta.element][meta.modality] = elements[meta.element][meta.modality] || [];
    elements[meta.element][meta.modality].push(planet.name);
  });

  const aspectPositions = ASPECT_BODIES.map((name) => positionsByName.get(name)).filter(Boolean) as PlanetPosition[];
  const aspects = ephemerisService.calculateAspects(aspectPositions);

  return {
    elements,
    planets,
    asteroids,
    houseRulers: buildHouseRulers(positions),
    aspects,
  };
};

const midpointLongitude = (lonA: number, lonB: number) => {
  const diff = ((lonB - lonA + 540) % 360) - 180;
  return normalizeLongitude(lonA + diff / 2);
};

const buildCompositePositions = (positionsA: PlanetPosition[], positionsB: PlanetPosition[]) => {
  const byNameA = new Map(positionsA.map((p) => [p.name, p]));
  const byNameB = new Map(positionsB.map((p) => [p.name, p]));
  const bodies = [...MAJOR_BODIES, ...MINOR_BODIES];

  const composite = bodies
    .map((name) => {
      const posA = byNameA.get(name);
      const posB = byNameB.get(name);
      if (!posA || !posB) return null;
      const lon = midpointLongitude(toLongitude(posA), toLongitude(posB));
      const { sign, degree, minute } = degreeToSign(lon);
      return {
        name,
        sign,
        degree,
        minute,
        isRetrograde: false,
      } as PlanetPosition;
    })
    .filter(Boolean) as PlanetPosition[];

  const asc = composite.find((p) => p.name === 'Ascendant');
  if (!asc) return composite;
  const cusps = buildHouseCusps(toLongitude(asc));
  return composite.map((pos) => ({
    ...pos,
    house: resolveHouse(toLongitude(pos), cusps),
  }));
};

const calculateCrossAspects = (positionsA: PlanetPosition[], positionsB: PlanetPosition[]): Aspect[] => {
  const aspects: Aspect[] = [];
  const byNameA = new Map(positionsA.map((p) => [p.name, p]));
  const byNameB = new Map(positionsB.map((p) => [p.name, p]));
  const listA = ASPECT_BODIES.map((name) => byNameA.get(name)).filter(Boolean) as PlanetPosition[];
  const listB = ASPECT_BODIES.map((name) => byNameB.get(name)).filter(Boolean) as PlanetPosition[];

  for (const posA of listA) {
    const lonA = toLongitude(posA);
    for (const posB of listB) {
      const lonB = toLongitude(posB);
      const diff = Math.abs(lonA - lonB);
      const angle = diff > 180 ? 360 - diff : diff;
      for (const [type, config] of Object.entries(ASPECT_TYPES)) {
        if (Math.abs(angle - config.angle) <= config.orb) {
          aspects.push({
            planet1: posA.name,
            planet2: posB.name,
            type: type as Aspect['type'],
            orb: Math.round(Math.abs(angle - config.angle) * 100) / 100,
            isApplying: false,
          });
          break;
        }
      }
    }
  }
  return aspects;
};

const buildAspectLabel = (aspect: Aspect) => `${aspect.planet1} ${aspect.type} ${aspect.planet2}`;

const toAspectSignal = (aspect: Aspect) => ({
  aspect: buildAspectLabel(aspect),
  orb: aspect.orb,
  weight: Math.round(aspectWeight(aspect) * 100) / 100,
});

const pickAspectSignals = (aspects: Aspect[], pairs: Array<[string, string]>, limit: number) =>
  aspects
    .filter((aspect) => pairMatch(aspect.planet1, aspect.planet2, pairs))
    .sort((a, b) => aspectWeight(b) - aspectWeight(a))
    .slice(0, limit)
    .map(toAspectSignal);

const pickAspectSignalsByType = (aspects: Aspect[], types: Aspect['type'][], limit: number) =>
  aspects
    .filter((aspect) => types.includes(aspect.type))
    .sort((a, b) => aspectWeight(b) - aspectWeight(a))
    .slice(0, limit)
    .map(toAspectSignal);

const pickDominanceKeys = (record?: Record<string, number>, limit = 2) => {
  if (!record) return [];
  return Object.entries(record)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, limit)
    .map(([key]) => key);
};

const summarizeOverviewNatal = (chart: NatalChart) => ({
  big3: pickPositions(chart.positions, ['Sun', 'Moon', 'Ascendant']),
  love: pickPositions(chart.positions, ['Venus', 'Mars']),
  communication: pickPositions(chart.positions, ['Mercury']),
  stability: pickPositions(chart.positions, ['Saturn']),
  depth: pickPositions(chart.positions, ['Pluto', 'Chiron']),
  dominance: {
    elements: pickDominanceKeys(chart.dominance?.elements),
    modalities: pickDominanceKeys(chart.dominance?.modalities),
  },
});

const pickTopOverlays = (
  overlays: SynastryData['houseOverlays'],
  limit: number,
  houses?: number[]
) => {
  const planetPriority = new Map(OVERVIEW_OVERLAY_PLANETS.map((planet, index) => [planet, index]));
  const housePriority = new Map(OVERVIEW_OVERLAY_HOUSES.map((house, index) => [house, index]));
  return overlays
    .filter((overlay) => (houses ? houses.includes(overlay.house) : true))
    .sort((a, b) => {
      const planetRankA = planetPriority.get(a.planet) ?? 99;
      const planetRankB = planetPriority.get(b.planet) ?? 99;
      if (planetRankA !== planetRankB) return planetRankA - planetRankB;
      const houseRankA = housePriority.get(a.house) ?? 99;
      const houseRankB = housePriority.get(b.house) ?? 99;
      return houseRankA - houseRankB;
    })
    .slice(0, limit)
    .map((overlay) => ({ planet: overlay.planet, house: overlay.house, person: overlay.person }));
};

const buildOverviewSynastrySignals = (aspects: Aspect[], overlays: SynastryData['houseOverlays']) => ({
  dimension_signals: {
    emotional_safety: pickAspectSignals(aspects, [
      ['Moon', 'Moon'],
      ['Moon', 'Venus'],
      ['Moon', 'Saturn'],
      ['Moon', 'Pluto'],
      ['Moon', 'Chiron'],
    ], OVERVIEW_SIGNAL_LIMIT),
    communication: pickAspectSignals(aspects, [
      ['Mercury', 'Mercury'],
      ['Mercury', 'Sun'],
      ['Mercury', 'Moon'],
      ['Mercury', 'Saturn'],
    ], OVERVIEW_SIGNAL_LIMIT),
    attraction: pickAspectSignals(aspects, [
      ['Venus', 'Mars'],
      ['Venus', 'Sun'],
      ['Mars', 'Moon'],
      ['Venus', 'Pluto'],
      ['Mars', 'Pluto'],
    ], OVERVIEW_SIGNAL_LIMIT),
    values: pickAspectSignals(aspects, [
      ['Saturn', 'Sun'],
      ['Saturn', 'Moon'],
      ['Saturn', 'Venus'],
      ['Jupiter', 'Sun'],
      ['Jupiter', 'Moon'],
    ], OVERVIEW_SIGNAL_LIMIT),
    pacing: pickAspectSignals(aspects, [
      ['Mars', 'Mars'],
      ['Mars', 'Saturn'],
      ['Sun', 'Mars'],
      ['Moon', 'Mars'],
    ], OVERVIEW_SIGNAL_LIMIT),
    long_term: pickAspectSignals(aspects, [
      ['Saturn', 'Sun'],
      ['Saturn', 'Moon'],
      ['Saturn', 'Venus'],
      ['North Node', 'Sun'],
      ['North Node', 'Moon'],
    ], OVERVIEW_SIGNAL_LIMIT),
  },
  sweet_signals: pickAspectSignalsByType(aspects, ['trine', 'sextile', 'conjunction'], OVERVIEW_SWEET_LIMIT),
  friction_signals: pickAspectSignalsByType(aspects, ['square', 'opposition'], OVERVIEW_FRICTION_LIMIT),
  overlays_top: pickTopOverlays(overlays, OVERVIEW_OVERLAY_LIMIT, OVERVIEW_OVERLAY_HOUSES),
});

const buildHighlightsSignals = (aspects: Aspect[], overlays: SynastryData['houseOverlays']) => ({
  harmony_signals: pickAspectSignalsByType(aspects, ['trine', 'sextile', 'conjunction'], HIGHLIGHT_ASPECT_LIMIT),
  challenge_signals: pickAspectSignalsByType(aspects, ['square', 'opposition'], HIGHLIGHT_ASPECT_LIMIT),
  overlays: pickTopOverlays(overlays, HIGHLIGHT_OVERLAY_LIMIT),
});

const pickPositions = (positions: PlanetPosition[], names: string[]) =>
  positions
    .filter((pos) => names.includes(pos.name))
    .map((pos) => ({ name: pos.name, sign: pos.sign, house: pos.house }));

const buildHouseFocus = (positions: PlanetPosition[], houses: number[]) =>
  houses.reduce<Record<string, string[]>>((acc, house) => {
    acc[`house${house}`] = positions.filter((pos) => pos.house === house).map((pos) => pos.name);
    return acc;
  }, {});

const summarizeCoreNatal = (chart: NatalChart) => ({
  focus_positions: pickPositions(chart.positions, CORE_DYNAMICS_PLANETS),
  house_focus: buildHouseFocus(chart.positions, CORE_HOUSE_FOCUS),
});

const summarizeCoreSynastryAspects = (aspects: Aspect[]) =>
  aspects
    .filter((aspect) => CORE_ASPECT_PLANETS.includes(aspect.planet1) || CORE_ASPECT_PLANETS.includes(aspect.planet2))
    .sort((a, b) => a.orb - b.orb)
    .slice(0, CORE_ASPECT_LIMIT)
    .map((aspect) => ({ planet1: aspect.planet1, planet2: aspect.planet2, type: aspect.type, orb: aspect.orb }));

const summarizeCoreOverlays = (overlays: SynastryData['houseOverlays']) =>
  overlays
    .filter((overlay) => CORE_HOUSE_FOCUS.includes(overlay.house))
    .slice(0, CORE_OVERLAY_LIMIT)
    .map((overlay) => ({ planet: overlay.planet, house: overlay.house, person: overlay.person }));

const summarizeCompositeFocus = (positions: PlanetPosition[]) => ({
  positions: pickPositions(positions, CORE_COMPOSITE_PLANETS),
  house_focus: buildHouseFocus(positions, CORE_HOUSE_FOCUS),
});

const buildHouseOverlays = (
  source: PlanetPosition[],
  targetCusps: number[],
  person: 'A' | 'B'
) =>
  PLANETS.map((planet) => {
    const pos = source.find((p) => p.name === planet);
    if (!pos || !targetCusps.length) return null;
    const house = resolveHouse(toLongitude(pos), targetCusps);
    if (!house) return null;
    return { planet, house, person };
  }).filter(Boolean) as SynastryData['houseOverlays'];

const aspectWeight = (aspect: Aspect) => {
  const base = {
    conjunction: 1,
    trine: 0.9,
    sextile: 0.7,
    square: 0.55,
    opposition: 0.55,
  }[aspect.type];
  const orbWeight = Math.max(0.2, 1 - aspect.orb / 8);
  return base * orbWeight;
};

const pairMatch = (a: string, b: string, pairs: Array<[string, string]>) =>
  pairs.some(([p1, p2]) => (a === p1 && b === p2) || (a === p2 && b === p1));

const scoreRelationshipTypes = (aspects: Aspect[]): SynastrySuggestion[] => {
  const scores: Record<string, number> = {
    romantic: 0,
    crush: 0,
    friend: 0,
    business: 0,
    family: 0,
  };

  const romanticPairs: Array<[string, string]> = [
    ['Venus', 'Mars'],
    ['Sun', 'Venus'],
    ['Moon', 'Venus'],
    ['Sun', 'Moon'],
    ['Venus', 'Pluto'],
  ];
  const crushPairs: Array<[string, string]> = [
    ['Venus', 'Mars'],
    ['Venus', 'Neptune'],
    ['Moon', 'Neptune'],
    ['Sun', 'Venus'],
  ];
  const friendPairs: Array<[string, string]> = [
    ['Sun', 'Sun'],
    ['Moon', 'Moon'],
    ['Mercury', 'Mercury'],
    ['Mercury', 'Sun'],
    ['Mercury', 'Moon'],
    ['Jupiter', 'Sun'],
  ];
  const businessPairs: Array<[string, string]> = [
    ['Mercury', 'Saturn'],
    ['Sun', 'Saturn'],
    ['Jupiter', 'Saturn'],
    ['Mercury', 'Jupiter'],
  ];
  const familyPairs: Array<[string, string]> = [
    ['Moon', 'Saturn'],
    ['Moon', 'Sun'],
    ['Moon', 'Moon'],
    ['Venus', 'Moon'],
  ];

  aspects.forEach((aspect) => {
    const weight = aspectWeight(aspect);
    if (pairMatch(aspect.planet1, aspect.planet2, romanticPairs)) scores.romantic += weight * 1.15;
    if (pairMatch(aspect.planet1, aspect.planet2, crushPairs)) scores.crush += weight;
    if (pairMatch(aspect.planet1, aspect.planet2, friendPairs)) scores.friend += weight;
    if (pairMatch(aspect.planet1, aspect.planet2, businessPairs)) scores.business += weight * 0.95;
    if (pairMatch(aspect.planet1, aspect.planet2, familyPairs)) scores.family += weight * 1.05;
  });

  const maxScore = Math.max(...Object.values(scores), 0);
  return Object.entries(scores)
    .map(([key, score]) => ({
      key,
      score: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score);
};

function parseBirthInput(query: Record<string, unknown>, prefix: string): BirthInput {
  const latParam = query[`${prefix}Lat`];
  const lonParam = query[`${prefix}Lon`];
  return {
    date: query[`${prefix}Date`] as string,
    time: query[`${prefix}Time`] as string | undefined,
    city: query[`${prefix}City`] as string,
    lat: latParam === undefined || latParam === '' ? undefined : Number(latParam),
    lon: lonParam === undefined || lonParam === '' ? undefined : Number(lonParam),
    timezone: query[`${prefix}Timezone`] as string,
    accuracy: (query[`${prefix}Accuracy`] as BirthInput['accuracy']) || 'exact',
  };
}

const buildSynastryCore = async (birthA: BirthInput, birthB: BirthInput) => {
  const [chartA, chartB] = await Promise.all([
    ephemerisService.calculateNatalChart(birthA),
    ephemerisService.calculateNatalChart(birthB),
  ]);

  const synastryAspects = calculateCrossAspects(chartA.positions, chartB.positions);
  const ascA = chartA.positions.find((p) => p.name === 'Ascendant');
  const ascB = chartB.positions.find((p) => p.name === 'Ascendant');
  const cuspsA = ascA ? buildHouseCusps(toLongitude(ascA)) : [];
  const cuspsB = ascB ? buildHouseCusps(toLongitude(ascB)) : [];
  const overlaysAB = buildHouseOverlays(chartA.positions, cuspsB, 'A');
  const overlaysBA = buildHouseOverlays(chartB.positions, cuspsA, 'B');

  const synastry: SynastryData = {
    aspects: synastryAspects,
    houseOverlays: [...overlaysAB, ...overlaysBA],
  };

  return { chartA, chartB, synastryAspects, overlaysAB, overlaysBA, synastry };
};

const buildSynastrySummaryContext = (
  chartA: NatalChart,
  chartB: NatalChart,
  synastryAspects: Aspect[],
  synastry: SynastryData,
  relationshipType: string | undefined,
  birthA: BirthInput,
  birthB: BirthInput,
  nameA: string,
  nameB: string
) => ({
  chartA: summarizeOverviewNatal(chartA),
  chartB: summarizeOverviewNatal(chartB),
  synastry: buildOverviewSynastrySignals(synastryAspects, synastry.houseOverlays),
  relationship_type: relationshipType,
  birth_accuracy: { nameA: birthA.accuracy, nameB: birthB.accuracy },
  nameA,
  nameB,
});

const buildCoreDynamicsContext = (
  chartA: NatalChart,
  chartB: NatalChart,
  synastryAspects: Aspect[],
  overlaysAB: SynastryData['houseOverlays'],
  overlaysBA: SynastryData['houseOverlays'],
  relationshipType: string | undefined,
  birthA: BirthInput,
  birthB: BirthInput,
  nameA: string,
  nameB: string
) => {
  const compositePositions = buildCompositePositions(chartA.positions, chartB.positions);
  return {
    chartA: summarizeCoreNatal(chartA),
    chartB: summarizeCoreNatal(chartB),
    synastry: { moon_venus_aspects: summarizeCoreSynastryAspects(synastryAspects) },
    comparison: {
      overlays_ab: summarizeCoreOverlays(overlaysAB),
      overlays_ba: summarizeCoreOverlays(overlaysBA),
    },
    composite: summarizeCompositeFocus(compositePositions),
    relationship_type: relationshipType,
    birth_accuracy: { nameA: birthA.accuracy, nameB: birthB.accuracy },
    nameA,
    nameB,
  };
};

const buildHighlightsContext = (
  chartA: NatalChart,
  chartB: NatalChart,
  synastryAspects: Aspect[],
  synastry: SynastryData,
  relationshipType: string | undefined,
  birthA: BirthInput,
  birthB: BirthInput,
  nameA: string,
  nameB: string
) => ({
  chartA: summarizeOverviewNatal(chartA),
  chartB: summarizeOverviewNatal(chartB),
  synastry: buildHighlightsSignals(synastryAspects, synastry.houseOverlays),
  relationship_type: relationshipType,
  birth_accuracy: { nameA: birthA.accuracy, nameB: birthB.accuracy },
  nameA,
  nameB,
});

// GET /api/synastry/suggestions - 关系类型建议
synastryRouter.get('/suggestions', async (req, res) => {
  try {
    const birthA = parseBirthInput(req.query as Record<string, unknown>, 'a');
    const birthB = parseBirthInput(req.query as Record<string, unknown>, 'b');

    const [chartA, chartB] = await Promise.all([
      ephemerisService.calculateNatalChart(birthA),
      ephemerisService.calculateNatalChart(birthB),
    ]);

    const aspects = calculateCrossAspects(chartA.positions, chartB.positions);
    const suggestions = scoreRelationshipTypes(aspects).slice(0, 5);
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/synastry/technical - 合盘技术附录
synastryRouter.get('/technical', async (req, res) => {
  try {
    const birthA = parseBirthInput(req.query as Record<string, unknown>, 'a');
    const birthB = parseBirthInput(req.query as Record<string, unknown>, 'b');

    const { chartA, chartB, synastryAspects, overlaysAB, overlaysBA } = await buildSynastryCore(birthA, birthB);
    const technical: SynastryTechnicalData = {
      natal_a: buildExtendedNatalData(chartA.positions),
      natal_b: buildExtendedNatalData(chartB.positions),
      composite: buildExtendedNatalData(buildCompositePositions(chartA.positions, chartB.positions)),
      syn_ab: { aspects: synastryAspects, houseOverlays: overlaysAB },
      syn_ba: { aspects: synastryAspects, houseOverlays: overlaysBA },
    };

    res.json({ technical });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/synastry/overview-section - 合盘综述分区
synastryRouter.get('/overview-section', authMiddleware, async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const section = resolveOverviewSection(req.query.section);
    if (!section) {
      res.status(400).json({ error: 'Invalid section. Must be one of: core_dynamics, practice_tools, relationship_timing, highlights, vibe_tags, growth_task, conflict_loop, weather_forecast, action_plan.' });
      return;
    }
    const birthA = parseBirthInput(req.query as Record<string, unknown>, 'a');
    const birthB = parseBirthInput(req.query as Record<string, unknown>, 'b');
    const relationshipType = req.query.relationType as string | undefined;
    const nameA = (req.query.nameA as string) || 'A';
    const nameB = (req.query.nameB as string) || 'B';
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
    const userId = req.userId!;
    const normalizedRelationshipType = relationshipType || 'unknown';
    const personA = buildSynastryPersonInfo(birthA, nameA);
    const personB = buildSynastryPersonInfo(birthB, nameB);
    let shouldRecord = false;
    let shouldConsume = false;

    if (!isSupabaseConfigured()) {
      const access = await entitlementServiceV2.checkAccess(userId, 'synastry', undefined, deviceFingerprint);
      if (!access.canAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          needPurchase: access.needPurchase,
          price: access.price,
        });
      }
      shouldConsume = true;
    } else {
      const record = await entitlementServiceV2.checkSynastryHash(
        userId,
        personA,
        personB,
        normalizedRelationshipType
      );
      if (!record.exists) {
        const entitlements = await entitlementServiceV2.getEntitlements(userId, deviceFingerprint);
        if (entitlements.synastry.totalLeft <= 0) {
          return res.status(403).json({
            error: 'Feature not available',
            needPurchase: true,
            price: PRICING.SYNASTRY_FULL,
          });
        }
        shouldRecord = true;
      }
    }

    const coreStart = performance.now();
    const { chartA, chartB, synastry, synastryAspects, overlaysAB, overlaysBA } = await buildSynastryCore(birthA, birthB);
    const coreMs = performance.now() - coreStart;
    const summaryContext = buildSynastrySummaryContext(
      chartA,
      chartB,
      synastryAspects,
      synastry,
      relationshipType,
      birthA,
      birthB,
      nameA,
      nameB
    );
    const sectionContext = section === 'core_dynamics'
      ? buildCoreDynamicsContext(
          chartA,
          chartB,
          synastryAspects,
          overlaysAB,
          overlaysBA,
          relationshipType,
          birthA,
          birthB,
          nameA,
          nameB
        )
      : section === 'highlights'
        ? buildHighlightsContext(
            chartA,
            chartB,
            synastryAspects,
            synastry,
            relationshipType,
            birthA,
            birthB,
            nameA,
            nameB
          )
        : summaryContext;

    const aiStart = performance.now();
    const { content, meta } = await generateAIContentWithMeta({
      promptId: OVERVIEW_SECTION_PROMPT_MAP[section],
      context: sectionContext,
      lang,
      allowMock: false,
      maxTokens: section === 'highlights' ? HIGHLIGHTS_MAX_TOKENS : undefined,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    const timing = {
      core_ms: Math.round(coreMs),
      ai_ms: Math.round(aiMs),
      total_ms: Math.round(totalMs),
    };
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    if (shouldRecord) {
      await entitlementServiceV2.recordSynastryUsage(
        userId,
        personA,
        personB,
        normalizedRelationshipType,
        true
      );
      const consumed = await entitlementServiceV2.consumeFeature(userId, 'synastry', deviceFingerprint);
      if (!consumed) {
        return res.status(403).json({
          error: 'Failed to consume feature',
          needPurchase: true,
          price: PRICING.SYNASTRY_FULL,
        });
      }
    } else if (shouldConsume) {
      const consumed = await entitlementServiceV2.consumeFeature(userId, 'synastry', deviceFingerprint);
      if (!consumed) {
        return res.status(403).json({
          error: 'Failed to consume feature',
          needPurchase: true,
          price: PRICING.SYNASTRY_FULL,
        });
      }
    }

    res.json({
      section,
      lang: content.lang,
      content: content.content,
      meta,
      timing,
    } as SynastryOverviewSectionResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/synastry - 合盘分析
synastryRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const requestStart = performance.now();
    const lang = resolveLang(req.query.lang);
    const tab = resolveTab(req.query.tab);
    const birthA = parseBirthInput(req.query as Record<string, unknown>, 'a');
    const birthB = parseBirthInput(req.query as Record<string, unknown>, 'b');
    const relationshipType = req.query.relationType as string | undefined;
    const nameA = (req.query.nameA as string) || 'A';
    const nameB = (req.query.nameB as string) || 'B';
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
    const userId = req.userId!;
    const normalizedRelationshipType = relationshipType || 'unknown';
    const personA = buildSynastryPersonInfo(birthA, nameA);
    const personB = buildSynastryPersonInfo(birthB, nameB);
    let shouldRecord = false;
    let shouldConsume = false;

    if (!isSupabaseConfigured()) {
      const access = await entitlementServiceV2.checkAccess(userId, 'synastry', undefined, deviceFingerprint);
      if (!access.canAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          needPurchase: access.needPurchase,
          price: access.price,
        });
      }
      shouldConsume = true;
    } else {
      const record = await entitlementServiceV2.checkSynastryHash(
        userId,
        personA,
        personB,
        normalizedRelationshipType
      );
      if (!record.exists) {
        const entitlements = await entitlementServiceV2.getEntitlements(userId, deviceFingerprint);
        if (entitlements.synastry.totalLeft <= 0) {
          return res.status(403).json({
            error: 'Feature not available',
            needPurchase: true,
            price: PRICING.SYNASTRY_FULL,
          });
        }
        shouldRecord = true;
      }
    }

    const coreStart = performance.now();
    const { chartA, chartB, synastry, synastryAspects } = await buildSynastryCore(birthA, birthB);
    const coreMs = performance.now() - coreStart;
    const summaryContext = buildSynastrySummaryContext(
      chartA,
      chartB,
      synastryAspects,
      synastry,
      relationshipType,
      birthA,
      birthB,
      nameA,
      nameB
    );
    const fullContext = {
      chartA,
      chartB,
      synastry,
      relationship_type: relationshipType,
      birth_accuracy: { nameA: birthA.accuracy, nameB: birthB.accuracy },
      nameA,
      nameB,
    };

    const aiStart = performance.now();
    const { content, meta } = await generateAIContentWithMeta({
      promptId: TAB_PROMPT_MAP[tab],
      context: tab === 'overview' ? summaryContext : fullContext,
      lang,
      allowMock: false,
      maxTokens: tab === 'overview' ? OVERVIEW_MAX_TOKENS : undefined,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    const timing = {
      core_ms: Math.round(coreMs),
      ai_ms: Math.round(aiMs),
      total_ms: Math.round(totalMs),
    };
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    if (shouldRecord) {
      await entitlementServiceV2.recordSynastryUsage(
        userId,
        personA,
        personB,
        normalizedRelationshipType,
        true
      );
      const consumed = await entitlementServiceV2.consumeFeature(userId, 'synastry', deviceFingerprint);
      if (!consumed) {
        return res.status(403).json({
          error: 'Failed to consume feature',
          needPurchase: true,
          price: PRICING.SYNASTRY_FULL,
        });
      }
    } else if (shouldConsume) {
      const consumed = await entitlementServiceV2.consumeFeature(userId, 'synastry', deviceFingerprint);
      if (!consumed) {
        return res.status(403).json({
          error: 'Failed to consume feature',
          needPurchase: true,
          price: PRICING.SYNASTRY_FULL,
        });
      }
    }

    res.json({
      tab,
      synastry,
      lang: content.lang,
      content: content.content,
      meta,
      timing,
    } as SynastryResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

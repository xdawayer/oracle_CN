// INPUT: Swiss Ephemeris 封装实现（含敏感点位派生、行运 ASC 相位与本命盘/行运缓存）。
// OUTPUT: 导出星历计算服务（支持真实坐标、派生点位、行运缓存与 AI 摘要数据）。
// POS: 星历计算服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import type { BirthInput, PlanetPosition, Aspect, NatalChart, TransitData } from '../types/api.js';
import { PLANETS, SIGNS, ASTEROIDS, ASPECT_TYPES, type EphemerisService } from '../data/sources.js';
import { cacheService } from '../cache/redis.js';
import { CACHE_PREFIX, CACHE_TTL, hashInput } from '../cache/strategy.js';

// Swiss Ephemeris 常量
const SE_SUN = 0, SE_MOON = 1, SE_MERCURY = 2, SE_VENUS = 3, SE_MARS = 4;
const SE_JUPITER = 5, SE_SATURN = 6, SE_URANUS = 7, SE_NEPTUNE = 8, SE_PLUTO = 9;
const SE_CHIRON = 15, SE_CERES = 17, SE_PALLAS = 18, SE_JUNO = 19, SE_VESTA = 20;
const SE_TRUE_NODE = 11;
const SEFLG_SPEED = 256;

// 行星 ID 映射
const PLANET_IDS: Record<string, number> = {
  Sun: SE_SUN, Moon: SE_MOON, Mercury: SE_MERCURY, Venus: SE_VENUS, Mars: SE_MARS,
  Jupiter: SE_JUPITER, Saturn: SE_SATURN, Uranus: SE_URANUS, Neptune: SE_NEPTUNE, Pluto: SE_PLUTO,
  Chiron: SE_CHIRON, Ceres: SE_CERES, Pallas: SE_PALLAS, Juno: SE_JUNO, Vesta: SE_VESTA,
  'North Node': SE_TRUE_NODE,
};

// 尝试加载 swisseph
let swisseph: any = null;
let swissephAvailable = false;

try {
  const swissephModule = await import('swisseph');
  // 处理 ESM 默认导出
  swisseph = swissephModule.default || swissephModule;
  swissephAvailable = true;

  // 设置星历数据路径（如果有自定义路径可在环境变量中配置）
  const ephePath = process.env.SWISSEPH_PATH || '';
  if (ephePath && typeof swisseph.swe_set_ephe_path === 'function') {
    swisseph.swe_set_ephe_path(ephePath);
  }

  console.log('✅ Swiss Ephemeris loaded successfully (NASA JPL DE431 precision)');
} catch (err) {
  console.warn('⚠️ Swiss Ephemeris not available, using mock calculations');
  console.warn('   For production accuracy, ensure swisseph native module is compiled');
  console.warn('   Error:', err instanceof Error ? err.message : String(err));
}

function dateToJulian(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60) / 24;

  let jy = y, jm = m;
  if (m <= 2) { jy--; jm += 12; }
  const a = Math.floor(jy / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + d + b - 1524.5;
}

function degreeToSign(degree: number): { sign: string; degree: number; minute: number } {
  const normalized = ((degree % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const signDegree = Math.floor(normalized % 30);
  const minute = Math.floor((normalized % 1) * 60);
  return { sign: SIGNS[signIndex], degree: signDegree, minute };
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function resolveHouse(longitude: number, houses: number[]): number | undefined {
  if (houses.length < 12) return undefined;
  for (let h = 0; h < 12; h++) {
    const nextH = (h + 1) % 12;
    const start = houses[h];
    const end = houses[nextH];
    const normLon = normalizeLongitude(longitude);
    if (end > start) {
      if (normLon >= start && normLon < end) { return h + 1; }
    } else {
      if (normLon >= start || normLon < end) { return h + 1; }
    }
  }
  return undefined;
}

function calculateAspectsBetween(positions: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];
      // 修复精度问题：包含分钟信息（minute 字段）以获得更精确的角度计算
      const p1Deg = p1.degree + (p1.minute || 0) / 60 + SIGNS.indexOf(p1.sign as typeof SIGNS[number]) * 30;
      const p2Deg = p2.degree + (p2.minute || 0) / 60 + SIGNS.indexOf(p2.sign as typeof SIGNS[number]) * 30;
      const diff = Math.abs(p1Deg - p2Deg);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const [type, config] of Object.entries(ASPECT_TYPES)) {
        if (Math.abs(angle - config.angle) <= config.orb) {
          aspects.push({
            planet1: p1.name,
            planet2: p2.name,
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
}

// Mock 计算（当 swisseph 不可用时）
// 使用黄金角度 (137.5°) 进行分布，同时引入基于真实轨道周期的偏移
// 这样可以产生更加多样化的相位（合、冲、刑、拱、六合）
const MOCK_ORBITAL_PERIODS = [
  1,      // Sun (基准)
  0.0748, // Moon (27.3天 / 365天)
  0.241,  // Mercury
  0.615,  // Venus
  1.881,  // Mars
  11.86,  // Jupiter
  29.46,  // Saturn
  84.01,  // Uranus
  164.8,  // Neptune
  248.1,  // Pluto
  50.76,  // Chiron
  4.6,    // Ceres
  4.62,   // Pallas
  4.36,   // Juno
  3.63,   // Vesta
  18.6,   // North Node (月交点周期)
];

const DEFAULT_LAT = 31.23;
const DEFAULT_LON = 121.47;
const NATAL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUMMARY_ASPECT_LIMIT = 8;
const SUMMARY_PLANETS = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;
const SUMMARY_TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;

const buildNatalCacheKey = (birth: BirthInput) => {
  const lat = birth.lat ?? DEFAULT_LAT;
  const lon = birth.lon ?? DEFAULT_LON;
  const time = birth.time || '12:00';
  return [
    birth.date,
    time,
    birth.timezone,
    birth.city,
    lat,
    lon,
    birth.accuracy || 'exact',
  ].join('|');
};

const buildBirthHash = (birth: BirthInput) => hashInput({
  date: birth.date,
  time: birth.time || '',
  city: birth.city,
  lat: birth.lat ?? DEFAULT_LAT,
  lon: birth.lon ?? DEFAULT_LON,
  timezone: birth.timezone,
  accuracy: birth.accuracy || 'exact',
});

const pickTopAspects = (aspects: Aspect[], limit = SUMMARY_ASPECT_LIMIT) => (
  aspects
    .slice()
    .sort((a, b) => a.orb - b.orb)
    .slice(0, limit)
    .map((aspect) => ({
      planet1: aspect.planet1,
      planet2: aspect.planet2,
      type: aspect.type,
      orb: aspect.orb,
    }))
);

const buildPlanetSummary = (pos?: PlanetPosition | null) => {
  if (!pos) return null;
  return {
    name: pos.name,
    sign: pos.sign,
    house: pos.house ?? null,
    retrograde: pos.isRetrograde,
  };
};

export const buildCompactChartSummary = (chart: NatalChart) => {
  const positionsByName = new Map(chart.positions.map((pos) => [pos.name, pos]));
  const rising = positionsByName.get('Ascendant') || positionsByName.get('Rising');
  const personalPlanets = SUMMARY_PLANETS
    .filter((name) => !['Sun', 'Moon', 'Ascendant'].includes(name))
    .map((name) => buildPlanetSummary(positionsByName.get(name)))
    .filter(Boolean);

  return {
    big3: {
      sun: buildPlanetSummary(positionsByName.get('Sun')),
      moon: buildPlanetSummary(positionsByName.get('Moon')),
      rising: buildPlanetSummary(rising),
    },
    personal_planets: personalPlanets,
    dominance: chart.dominance,
    top_aspects: pickTopAspects(chart.aspects),
  };
};

export const buildCompactTransitSummary = (transits: TransitData) => {
  const positionsByName = new Map(transits.positions.map((pos) => [pos.name, pos]));
  const keyTransits = SUMMARY_TRANSIT_PLANETS
    .map((name) => buildPlanetSummary(positionsByName.get(name)))
    .filter(Boolean);

  return {
    date: transits.date,
    moon_phase: transits.moonPhase,
    key_transits: keyTransits,
    top_aspects: pickTopAspects(transits.aspects),
  };
};

function mockPlanetPosition(name: string, jd: number, index: number): { lon: number; speed: number } {
  // 使用真实轨道周期产生更真实的相对位置
  const period = MOCK_ORBITAL_PERIODS[index] || 1;
  const daysSinceJ2000 = jd - 2451545; // J2000 epoch

  // 每颗行星基于其轨道周期计算位置，加上随机种子偏移以产生多样化相位
  const seedOffset = [0, 45, 120, 180, 90, 60, 150, 30, 75, 135, 100, 50, 170, 85, 115, 45][index] || 0;
  const baseDegree = (360 * daysSinceJ2000 / (period * 365.25) + seedOffset) % 360;

  return {
    lon: (baseDegree + 360) % 360,
    speed: index > 1 && (Math.floor(jd) + index) % 5 === 0 ? -0.1 : 0.5
  };
}

export class SwissEphemerisService implements EphemerisService {
  private useRealEphemeris = !!swisseph;
  private natalCache = new Map<string, { value: NatalChart; expiresAt: number }>();
  private natalPending = new Map<string, Promise<NatalChart>>();
  private transitPending = new Map<string, Promise<TransitData>>();

  async getPlanetPositions(date: Date, lat: number, lon: number): Promise<{
    positions: PlanetPosition[];
    houseCusps: number[];
  }> {
    const jd = dateToJulian(date);
    if (!Number.isFinite(jd)) {
      throw new Error(`Invalid Julian Date calculated from ${date}`);
    }
    const positions: PlanetPosition[] = [];
    const longitudes: Record<string, number> = {};

    // 计算宫位（Placidus）
    let houses: number[] = [];
    let ascendant = 0;
    let midheaven = 0; // MC from swe_houses
    let vertex: number | undefined;
    let equatorialAscendant: number | undefined;

    if (this.useRealEphemeris && lat !== 0) {
      try {
        const houseResult = swisseph.swe_houses(jd, lat, lon, 'P'); // P = Placidus
        houses = houseResult.house || houseResult.cusps || [];
        ascendant = houseResult.ascendant ?? houseResult.asc ?? 0;
        midheaven = houseResult.mc ?? houseResult.medium_coeli ?? houses[9] ?? (ascendant + 270) % 360;
        vertex = houseResult.vertex;
        equatorialAscendant = houseResult.equatorialAscendant;
      } catch {
        houses = Array.from({ length: 12 }, (_, i) => (ascendant + i * 30) % 360);
        midheaven = (ascendant + 270) % 360;
      }
    } else {
      ascendant = (jd * 360 / 365.25 + lon) % 360;
      midheaven = (ascendant + 270) % 360;
      houses = Array.from({ length: 12 }, (_, i) => (ascendant + i * 30) % 360);
    }

    // 计算行星位置
    const allBodies = [...PLANETS, ...ASTEROIDS];
    for (let i = 0; i < allBodies.length; i++) {
      const name = allBodies[i];
      const planetId = PLANET_IDS[name];

      let longitude = 0;
      let speed = 0;

      if (this.useRealEphemeris && planetId !== undefined) {
        try {
          const result = swisseph.swe_calc_ut(jd, planetId, SEFLG_SPEED);
          const resultLon = result?.longitude;
          const resultSpeed = result?.longitudeSpeed;
          if (result?.error || !Number.isFinite(resultLon)) {
            throw new Error(result?.error || 'Invalid ephemeris data');
          }
          longitude = resultLon;
          speed = Number.isFinite(resultSpeed) ? resultSpeed : 0;
        } catch {
          const mock = mockPlanetPosition(name, jd, i);
          longitude = mock.lon;
          speed = mock.speed;
        }
      } else {
        const mock = mockPlanetPosition(name, jd, i);
        longitude = mock.lon;
        speed = mock.speed;
      }

      const normalized = normalizeLongitude(longitude);
      longitudes[name] = normalized;
      const { sign, degree, minute } = degreeToSign(normalized);

      // 计算宫位
      const house = resolveHouse(normalized, houses);

      positions.push({
        name,
        sign,
        degree,
        minute,
        house,
        isRetrograde: speed < 0,
      });
    }

    // 添加上升点
    const ascLon = normalizeLongitude(ascendant);
    const ascSign = degreeToSign(ascLon);
    positions.push({
      name: 'Ascendant',
      sign: ascSign.sign,
      degree: ascSign.degree,
      minute: ascSign.minute,
      house: 1,
      isRetrograde: false,
    });
    longitudes['Ascendant'] = ascLon;

    // 添加天顶 (使用 swe_houses 计算的真实 MC)
    const mc = normalizeLongitude(midheaven);
    const mcSign = degreeToSign(mc);
    positions.push({
      name: 'Midheaven',
      sign: mcSign.sign,
      degree: mcSign.degree,
      minute: mcSign.minute,
      house: 10,
      isRetrograde: false,
    });
    longitudes['Midheaven'] = mc;

    // 添加下降点与天底 (由 ASC/MC 推导)
    const descLon = normalizeLongitude(ascLon + 180);
    const descSign = degreeToSign(descLon);
    positions.push({
      name: 'Descendant',
      sign: descSign.sign,
      degree: descSign.degree,
      minute: descSign.minute,
      house: resolveHouse(descLon, houses) ?? 7,
      isRetrograde: false,
    });
    longitudes['Descendant'] = descLon;

    const icLon = normalizeLongitude(mc + 180);
    const icSign = degreeToSign(icLon);
    positions.push({
      name: 'IC',
      sign: icSign.sign,
      degree: icSign.degree,
      minute: icSign.minute,
      house: resolveHouse(icLon, houses) ?? 4,
      isRetrograde: false,
    });
    longitudes['IC'] = icLon;

    // 衍生点位
    const northNodeLon = longitudes['North Node'];
    if (northNodeLon !== undefined) {
      const southLon = normalizeLongitude(northNodeLon + 180);
      const southSign = degreeToSign(southLon);
      positions.push({
        name: 'South Node',
        sign: southSign.sign,
        degree: southSign.degree,
        minute: southSign.minute,
        house: resolveHouse(southLon, houses),
        isRetrograde: false,
      });
    }

    const sunLon = longitudes['Sun'];
    const moonLon = longitudes['Moon'];
    const sunHouse = positions.find((p) => p.name === 'Sun')?.house;
    const isDayChart = sunHouse ? sunHouse >= 7 : true;
    if (sunLon !== undefined && moonLon !== undefined && ascLon !== undefined) {
      const fortuneLon = normalizeLongitude(
        ascLon + (isDayChart ? moonLon - sunLon : sunLon - moonLon)
      );
      const fortuneSign = degreeToSign(fortuneLon);
      positions.push({
        name: 'Fortune',
        sign: fortuneSign.sign,
        degree: fortuneSign.degree,
        minute: fortuneSign.minute,
        house: resolveHouse(fortuneLon, houses),
        isRetrograde: false,
      });
    }

    const lilithLon = (() => {
      const lilithId = swisseph?.SE_MEAN_APOG ?? swisseph?.SE_OSCU_APOG;
      if (this.useRealEphemeris && lilithId !== undefined) {
        try {
          const result = swisseph.swe_calc_ut(jd, lilithId, SEFLG_SPEED);
          if (result?.error || !Number.isFinite(result?.longitude)) return undefined;
          return normalizeLongitude(result.longitude);
        } catch {
          return undefined;
        }
      }
      return undefined;
    })();

    const lilithFallback = normalizeLongitude(mockPlanetPosition('Lilith', jd, allBodies.length + 11).lon);
    const resolvedLilithLon = lilithLon ?? lilithFallback;
    const lilithSign = degreeToSign(resolvedLilithLon);
    positions.push({
      name: 'Lilith',
      sign: lilithSign.sign,
      degree: lilithSign.degree,
      minute: lilithSign.minute,
      house: resolveHouse(resolvedLilithLon, houses),
      isRetrograde: false,
    });

    const vertexLon = vertex ?? normalizeLongitude(mockPlanetPosition('Vertex', jd, allBodies.length + 12).lon);
    const vertexSign = degreeToSign(vertexLon);
    positions.push({
      name: 'Vertex',
      sign: vertexSign.sign,
      degree: vertexSign.degree,
      minute: vertexSign.minute,
      house: resolveHouse(vertexLon, houses),
      isRetrograde: false,
    });

    const eastPointLon = equatorialAscendant ?? normalizeLongitude(mockPlanetPosition('East Point', jd, allBodies.length + 13).lon);
    const eastPointSign = degreeToSign(eastPointLon);
    positions.push({
      name: 'East Point',
      sign: eastPointSign.sign,
      degree: eastPointSign.degree,
      minute: eastPointSign.minute,
      house: resolveHouse(eastPointLon, houses),
      isRetrograde: false,
    });

    return { positions, houseCusps: houses };
  }

  calculateAspects(positions: PlanetPosition[]): Aspect[] {
    return calculateAspectsBetween(positions);
  }

  private async calculateNatalChartRaw(birth: BirthInput): Promise<NatalChart> {
    // 将出生时间转换为 UTC
    const timeStr = birth.time || '12:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const [year, month, day] = birth.date.split('-').map(Number);

    // 获取时区偏移（分钟）
    let tzOffsetMinutes = 0;
    if (birth.timezone) {
      try {
        // 使用 Intl API 获取准确的时区偏移
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: birth.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        // 使用目标日期 12:00 UTC 作为参考点计算偏移
        const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        const parts = formatter.formatToParts(refDate);
        const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '12');
        const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

        // 偏移 = 时区本地时间 - UTC 时间 (12:00)
        tzOffsetMinutes = (tzHour - 12) * 60 + tzMinute;

        // 处理跨日情况
        const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || String(day));
        if (tzDay > day) tzOffsetMinutes += 24 * 60;
        else if (tzDay < day) tzOffsetMinutes -= 24 * 60;

      } catch {
        // 处理数字格式的时区 (如 "+08:00", "GMT+8", "8")
        const match = birth.timezone.match(/([+-]?)(\d{1,2})(?::(\d{2}))?/);
        if (match) {
          const sign = match[1] === '-' ? -1 : 1;
          const offsetHours = parseInt(match[2]);
          const offsetMins = parseInt(match[3] || '0');
          tzOffsetMinutes = sign * (offsetHours * 60 + offsetMins);
        }
      }
    }

    // 计算 UTC 时间（分钟精度）
    const localTotalMinutes = hours * 60 + minutes;
    const utcTotalMinutes = localTotalMinutes - tzOffsetMinutes;

    // 处理日期跨越
    let utcDay = day;
    let utcMonth = month;
    let utcYear = year;
    let adjustedUtcMinutes = utcTotalMinutes;

    if (utcTotalMinutes < 0) {
      adjustedUtcMinutes = utcTotalMinutes + 24 * 60;
      utcDay -= 1;
      if (utcDay < 1) {
        utcMonth -= 1;
        if (utcMonth < 1) {
          utcMonth = 12;
          utcYear -= 1;
        }
        utcDay = new Date(utcYear, utcMonth, 0).getDate();
      }
    } else if (utcTotalMinutes >= 24 * 60) {
      adjustedUtcMinutes = utcTotalMinutes - 24 * 60;
      utcDay += 1;
      const daysInMonth = new Date(utcYear, utcMonth, 0).getDate();
      if (utcDay > daysInMonth) {
        utcDay = 1;
        utcMonth += 1;
        if (utcMonth > 12) {
          utcMonth = 1;
          utcYear += 1;
        }
      }
    }

    const utcHours = Math.floor(adjustedUtcMinutes / 60);
    const utcMinutes = adjustedUtcMinutes % 60;

    // 创建 UTC Date 对象
    const birthDateUTC = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHours, utcMinutes, 0));

    const lat = birth.lat ?? DEFAULT_LAT;
    const lon = birth.lon ?? DEFAULT_LON;

    const { positions, houseCusps } = await this.getPlanetPositions(birthDateUTC, lat, lon);
    // 相位计算包含：10大行星 + 四轴 + North Node
    const aspectBodies = [...PLANETS, 'Ascendant', 'Midheaven', 'Descendant', 'IC', 'North Node'];
    const aspects = this.calculateAspects(positions.filter(p => aspectBodies.includes(p.name)));

    const elements = { fire: 0, earth: 0, air: 0, water: 0 };
    const modalities = { cardinal: 0, fixed: 0, mutable: 0 };

    const elementMap: Record<string, keyof typeof elements> = {
      Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
      Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
      Gemini: 'air', Libra: 'air', Aquarius: 'air',
      Cancer: 'water', Scorpio: 'water', Pisces: 'water',
    };
    const modalityMap: Record<string, keyof typeof modalities> = {
      Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
      Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
      Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
    };

    for (const pos of positions.filter(p => PLANETS.includes(p.name as typeof PLANETS[number]))) {
      if (elementMap[pos.sign]) elements[elementMap[pos.sign]]++;
      if (modalityMap[pos.sign]) modalities[modalityMap[pos.sign]]++;
    }

    return { positions, aspects, dominance: { elements, modalities }, houseCusps };
  }

  async calculateNatalChart(birth: BirthInput): Promise<NatalChart> {
    const cacheKey = buildNatalCacheKey(birth);
    const now = Date.now();
    const cached = this.natalCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.value;
    if (cached) this.natalCache.delete(cacheKey);
    const pending = this.natalPending.get(cacheKey);
    if (pending) return pending;

    const promise = this.calculateNatalChartRaw(birth)
      .then((result) => {
        this.natalCache.set(cacheKey, { value: result, expiresAt: Date.now() + NATAL_CACHE_TTL_MS });
        this.natalPending.delete(cacheKey);
        return result;
      })
      .catch((error) => {
        this.natalPending.delete(cacheKey);
        throw error;
      });

    this.natalPending.set(cacheKey, promise);
    return promise;
  }

  async calculateTransits(birth: BirthInput, date: Date): Promise<TransitData> {
    const dateKey = date.toISOString().split('T')[0];
    const cacheKey = `${CACHE_PREFIX.TRANSIT}${buildBirthHash(birth)}:${dateKey}`;
    const cached = await cacheService.get<TransitData>(cacheKey);
    if (cached) return cached;
    const pending = this.transitPending.get(cacheKey);
    if (pending) return pending;

    const promise = (async () => {
    const { positions } = await this.getPlanetPositions(date, birth.lat ?? 31.23, birth.lon ?? 121.47);
    const natalChart = await this.calculateNatalChart(birth);
    const aspectBodies = [...PLANETS, 'North Node', 'Ascendant'] as const;
    const natalPlanets = natalChart.positions.filter(p => aspectBodies.includes(p.name as typeof aspectBodies[number]));
    const transitPlanets = positions.filter(p => aspectBodies.includes(p.name as typeof aspectBodies[number]));

    const transitAspects: Aspect[] = [];
    for (const transit of transitPlanets) {
      for (const natal of natalPlanets) {
        // 包含分钟精度
        const tDeg = transit.degree + (transit.minute || 0) / 60 + SIGNS.indexOf(transit.sign as typeof SIGNS[number]) * 30;
        const nDeg = natal.degree + (natal.minute || 0) / 60 + SIGNS.indexOf(natal.sign as typeof SIGNS[number]) * 30;
        const diff = Math.abs(tDeg - nDeg);
        const angle = diff > 180 ? 360 - diff : diff;

        for (const [type, config] of Object.entries(ASPECT_TYPES)) {
          if (Math.abs(angle - config.angle) <= config.orb) {
            transitAspects.push({
              planet1: `T-${transit.name}`,
              planet2: `N-${natal.name}`,
              type: type as Aspect['type'],
              orb: Math.round(Math.abs(angle - config.angle) * 100) / 100,
              isApplying: false,
            });
            break;
          }
        }
      }
    }

    const moonPos = positions.find(p => p.name === 'Moon');
    const sunPos = positions.find(p => p.name === 'Sun');
    let moonPhase = 'New Moon';
    if (moonPos && sunPos) {
      // 包含分钟精度
      const moonDeg = moonPos.degree + (moonPos.minute || 0) / 60 + SIGNS.indexOf(moonPos.sign as typeof SIGNS[number]) * 30;
      const sunDeg = sunPos.degree + (sunPos.minute || 0) / 60 + SIGNS.indexOf(sunPos.sign as typeof SIGNS[number]) * 30;
      const diff = ((moonDeg - sunDeg + 360) % 360);
      if (diff < 45) moonPhase = 'New Moon';
      else if (diff < 90) moonPhase = 'Waxing Crescent';
      else if (diff < 135) moonPhase = 'First Quarter';
      else if (diff < 180) moonPhase = 'Waxing Gibbous';
      else if (diff < 225) moonPhase = 'Full Moon';
      else if (diff < 270) moonPhase = 'Waning Gibbous';
      else if (diff < 315) moonPhase = 'Last Quarter';
      else moonPhase = 'Waning Crescent';
    }

      const transitData: TransitData = {
        date: dateKey,
        positions,
        aspects: transitAspects,
        moonPhase,
      };
      await cacheService.set(cacheKey, transitData, CACHE_TTL.TRANSIT);
      return transitData;
    })().finally(() => {
      this.transitPending.delete(cacheKey);
    });

    this.transitPending.set(cacheKey, promise);
    return promise;
  }

  // 计算周期（行星回归、相位周期等）
  async calculateCycles(birth: BirthInput, rangeMonths: number = 12): Promise<Array<{
    id: string;
    planet: string;
    type: string;
    start: string;
    peak: string;
    end: string;
  }>> {
    const natal = await this.calculateNatalChart(birth);
    const now = new Date();
    const cycles: Array<{ id: string; planet: string; type: string; start: string; peak: string; end: string }> = [];

    // 简化的周期计算：检查主要行运
    const outerPlanets = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    for (const planet of outerPlanets) {
      const natalPos = natal.positions.find(p => p.name === planet);
      if (!natalPos) continue;

      // 包含分钟精度
      const natalDeg = natalPos.degree + (natalPos.minute || 0) / 60 + SIGNS.indexOf(natalPos.sign as typeof SIGNS[number]) * 30;

      // 检查未来几个月的行运
      for (let m = 0; m < rangeMonths; m++) {
        const checkDate = new Date(now);
        checkDate.setMonth(checkDate.getMonth() + m);
        const transits = await this.calculateTransits(birth, checkDate);
        const transitPos = transits.positions.find(p => p.name === planet);
        if (!transitPos) continue;

        // 包含分钟精度
        const transitDeg = transitPos.degree + (transitPos.minute || 0) / 60 + SIGNS.indexOf(transitPos.sign as typeof SIGNS[number]) * 30;
        const diff = Math.abs(transitDeg - natalDeg);
        const angle = diff > 180 ? 360 - diff : diff;

        // 检查主要相位
        if (angle < 5) {
          cycles.push({
            id: `${planet}-return-${m}`,
            planet,
            type: 'Return',
            start: new Date(checkDate.getTime() - 30 * 86400000).toISOString().split('T')[0],
            peak: checkDate.toISOString().split('T')[0],
            end: new Date(checkDate.getTime() + 30 * 86400000).toISOString().split('T')[0],
          });
        } else if (Math.abs(angle - 180) < 5) {
          cycles.push({
            id: `${planet}-opposition-${m}`,
            planet,
            type: 'Opposition',
            start: new Date(checkDate.getTime() - 30 * 86400000).toISOString().split('T')[0],
            peak: checkDate.toISOString().split('T')[0],
            end: new Date(checkDate.getTime() + 30 * 86400000).toISOString().split('T')[0],
          });
        } else if (Math.abs(angle - 90) < 5) {
          cycles.push({
            id: `${planet}-square-${m}`,
            planet,
            type: 'Square',
            start: new Date(checkDate.getTime() - 14 * 86400000).toISOString().split('T')[0],
            peak: checkDate.toISOString().split('T')[0],
            end: new Date(checkDate.getTime() + 14 * 86400000).toISOString().split('T')[0],
          });
        }
      }
    }

    return cycles.slice(0, 10); // 限制返回数量
  }
}

export const ephemerisService = new SwissEphemerisService();

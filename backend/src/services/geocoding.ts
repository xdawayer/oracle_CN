// INPUT: 城市地理编码服务（含多语言与结构化位置解析）。
// OUTPUT: 导出城市搜索与校验函数（含模糊匹配、行政区过滤与超时回退）。
// POS: 地理编码服务；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { cacheService } from '../cache/redis.js';

// 默认位置：上海
const DEFAULT_LOCATION = {
  city: 'Shanghai',
  country: 'China',
  lat: 31.2304,
  lon: 121.4737,
  timezone: 'Asia/Shanghai',
};

export interface GeoLocation {
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  admin1?: string; // 省/州
}

// Open-Meteo Geocoding API
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const GEOCODING_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.GEOCODING_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3500;
})();

const LOCATION_SEPARATOR_REGEX = /[，,]+/;
const CJK_REGEX = /[\u4e00-\u9fff]/;
const containsCjk = (value: string) => CJK_REGEX.test(value);
const normalizeLocationValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s.'’"-]/g, '')
    .replace(/[，,]/g, '')
    .replace(/province|state|region|city|county|district|prefecture|municipality|autonomousregion|specialadministrativeregion|oblast|republic|territory|governorate/gi, '')
    .replace(/(省|市|州|地区|盟|县|区|自治区|特别行政区)/g, '');

type ParsedLocationQuery = {
  city: string;
  admin1?: string;
  country?: string;
  regionHint?: string;
};

const parseLocationQuery = (query: string): ParsedLocationQuery => {
  const parts = query
    .split(LOCATION_SEPARATOR_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { city: parts[0] || '' };
  if (parts.length === 2) return { city: parts[0], regionHint: parts[1] };
  return { city: parts[0], admin1: parts[1], country: parts.slice(2).join(' ') };
};

const normalizeCacheKeyPart = (value?: string) => (value ? normalizeLocationValue(value) : 'none');

const matchesLocationPart = (candidate: string | undefined, target: string) => {
  if (!candidate) return false;
  const normalizedCandidate = normalizeLocationValue(candidate);
  const normalizedTarget = normalizeLocationValue(target);
  if (!normalizedTarget) return false;
  return normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate);
};

const resolveSearchLanguage = (query: string, parsed: ParsedLocationQuery, preferred?: 'zh' | 'en') => {
  if (preferred) return preferred;
  const combined = [query, parsed.admin1, parsed.country, parsed.regionHint].filter(Boolean).join('');
  return containsCjk(combined) ? 'zh' : 'en';
};

async function fetchWithTimeout(url: string, timeoutMs = GEOCODING_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchCities(
  query: string,
  limit: number = 5,
  options: { language?: 'zh' | 'en' } = {}
): Promise<GeoLocation[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const parsed = parseLocationQuery(trimmedQuery);
  const searchTerm = parsed.city || trimmedQuery;
  const minLength = containsCjk(searchTerm) ? 1 : 2;
  if (searchTerm.length < minLength) return [];

  const safeLimit = Math.max(1, Math.min(limit, 10));
  const hasFilters = Boolean(parsed.admin1 || parsed.country || parsed.regionHint);
  const fetchCount = Math.min(safeLimit * (hasFilters ? 3 : 1), 20);
  const language = resolveSearchLanguage(trimmedQuery, parsed, options.language);

  // 检查缓存
  const cacheKey = `geo:search:${normalizeCacheKeyPart(searchTerm)}:${normalizeCacheKeyPart(parsed.admin1)}:${normalizeCacheKeyPart(parsed.country)}:${normalizeCacheKeyPart(parsed.regionHint)}:${language}:${safeLimit}`;
  const cached = await cacheService.get<GeoLocation[]>(cacheKey);
  if (cached) return cached;

  try {
    const fetchResults = async (lang: 'zh' | 'en') => {
      const url = `${GEOCODING_API}?name=${encodeURIComponent(searchTerm)}&count=${fetchCount}&language=${lang}&format=json`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.warn(`Geocoding API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return (data.results || []).map((r: any) => ({
        city: r.name,
        country: r.country,
        lat: r.latitude,
        lon: r.longitude,
        timezone: r.timezone,
        admin1: r.admin1,
      })) as GeoLocation[];
    };

    let results = await fetchResults(language);
    const fallbackLanguage = options.language
      ? (options.language === 'zh' && !containsCjk(searchTerm) ? 'en' : (options.language === 'en' && containsCjk(searchTerm) ? 'zh' : undefined))
      : undefined;
    if (fallbackLanguage && results.length === 0) {
      results = await fetchResults(fallbackLanguage);
    }

    if (hasFilters) {
      const regionHint = parsed.regionHint;
      const filtered = regionHint
        ? results.filter((item) =>
            matchesLocationPart(item.admin1, regionHint)
            || matchesLocationPart(item.country, regionHint))
        : results.filter((item) => {
            if (parsed.admin1 && !matchesLocationPart(item.admin1, parsed.admin1)) return false;
            if (parsed.country && !matchesLocationPart(item.country, parsed.country)) return false;
            return true;
          });
      if (filtered.length > 0) results = filtered;
    }

    // 缓存 1 天
    const finalResults = results.slice(0, safeLimit);
    await cacheService.set(cacheKey, finalResults, 86400);
    return finalResults;
  } catch (error) {
    console.error('Geocoding search failed:', error);
    return [];
  }
}

export async function resolveLocation(cityName: string): Promise<GeoLocation> {
  if (!cityName) return DEFAULT_LOCATION;

  // 检查缓存
  const cacheKey = `geo:resolve:${cityName.toLowerCase()}`;
  const cached = await cacheService.get<GeoLocation>(cacheKey);
  if (cached) return cached;

  try {
    const results = await searchCities(cityName, 1);
    if (results.length > 0) {
      await cacheService.set(cacheKey, results[0], 86400 * 7); // 缓存 7 天
      return results[0];
    }
  } catch (error) {
    console.error('Location resolution failed:', error);
  }

  // 解析失败，返回默认上海
  return DEFAULT_LOCATION;
}

export function getDefaultLocation(): GeoLocation {
  return { ...DEFAULT_LOCATION };
}

// INPUT: 天文数据源接口定义。
// OUTPUT: 导出数据源类型与接口。
// POS: 数据源抽象层；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import type { BirthInput, PlanetPosition, Aspect, NatalChart, TransitData } from '../types/api.js';

/**
 * 数据源接入方式：
 * 1. Swiss Ephemeris (swisseph npm 包) - 本地计算，精度高
 * 2. NASA Horizons API - 远程查询，用于验证或备用
 *
 * 调用边界：
 * - 本命盘计算：Swiss Ephemeris（本地）
 * - 行运计算：Swiss Ephemeris（本地）
 * - 月相数据：Swiss Ephemeris 或 NASA
 */

// === Swiss Ephemeris 封装 ===
export interface EphemerisService {
  /** 计算指定时刻的行星位置和宫头 */
  getPlanetPositions(date: Date, lat: number, lon: number): Promise<{
    positions: PlanetPosition[];
    houseCusps: number[];
  }>;

  /** 计算相位 */
  calculateAspects(positions: PlanetPosition[]): Aspect[];

  /** 计算完整本命盘 */
  calculateNatalChart(birth: BirthInput): Promise<NatalChart>;

  /** 计算行运 */
  calculateTransits(birth: BirthInput, date: Date): Promise<TransitData>;
}

// === NASA Horizons API 封装（备用）===
export interface NasaHorizonsService {
  /** 查询行星位置（用于验证） */
  queryPlanetPosition(planet: string, date: Date): Promise<{ ra: number; dec: number }>;
}

// === 行星常量 ===
export const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
] as const;

export const ASTEROIDS = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta', 'North Node'] as const;

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

// Aspect types with orb values aligned with frontend NATAL_CONFIG
// Frontend uses layered rendering: foreground (orb<=2°), midground (2-4°), background (4-6°)
export const ASPECT_TYPES = {
  conjunction: { angle: 0, orb: 8 },   // 合相
  opposition: { angle: 180, orb: 7 },  // 冲相
  square: { angle: 90, orb: 6 },       // 刑相
  trine: { angle: 120, orb: 6 },       // 拱相
  sextile: { angle: 60, orb: 4 },      // 六合
} as const;

// INPUT: 缓存层接口定义。
// OUTPUT: 导出缓存服务接口。
// POS: 缓存抽象层；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

/**
 * 技术栈确认：
 * - 后端：Node.js + TypeScript + Express
 * - 持久化：PostgreSQL（用户数据、历史记录）
 * - 缓存：Redis（计算结果、AI 输出）
 *
 * 缓存策略：
 * 1. 用户输入（BirthInput）：长期缓存，用户绑定
 * 2. 本命盘（NatalChart）：永久缓存，输入不变则结果不变
 * 3. 行运（TransitData）：按日期范围缓存，每日更新
 * 4. 合盘（SynastryData）：双用户绑定，永久缓存
 * 5. AI 输出：按 (输入hash + prompt版本) 缓存
 */

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// === 缓存 Key 前缀 ===
export const CACHE_PREFIX = {
  NATAL_CHART: 'natal:chart:',      // + hash(birthInput)
  TRANSIT: 'transit:',               // + hash(birthInput):date
  SYNASTRY: 'synastry:',            // + hash(birthA):hash(birthB)
  AI_OUTPUT: 'ai:',                  // + promptId:version:hash(input)
} as const;

// === TTL 配置（秒）===
export const CACHE_TTL = {
  NATAL_CHART: 0,                    // 永久
  TRANSIT: 86400,                    // 1 天
  SYNASTRY: 0,                       // 永久
  AI_OUTPUT: 604800,                 // 7 天
} as const;

// === Hash 工具 ===
export function hashInput(input: unknown): string {
  const str = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

import { Router } from 'express';
import { performance } from 'perf_hooks';
import { generateAIContentWithMeta } from '../services/ai.js';

export const pairingRouter = Router();

const VALID_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const VALID_ANIMALS = [
  '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪',
];

// 内存缓存：配对组合有限（~41000种含方向），缓存命中率高
const pairingCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 每小时清理一次过期条目

function getCacheKey(signA: string, signB: string, animalA: string, animalB: string): string {
  return `pairing:${signA}:${signB}:${animalA}:${animalB}`;
}

function getFromCache(key: string): unknown | null {
  const entry = pairingCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    pairingCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  pairingCache.set(key, { data, timestamp: Date.now() });
}

// 定时清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pairingCache) {
    if (now - entry.timestamp > CACHE_TTL) {
      pairingCache.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

// POST /api/pairing
pairingRouter.post('/', async (req, res) => {
  try {
    const requestStart = performance.now();
    const { signA, signB, animalA, animalB } = req.body;

    // 参数验证
    if (!signA || !signB || !animalA || !animalB) {
      return res.status(400).json({ error: '缺少必要参数：signA, signB, animalA, animalB' });
    }
    if (!VALID_SIGNS.includes(signA) || !VALID_SIGNS.includes(signB)) {
      return res.status(400).json({ error: '无效的星座 ID' });
    }
    if (!VALID_ANIMALS.includes(animalA) || !VALID_ANIMALS.includes(animalB)) {
      return res.status(400).json({ error: '无效的生肖' });
    }

    // 检查缓存
    const cacheKey = getCacheKey(signA, signB, animalA, animalB);
    const cached = getFromCache(cacheKey);
    if (cached) {
      const totalMs = performance.now() - requestStart;
      res.setHeader('Server-Timing', `core;dur=0,ai;dur=0,total;dur=${totalMs.toFixed(2)}`);
      return res.json({ content: cached, meta: { source: 'cache', cached: true } });
    }

    // 调用 AI 生成
    const aiStart = performance.now();
    const { content, meta } = await generateAIContentWithMeta({
      promptId: 'pairing-analysis',
      context: { signA, signB, animalA, animalB },
      lang: 'zh',
      maxTokens: 2048,
      timeoutMs: 60000,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=0,ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    // 写入缓存
    setCache(cacheKey, content.content);

    res.json({ content: content.content, meta });
  } catch (error) {
    console.error('Pairing Analysis Error:', error);
    res.status(500).json({ error: '配对分析生成失败，请稍后重试' });
  }
});

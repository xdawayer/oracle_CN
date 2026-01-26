// INPUT: Redis 缓存服务实现。
// OUTPUT: 导出缓存服务实例。
// POS: Redis 缓存实现；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import Redis from 'ioredis';
import type { CacheService } from './strategy.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisCacheService implements CacheService {
  private client: Redis | null = null;
  private connected = false;
  private connectionFailed = false;

  private async getClient(): Promise<Redis | null> {
    if (this.connectionFailed) return null;
    if (this.client && this.connected) return this.client;

    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 1) {
            this.connectionFailed = true;
            return null; // 停止重试
          }
          return 100;
        },
        connectTimeout: 2000,
        lazyConnect: true,
      });

      this.client.on('connect', () => { this.connected = true; });
      this.client.on('error', () => {
        this.connected = false;
        this.connectionFailed = true;
      });

      await this.client.connect();
      return this.client;
    } catch {
      console.warn('Redis connection failed, using in-memory fallback');
      this.connectionFailed = true;
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      if (!client) return memoryCache.get(key) as T | null;
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return memoryCache.get(key) as T | null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      const client = await this.getClient();
      if (!client) {
        memoryCache.set(key, value, ttlSeconds);
        return;
      }
      if (ttlSeconds && ttlSeconds > 0) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch {
      memoryCache.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      if (!client) {
        memoryCache.del(key);
        return;
      }
      await client.del(key);
    } catch {
      memoryCache.del(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return memoryCache.has(key);
      return (await client.exists(key)) === 1;
    } catch {
      return memoryCache.has(key);
    }
  }
}

// 内存缓存 fallback
const memoryStore = new Map<string, { value: unknown; expires?: number }>();

const memoryCache = {
  get(key: string): unknown | null {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expires && Date.now() > item.expires) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  set(key: string, value: unknown, ttlSeconds?: number): void {
    memoryStore.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  },
  del(key: string): void {
    memoryStore.delete(key);
  },
  has(key: string): boolean {
    return memoryStore.has(key);
  },
};

export const cacheService = new RedisCacheService();

// Redis 任务存储，用于 Ask/CBT 异步任务模式。
// 使用 cacheService（Redis + 内存 fallback），支持多实例部署。
// 每个任务有 10 分钟 TTL，由 Redis/缓存自动过期。

import { randomUUID } from 'crypto';
import { cacheService } from '../cache/redis.js';

interface TaskEntry {
  status: 'pending' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
  createdAt: number;
}

const TASK_TTL_SECONDS = 10 * 60; // 10 minutes
const KEY_PREFIX = 'task:';

export async function createTask(): Promise<string> {
  const taskId = randomUUID();
  await cacheService.set<TaskEntry>(
    KEY_PREFIX + taskId,
    { status: 'pending', createdAt: Date.now() },
    TASK_TTL_SECONDS,
  );
  return taskId;
}

export async function completeTask(taskId: string, result: Record<string, unknown>): Promise<void> {
  const task = await cacheService.get<TaskEntry>(KEY_PREFIX + taskId);
  if (task) {
    task.status = 'completed';
    task.result = result;
    await cacheService.set<TaskEntry>(KEY_PREFIX + taskId, task, TASK_TTL_SECONDS);
  }
}

export async function failTask(taskId: string, error: string, statusCode?: number): Promise<void> {
  const task = await cacheService.get<TaskEntry>(KEY_PREFIX + taskId);
  if (task) {
    task.status = 'failed';
    task.error = error;
    task.statusCode = statusCode;
    await cacheService.set<TaskEntry>(KEY_PREFIX + taskId, task, TASK_TTL_SECONDS);
  }
}

export async function getTask(taskId: string): Promise<TaskEntry | null> {
  return cacheService.get<TaskEntry>(KEY_PREFIX + taskId);
}

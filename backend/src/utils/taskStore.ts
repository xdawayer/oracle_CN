// 轻量级内存任务存储，用于 Ask/CBT 异步任务模式。
// 每个任务有 10 分钟 TTL，自动清理。

import { randomUUID } from 'crypto';

interface TaskEntry {
  status: 'pending' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
  createdAt: number;
}

const tasks = new Map<string, TaskEntry>();

const TASK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function createTask(): string {
  const taskId = randomUUID();
  tasks.set(taskId, { status: 'pending', createdAt: Date.now() });
  return taskId;
}

export function completeTask(taskId: string, result: Record<string, unknown>): void {
  const task = tasks.get(taskId);
  if (task) {
    task.status = 'completed';
    task.result = result;
  }
}

export function failTask(taskId: string, error: string, statusCode?: number): void {
  const task = tasks.get(taskId);
  if (task) {
    task.status = 'failed';
    task.error = error;
    task.statusCode = statusCode;
  }
}

export function getTask(taskId: string): TaskEntry | undefined {
  return tasks.get(taskId);
}

export function deleteTask(taskId: string): void {
  tasks.delete(taskId);
}

// Auto-cleanup expired tasks
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of tasks) {
    if (now - task.createdAt > TASK_TTL_MS) {
      tasks.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

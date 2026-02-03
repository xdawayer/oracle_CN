// INPUT: 流年报告异步任务 API。
// OUTPUT: 导出任务创建、状态查询、重试等路由。
// POS: 流年报告任务API；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.js';
import {
  createTask,
  getTaskStatus,
  getReportContent,
  retryTask,
  deleteTask,
} from '../services/annual-task.js';
import type { BirthInput, Language } from '../types/api.js';

/** 开发模式默认用户 ID */
const DEV_USER_ID = 'dev-user-annual-report';

export const annualTaskRouter = Router();

/**
 * POST /api/annual-task/create
 * 创建异步生成任务
 */
annualTaskRouter.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;

  const { birth, lang = 'zh' } = req.body as {
    birth?: Partial<BirthInput>;
    lang?: Language;
  };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const { task, isNew } = await createTask(userId, birth, lang);

    res.json({
      success: true,
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      isNew,
      estimatedMinutes: task.estimatedMinutes,
      message: isNew
        ? '任务已创建，报告将在后台生成'
        : task.status === 'completed'
          ? '报告已生成完成'
          : '报告正在生成中',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AnnualTask API] Create task failed:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/annual-task/status
 * 查询任务状态
 */
annualTaskRouter.get('/status', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;
  const { birth } = req.query as { birth?: string };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const birthData = JSON.parse(birth) as Partial<BirthInput>;
    const task = await getTaskStatus(userId, birthData);

    if (!task) {
      res.json({
        exists: false,
        status: 'none',
        message: '未找到任务',
      });
      return;
    }

    res.json({
      exists: true,
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      completedModules: task.completedModules,
      failedModules: task.failedModules,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      error: task.error,
      message: getStatusMessage(task.status, task.progress),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/annual-task/content
 * 获取报告内容（需要任务已完成或部分完成）
 */
annualTaskRouter.get('/content', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;
  const { birth } = req.query as { birth?: string };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const birthData = JSON.parse(birth) as Partial<BirthInput>;
    const result = await getReportContent(userId, birthData);

    if (!result) {
      res.status(404).json({ error: '报告尚未生成或任务不存在' });
      return;
    }

    res.json({
      success: true,
      modules: result.modules,
      meta: result.meta,
      completedModules: result.completedModules,
      totalModules: Object.keys(result.meta).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/annual-task/retry
 * 重试失败的任务
 */
annualTaskRouter.post('/retry', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;

  const { birth } = req.body as { birth?: Partial<BirthInput> };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const result = await retryTask(userId, birth);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        task: result.task,
      });
      return;
    }

    res.json({
      success: true,
      task: result.task,
      message: '重试任务已启动',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/annual-task
 * 删除任务（主要用于测试）
 */
annualTaskRouter.delete('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID;

  const { birth } = req.body as { birth?: Partial<BirthInput> };

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  try {
    const success = await deleteTask(userId, birth);

    res.json({
      success,
      message: success ? '任务已删除' : '删除失败',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

/** 获取状态消息 */
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'pending':
      return '任务等待中...';
    case 'processing':
      return `正在生成中 (${progress}%)`;
    case 'completed':
      return '报告已生成完成';
    case 'failed':
      return '生成失败，可以重试';
    default:
      return '未知状态';
  }
}

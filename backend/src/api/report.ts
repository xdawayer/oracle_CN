// INPUT: 通用报告异步任务 API。
// OUTPUT: 导出报告任务创建、状态查询、重试等路由。
// POS: 通用报告任务API；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.js';
import {
  createReportTask,
  getReportTaskStatus,
  getReportContent,
  retryReportTask,
  deleteReportTask,
  type ReportConfig,
} from '../services/report-task.js';
import { ANNUAL_REPORT_CONFIG } from '../services/annual-task.js';
import { NATAL_REPORT_CONFIG } from '../services/natal-report-task.js';
import { MONTHLY_REPORT_CONFIG, createMonthlyReportTask } from '../services/monthly-task.js';
import { LOVE_TOPIC_CONFIG } from '../services/love-topic-task.js';
import { CAREER_TOPIC_CONFIG } from '../services/career-topic-task.js';
import { WEALTH_TOPIC_CONFIG } from '../services/wealth-topic-task.js';
import type { BirthInput, Language } from '../types/api.js';

/** 开发模式默认用户 ID（仅 development 环境生效） */
const DEV_USER_ID = process.env.NODE_ENV === 'production' ? '' : 'dev-user-report';

/** 报告配置注册表 */
const REPORT_CONFIGS: Record<string, ReportConfig> = {
  annual: ANNUAL_REPORT_CONFIG,
  'natal-report': NATAL_REPORT_CONFIG,
  monthly: MONTHLY_REPORT_CONFIG,
  'love-topic': LOVE_TOPIC_CONFIG,
  'career-topic': CAREER_TOPIC_CONFIG,
  'wealth-topic': WEALTH_TOPIC_CONFIG,
};

/** 注册报告配置 */
export function registerReportConfig(config: ReportConfig): void {
  REPORT_CONFIGS[config.reportType] = config;
}

/** 获取报告配置 */
function getReportConfig(reportType: string): ReportConfig | null {
  return REPORT_CONFIGS[reportType] || null;
}

export const reportRouter = Router();

/**
 * POST /api/report/create
 * 创建异步生成任务
 */
reportRouter.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID || 'anonymous';

  const { reportType, birth, lang = 'zh', year, month } = req.body as {
    reportType?: string;
    birth?: Partial<BirthInput>;
    lang?: Language;
    year?: number;
    month?: number;
  };

  if (!reportType) {
    res.status(400).json({ error: 'Missing reportType' });
    return;
  }

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  const config = getReportConfig(reportType);
  if (!config) {
    res.status(400).json({ error: `Unknown report type: ${reportType}` });
    return;
  }

  try {
    // 月度报告需要额外的 year/month 参数，使用专用创建函数
    let task: Awaited<ReturnType<typeof createReportTask>>['task'];
    let isNew: boolean;
    if (reportType === 'monthly') {
      const now = new Date();
      const reportYear = year || now.getFullYear();
      const reportMonth = month || now.getMonth() + 1;
      if (reportMonth < 1 || reportMonth > 12 || reportYear < 1900 || reportYear > 2100) {
        res.status(400).json({ error: 'Invalid year or month' });
        return;
      }
      const result = await createMonthlyReportTask(userId, birth, reportYear, reportMonth, lang);
      task = result.task;
      isNew = result.isNew;
    } else {
      const result = await createReportTask(config, userId, birth, lang);
      task = result.task;
      isNew = result.isNew;
    }

    res.json({
      success: true,
      taskId: task.taskId,
      reportType: task.reportType,
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
    console.error(`[Report API] Create task failed:`, message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/report/status
 * 查询任务状态
 */
reportRouter.get('/status', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID || 'anonymous';
  const { reportType, birth } = req.query as { reportType?: string; birth?: string };

  if (!reportType) {
    res.status(400).json({ error: 'Missing reportType' });
    return;
  }

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  const config = getReportConfig(reportType);
  if (!config) {
    res.status(400).json({ error: `Unknown report type: ${reportType}` });
    return;
  }

  try {
    let birthData: Partial<BirthInput>;
    try {
      birthData = JSON.parse(birth) as Partial<BirthInput>;
    } catch {
      res.status(400).json({ error: 'Invalid birth data format' });
      return;
    }
    const task = await getReportTaskStatus(config, userId, birthData);

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
      reportType: task.reportType,
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
 * GET /api/report/content
 * 获取报告内容
 */
reportRouter.get('/content', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID || 'anonymous';
  const { reportType, birth } = req.query as { reportType?: string; birth?: string };

  if (!reportType) {
    res.status(400).json({ error: 'Missing reportType' });
    return;
  }

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  const config = getReportConfig(reportType);
  if (!config) {
    res.status(400).json({ error: `Unknown report type: ${reportType}` });
    return;
  }

  try {
    let birthData: Partial<BirthInput>;
    try {
      birthData = JSON.parse(birth) as Partial<BirthInput>;
    } catch {
      res.status(400).json({ error: 'Invalid birth data format' });
      return;
    }
    const result = await getReportContent(config, userId, birthData);

    if (!result) {
      res.status(404).json({ error: '报告尚未生成或任务不存在' });
      return;
    }

    res.json({
      success: true,
      reportType,
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
 * POST /api/report/retry
 * 重试失败的任务
 */
reportRouter.post('/retry', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID || 'anonymous';

  const { reportType, birth } = req.body as {
    reportType?: string;
    birth?: Partial<BirthInput>;
  };

  if (!reportType) {
    res.status(400).json({ error: 'Missing reportType' });
    return;
  }

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  const config = getReportConfig(reportType);
  if (!config) {
    res.status(400).json({ error: `Unknown report type: ${reportType}` });
    return;
  }

  try {
    const result = await retryReportTask(config, userId, birth);

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
 * DELETE /api/report
 * 删除任务
 */
reportRouter.delete('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId || DEV_USER_ID || 'anonymous';

  const { reportType, birth } = req.body as {
    reportType?: string;
    birth?: Partial<BirthInput>;
  };

  if (!reportType) {
    res.status(400).json({ error: 'Missing reportType' });
    return;
  }

  if (!birth) {
    res.status(400).json({ error: 'Missing birth data' });
    return;
  }

  const config = getReportConfig(reportType);
  if (!config) {
    res.status(400).json({ error: `Unknown report type: ${reportType}` });
    return;
  }

  try {
    const success = await deleteReportTask(config, userId, birth);

    res.json({
      success,
      message: success ? '任务已删除' : '删除失败',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/report/meta
 * 获取报告类型的模块元数据
 */
reportRouter.get('/meta', authMiddleware, (req: Request, res: Response) => {
  const { reportType } = req.query as { reportType?: string };

  if (!reportType) {
    // 返回所有已注册的报告类型
    res.json({
      reportTypes: Object.keys(REPORT_CONFIGS),
    });
    return;
  }

  const config = getReportConfig(reportType);
  if (!config) {
    res.status(400).json({ error: `Unknown report type: ${reportType}` });
    return;
  }

  res.json({
    reportType,
    moduleIds: config.moduleIds,
    moduleMeta: config.moduleMeta,
    estimatedMinutes: config.estimatedMinutes,
  });
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

/**
 * 日志 API 路由
 * - POST /error: 接收前端上报的错误日志
 * - GET /ai-metrics: 查询最近 AI 调用指标（需 secret 或 GM 环境）
 */
import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from './auth.js';
import { getAIMetrics } from '../services/ai.js';

const router = Router();

router.use(optionalAuthMiddleware);

/**
 * POST /api/log/error
 * 接收前端错误上报
 */
router.post('/error', (req: Request, res: Response) => {
  try {
    const { type, message, page } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'type and message required' });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: req.userId || 'anonymous',
      type,
      message: String(message).slice(0, 2000),
      page: page || '',
      userAgent: req.headers['user-agent'] || '',
    };

    // 输出到服务器日志（后续可接入 Sentry 等服务）
    console.error('[CLIENT_ERROR]', JSON.stringify(logEntry));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log error' });
  }
});

/**
 * GET /api/log/ai-metrics?limit=50
 * 查询最近 AI 调用指标（含汇总统计）
 *
 * 鉴权方式（满足任一即可）：
 *   1. header x-gm-secret 与环境变量 GM_SECRET 匹配
 *   2. NODE_ENV !== 'production'
 */
router.get('/ai-metrics', (req: Request, res: Response) => {
  const gmSecret = process.env.GM_SECRET;
  const isDevEnv = process.env.NODE_ENV !== 'production';
  const secretOk = gmSecret && req.headers['x-gm-secret'] === gmSecret;

  if (!isDevEnv && !secretOk) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const limit = Number(req.query.limit) || 0;
  const data = getAIMetrics(limit);
  res.json(data);
});

export default router;

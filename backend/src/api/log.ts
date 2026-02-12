/**
 * 错误日志 API 路由
 * 接收前端上报的错误日志
 */
import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from './auth.js';

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

export default router;

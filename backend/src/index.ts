// INPUT: Express 服务器配置（含环境变量加载与统一响应中间件）。
// OUTPUT: 启动 HTTP 服务（含百科与支付等 API 路由）。
// POS: 后端入口文件；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import path from 'path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import { natalRouter } from './api/natal.js';
import { dailyRouter } from './api/daily.js';
import { askRouter } from './api/ask.js';
import { synastryRouter } from './api/synastry.js';
import { cycleRouter } from './api/cycle.js';
import { cbtRouter } from './api/cbt.js';
import { geoRouter } from './api/geo.js';
import { detailRouter } from './api/detail.js';
import { wikiRouter } from './api/wiki.js';
import { syntheticaRouter } from './api/synthetica.js';
import authRouter from './api/auth.js';
import paymentRouter from './api/payment.js';
import paymentV2Router from './api/paymentV2.js';
import entitlementsRouter from './api/entitlements.js';
import entitlementsV2Router from './api/entitlementsV2.js';
import reportsRouter from './api/reports.js';
import gmRouter from './api/gm.js';
import { calendarRouter } from './api/calendar.js';
import { annualReportRouter } from './api/annual-report.js';
import { annualTaskRouter } from './api/annual-task.js';
import klineRouter from './api/kline.js';
import { pairingRouter } from './api/pairing.js';
import { reportRouter } from './api/report.js';
import wxpayRouter from './api/wxpay.js';
import wxpayService from './services/wxpayService.js';
import { userRouter } from './api/user.js';
import logRouter from './api/log.js';
import { apiResponseMiddleware } from './utils/apiResponse.js';
import { initDatabase } from './db/init.js';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '.env.local'),
];

envPaths.forEach((envPath) => {
  dotenv.config({ path: envPath });
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(compression());

// 全局请求超时中间件（120s，与 AI 超时一致）
app.use((_req, res, next) => {
  res.setTimeout(120_000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Raw body parser for webhooks (must be before express.json())
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payment/v2/webhook', express.raw({ type: 'application/json' }));
app.use('/api/wxpay/notify', express.raw({ type: 'application/json' }));
app.use('/api/wxpay/refund-notify', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(apiResponseMiddleware);

// 静态文件服务（头像上传等）
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// API Routes
app.use('/api/natal', natalRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/ask', askRouter);
app.use('/api/synastry', synastryRouter);
app.use('/api/cycle', cycleRouter);
app.use('/api/cbt', cbtRouter);
app.use('/api/geo', geoRouter);
app.use('/api/detail', detailRouter);
app.use('/api/wiki', wikiRouter);
app.use('/api/synthetica', syntheticaRouter);

// Auth & Payment Routes
app.use('/api/auth', authRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/payment', paymentV2Router);  // V2 路由挂载在 /v2 子路径
app.use('/api/entitlements', entitlementsRouter);
app.use('/api/entitlements', entitlementsV2Router);  // V2 路由挂载在 /v2 子路径
app.use('/api/reports', reportsRouter);
app.use('/api/gm', gmRouter);  // GM 测试命令
app.use('/api/calendar', calendarRouter);  // 农历日历转换
app.use('/api/annual-report', annualReportRouter);  // 2026 流年运势报告（SSE实时生成，已废弃）
app.use('/api/annual-task', annualTaskRouter);  // 2026 流年运势报告（异步任务模式）
app.use('/api/kline', klineRouter);  // 人生K线
app.use('/api/pairing', pairingRouter);  // 星座配对
app.use('/api/report', reportRouter);   // 通用报告（本命深度解读、流年运势等）
app.use('/api/wxpay', wxpayRouter);    // 微信支付
app.use('/api/user', userRouter);      // 用户资料
app.use('/api/log', logRouter);       // 错误日志上报

// Health check（含构建版本，用于验证部署是否生效）
const BUILD_VERSION = '20260304e';
app.get('/health', (_, res) => res.json({ status: 'ok', build: BUILD_VERSION }));

// POST echo 测试端点（验证异步任务流程是否正常）
app.post('/api/echo', async (req, res) => {
  const { createTask: ct, completeTask: cpt, getTask: gt } = await import('./utils/taskStore.js');
  const taskId = await ct();
  // 模拟 3 秒后完成任务
  setTimeout(async () => {
    await cpt(taskId, {
      lang: 'zh',
      content: {
        sections: [
          { type: 'deep_analysis', title: '异步测试', cards: [{ title: '诊断', content: '异步任务流程正常！build=' + BUILD_VERSION + ', taskId=' + taskId }] }
        ]
      },
    });
    console.log(`[Echo] Task ${taskId} completed after 3s`);
  }, 3000);
  console.log(`[Echo] Task ${taskId} created, will complete in 3s`);
  res.json({ taskId, status: 'pending', build: BUILD_VERSION });
});

// GET echo 轮询端点
app.get('/api/echo/result/:taskId', async (req, res) => {
  const { getTask: gt } = await import('./utils/taskStore.js');
  const task = await gt(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === 'pending') return res.json({ status: 'pending' });
  res.json({ status: 'completed', ...task.result });
});

// 启动时检查关键环境变量
const checkEnvVars = () => {
  const required = ['JWT_SECRET', 'WECHAT_APPID', 'WECHAT_APPSECRET'];
  const wxpayVars = ['WECHAT_MCH_ID', 'WECHAT_API_KEY_V3', 'WECHAT_PRIVATE_KEY', 'WECHAT_NOTIFY_URL'];
  const dbVars = ['MYSQL_HOST', 'MYSQL_DATABASE'];

  for (const v of required) {
    if (!process.env[v]) console.warn(`[WARN] 缺少必需环境变量: ${v}`);
  }

  const missingWxpay = wxpayVars.filter(v => !process.env[v]);
  if (missingWxpay.length > 0) {
    console.warn(`[WARN] 微信支付未完整配置 (${missingWxpay.join(', ')})，支付功能将不可用`);
  }

  const missingDb = dbVars.filter(v => !process.env[v]);
  if (missingDb.length > 0) {
    console.warn(`[WARN] MySQL 未配置 (${missingDb.join(', ')})，使用内存存储`);
  }
};
checkEnvVars();

// 启动服务：先初始化数据库，再监听端口
async function startServer() {
  // 自动建库建表（幂等，可重复执行）
  if (process.env.MYSQL_HOST) {
    try {
      await initDatabase();
    } catch (err) {
      console.error('[db-init] 数据库初始化失败，使用内存存储:', err);
    }
  }

  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);

    // 订单超时自动关闭：每 10 分钟检查一次
    setInterval(() => {
      wxpayService.closeExpiredOrders().catch(err => {
        console.error('[wxpay] 定时关闭超时订单异常:', err);
      });
    }, 10 * 60 * 1000);
  });
}

startServer();

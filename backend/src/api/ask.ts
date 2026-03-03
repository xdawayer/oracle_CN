// INPUT: Ask API 路由（异步任务模式：POST 提交 → GET 轮询结果）。
// OUTPUT: 导出 ask 路由（含权益校验、后台 AI 生成与轮询端点）。
// POS: Ask 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { AskRequest, AskChartType, Language } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContentWithMeta } from '../services/ai.js';
import { optionalAuthMiddleware } from './auth.js';
import entitlementServiceV2 from '../services/entitlementServiceV2.js';
import { calculateAge, getAgeGroup } from '../utils/age.js';
import { sanitizeUserInput } from '../services/content-security.js';
import { createTask, completeTask, failTask, getTask } from '../utils/taskStore.js';

export const askRouter = Router();

// Determine chart type based on category
const getChartType = (category?: string): AskChartType => {
  if (category === 'time_cycles') return 'transit';
  return 'natal';
};

// 后台处理 Ask AI 生成
async function processAskTask(
  taskId: string,
  body: AskRequest & { mode?: string; pairingContext?: unknown },
  userId: string | null,
  deviceFingerprint: string | undefined,
) {
  try {
    const requestStart = performance.now();
    const { birth, question: rawQuestion, context: rawContext, category, lang: langInput, mode } = body;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const question = sanitizeUserInput(rawQuestion || '');
    const context = rawContext ? sanitizeUserInput(rawContext) : rawContext;
    const chartType = getChartType(category);
    const promptId = mode === 'oracle' ? 'oracle-answer' : 'ask-answer';

    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, new Date()),
    ]);

    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);

    const { content, meta } = await generateAIContentWithMeta({
      promptId,
      context: { chart_summary: chartSummary, transit_summary: transitSummary, question, context, category, userAge, userAgeGroup, userBirthDate: birth.date },
      lang,
    });

    // AI 成功后再消耗配额
    const consumed = await entitlementServiceV2.consumeFeature(userId, 'ask', deviceFingerprint);
    if (!consumed) {
      failTask(taskId, 'Failed to consume feature', 403);
      return;
    }

    const totalMs = performance.now() - requestStart;
    console.log(`[Ask] Task ${taskId} completed: totalMs=${totalMs.toFixed(0)}, contentSize=${JSON.stringify(content.content).length}`);

    completeTask(taskId, {
      lang: content.lang,
      content: content.content,
      meta,
      chart,
      transits,
      chartType,
    } as unknown as Record<string, unknown>);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      console.warn(`[Ask] Task ${taskId} AIUnavailableError: ${error.reason}`);
      failTask(taskId, 'AI unavailable', 503);
      return;
    }
    console.error(`[Ask] Task ${taskId} error: ${(error as Error).message}`);
    failTask(taskId, (error as Error).message, 500);
  }
}

// POST /api/ask - 提交问答任务（立即返回 taskId）
askRouter.post('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { birth, question: rawQuestion } = req.body as AskRequest & { mode?: string };
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    // Quick validation
    if (!birth || !rawQuestion) {
      return res.status(400).json({ error: 'Missing required fields: birth, question' });
    }

    // Access check (fast, <1s)
    const access = await entitlementServiceV2.checkAccess(req.userId || null, 'ask', undefined, deviceFingerprint);
    if (!access.canAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        needPurchase: access.needPurchase,
        price: access.price,
      });
    }

    // Create task and start background processing
    const taskId = createTask();
    processAskTask(taskId, req.body, req.userId || null, deviceFingerprint);

    console.log(`[Ask] Task ${taskId} created for user ${req.userId || 'anon'}`);
    res.json({ taskId, status: 'pending' });
  } catch (error) {
    console.error(`[Ask] Submit error: ${(error as Error).message}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/ask/result/:taskId - 轮询任务结果
askRouter.get('/result/:taskId', (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found or expired' });
  }
  if (task.status === 'pending') {
    return res.json({ status: 'pending' });
  }
  if (task.status === 'failed') {
    const statusCode = task.statusCode || 500;
    return res.status(statusCode).json({ status: 'failed', error: task.error });
  }
  // completed
  res.json({ status: 'completed', ...task.result });
});

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

// 后台处理 Ask AI 生成（含权益校验 —— 全部在后台完成，POST 只做 createTask + return）
async function processAskTask(
  taskId: string,
  body: AskRequest & { mode?: string; pairingContext?: unknown },
  userId: string | null,
  deviceFingerprint: string | undefined,
) {
  try {
    const requestStart = performance.now();

    // 权益校验（移到后台，避免 MySQL 慢查询拖累 POST 响应）
    const access = await entitlementServiceV2.checkAccess(userId, 'ask', undefined, deviceFingerprint);
    if (!access.canAccess) {
      await failTask(taskId, 'Feature not available', 403);
      return;
    }

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
      await failTask(taskId, 'Failed to consume feature', 403);
      return;
    }

    const totalMs = performance.now() - requestStart;
    console.log(`[Ask] Task ${taskId} completed: totalMs=${totalMs.toFixed(0)}, contentSize=${JSON.stringify(content.content).length}`);

    await completeTask(taskId, {
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
      await failTask(taskId, 'AI unavailable', 503);
      return;
    }
    console.error(`[Ask] Task ${taskId} error: ${(error as Error).message}`);
    await failTask(taskId, (error as Error).message, 500);
  }
}

// POST /api/ask - 提交问答任务（立即返回 taskId，所有耗时操作在后台执行）
askRouter.post('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { birth, question: rawQuestion } = req.body as AskRequest & { mode?: string };
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    // Quick validation only — no DB queries in POST handler
    if (!birth || !rawQuestion) {
      return res.status(400).json({ error: 'Missing required fields: birth, question' });
    }

    // Create task and start background processing (checkAccess moved to processAskTask)
    const taskId = await createTask();
    processAskTask(taskId, req.body, req.userId || null, deviceFingerprint)
      .catch(async (err) => {
        console.error(`[Ask] Unhandled task error ${taskId}:`, err);
        await failTask(taskId, 'Internal error', 500);
      });

    console.log(`[Ask] Task ${taskId} created for user ${req.userId || 'anon'}`);
    res.json({ taskId, status: 'pending' });
  } catch (error) {
    console.error(`[Ask] Submit error: ${(error as Error).message}`);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/ask/result/:taskId - 轮询任务结果
askRouter.get('/result/:taskId', async (req, res) => {
  const task = await getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found or expired' });
  }
  if (task.status === 'pending') {
    return res.json({ status: 'pending' });
  }
  if (task.status === 'failed') {
    // 统一返回 HTTP 200，通过 body 传递任务级错误（避免 request 工具将其当作网络错误）
    return res.json({ status: 'failed', error: task.error, statusCode: task.statusCode || 500 });
  }
  // completed
  res.json({ status: 'completed', ...task.result });
});

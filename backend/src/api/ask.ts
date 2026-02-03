// INPUT: Ask API 路由（含权益校验与单语言输出）。
// OUTPUT: 导出 ask 路由（含类别上下文、SSE 流式输出、权益校验与 Server-Timing）。
// POS: Ask 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { AskRequest, AskResponse, AskChartType, Language } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContentWithMeta, generateAIContentStream, isStreamablePrompt } from '../services/ai.js';
import { optionalAuthMiddleware } from './auth.js';
import entitlementServiceV2 from '../services/entitlementServiceV2.js';
import { PRICING } from '../config/auth.js';

export const askRouter = Router();

// Determine chart type based on category
// time_cycles questions need transit chart (includes natal + current transits)
const getChartType = (category?: string): AskChartType => {
  if (category === 'time_cycles') return 'transit';
  return 'natal';
};

// POST /api/ask - 问答
askRouter.post('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const requestStart = performance.now();
    const { birth, question, context, category, lang: langInput } = req.body as AskRequest;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const chartType = getChartType(category);
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    const access = await entitlementServiceV2.checkAccess(
      req.userId || null,
      'ask',
      undefined,
      deviceFingerprint
    );
    if (!access.canAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        needPurchase: access.needPurchase,
        price: access.price,
      });
    }

    // Calculate natal chart and transits in parallel
    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, new Date()),
    ]);
    const coreMs = performance.now() - coreStart;

    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    const aiStart = performance.now();
    const { content, meta } = await generateAIContentWithMeta({
      promptId: 'ask-answer',
      context: { chart_summary: chartSummary, transit_summary: transitSummary, question, context, category },
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    const consumed = await entitlementServiceV2.consumeFeature(
      req.userId || null,
      'ask',
      deviceFingerprint
    );
    if (!consumed) {
      return res.status(403).json({
        error: 'Failed to consume feature',
        needPurchase: true,
        price: PRICING.ASK_SINGLE,
      });
    }

    res.json({
      lang: content.lang,
      content: content.content,
      meta,
      chart,
      transits,
      chartType,
    } as AskResponse);
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/ask/stream - 问答（SSE 流式输出）
askRouter.post('/stream', optionalAuthMiddleware, async (req, res) => {
  try {
    const requestStart = performance.now();
    const { birth, question, context, category, lang: langInput } = req.body as AskRequest;
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const chartType = getChartType(category);
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
    const promptId = 'ask-answer';

    // 若 prompt 不支持流式，降级为非流式
    if (!isStreamablePrompt(promptId)) {
      return res.status(400).json({ error: 'Streaming not supported for this prompt' });
    }

    const access = await entitlementServiceV2.checkAccess(
      req.userId || null,
      'ask',
      undefined,
      deviceFingerprint
    );
    if (!access.canAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        needPurchase: access.needPurchase,
        price: access.price,
      });
    }

    // Calculate natal chart and transits in parallel
    const coreStart = performance.now();
    const [chart, transits] = await Promise.all([
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, new Date()),
    ]);
    const coreMs = performance.now() - coreStart;

    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);

    // 客户端断连检测
    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Trailer', 'Server-Timing');
    res.flushHeaders();

    // 先发送星盘数据（前端可立即使用）
    res.write(`data: ${JSON.stringify({ type: 'meta', chart, transits, chartType, lang })}\n\n`);

    // 流式输出 AI 内容
    const aiStart = performance.now();
    const stream = generateAIContentStream({
      promptId,
      context: { chart_summary: chartSummary, transit_summary: transitSummary, question, context, category },
      lang,
    });

    for await (const chunk of stream) {
      if (clientDisconnected) {
        console.log(`[SSE] Client disconnected during streaming for ask`);
        break;
      }
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }

    if (clientDisconnected) {
      res.end();
      return;
    }

    // 消费权益（流式完成后才扣费）
    const consumed = await entitlementServiceV2.consumeFeature(
      req.userId || null,
      'ask',
      deviceFingerprint
    );
    if (!consumed) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to consume feature' })}\n\n`);
    }

    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    // 结束信号
    res.write('data: [DONE]\n\n');
    res.addTrailers({
      'Server-Timing': `core;dur=${coreMs.toFixed(2)},ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`,
    });
    res.end();
  } catch (error) {
    // 如果 headers 已发送，通过 SSE 发送错误
    if (res.headersSent) {
      const message = error instanceof AIUnavailableError
        ? `AI unavailable: ${error.reason}`
        : (error as Error).message;
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

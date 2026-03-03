// INPUT: Ask API 路由（含权益校验与单语言输出）。
// OUTPUT: 导出 ask 路由（含类别上下文、权益校验与 Server-Timing）。
// POS: Ask 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { AskRequest, AskResponse, AskChartType, Language } from '../types/api.js';
import { buildCompactChartSummary, buildCompactTransitSummary, ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContentWithMeta } from '../services/ai.js';
import { optionalAuthMiddleware } from './auth.js';
import entitlementServiceV2 from '../services/entitlementServiceV2.js';
import { PRICING } from '../config/auth.js';
import { calculateAge, getAgeGroup } from '../utils/age.js';
import { sanitizeUserInput } from '../services/content-security.js';

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
    const { birth, question: rawQuestion, context: rawContext, category, lang: langInput, mode } = req.body as AskRequest & { mode?: string };
    const lang: Language = langInput === 'en' ? 'en' : 'zh';
    const question = sanitizeUserInput(rawQuestion || '');
    const context = rawContext ? sanitizeUserInput(rawContext) : rawContext;
    const chartType = getChartType(category);
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
    const promptId = mode === 'oracle' ? 'oracle-answer' : 'ask-answer';

    // Parallelize access check with chart calculations
    const coreStart = performance.now();
    const [access, chart, transits] = await Promise.all([
      entitlementServiceV2.checkAccess(req.userId || null, 'ask', undefined, deviceFingerprint),
      ephemerisService.calculateNatalChart(birth),
      ephemerisService.calculateTransits(birth, new Date()),
    ]);
    const coreMs = performance.now() - coreStart;

    if (!access.canAccess) {
      return res.status(403).json({
        error: 'Feature not available',
        needPurchase: access.needPurchase,
        price: access.price,
      });
    }

    const chartSummary = buildCompactChartSummary(chart);
    const transitSummary = buildCompactTransitSummary(transits);
    const userAge = calculateAge(birth.date);
    const userAgeGroup = getAgeGroup(userAge);

    const aiStart = performance.now();
    const { content, meta } = await generateAIContentWithMeta({
      promptId,
      context: { chart_summary: chartSummary, transit_summary: transitSummary, question, context, category, userAge, userAgeGroup, userBirthDate: birth.date },
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


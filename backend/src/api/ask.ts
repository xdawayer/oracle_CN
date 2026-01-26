// INPUT: Ask API 路由（含权益校验与单语言输出）。
// OUTPUT: 导出 ask 路由（含类别上下文、权益校验与消费）。
// POS: Ask 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import type { AskRequest, AskResponse, AskChartType, Language, TransitData } from '../types/api.js';
import { ephemerisService } from '../services/ephemeris.js';
import { AIUnavailableError, generateAIContentWithMeta } from '../services/ai.js';
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

    // Calculate natal chart (always needed)
    const chart = await ephemerisService.calculateNatalChart(birth);

    // Calculate transits if needed for time_cycles questions
    let transits: TransitData | undefined;
    if (chartType === 'transit') {
      transits = await ephemerisService.calculateTransits(birth, new Date());
    }

    const { content, meta } = await generateAIContentWithMeta({
      promptId: 'ask-answer',
      context: { chart, transits, question, context, category },
      lang,
    });

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

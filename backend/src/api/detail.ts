// INPUT: 技术规格详情解读 API 路由。
// OUTPUT: 导出 detail 路由（懒加载 AI 详情解读与 Server-Timing）。
// POS: Detail 端点；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import { Router } from 'express';
import { performance } from 'perf_hooks';
import type { Language } from '../types/api.js';
import { AIUnavailableError, generateAIContent } from '../services/ai.js';

export const detailRouter = Router();

type DetailType = 'elements' | 'aspects' | 'planets' | 'asteroids' | 'rulers' | 'synthesis' | 'big3' | 'dimension' | 'deep';
type DetailContext = 'natal' | 'transit' | 'synastry' | 'composite';

interface DetailRequest {
  type: DetailType;
  context: DetailContext;
  lang: 'zh' | 'en';
  chartData: Record<string, unknown>;
  transitDate?: string;
  nameA?: string;
  nameB?: string;
}

function resolveLang(value: unknown): Language {
  return value === 'en' ? 'en' : 'zh';
}

function resolvePromptId(type: DetailType, context: DetailContext): string {
  return `detail-${type}-${context}`;
}

// POST /api/detail - 按需生成技术规格详情解读
detailRouter.post('/', async (req, res) => {
  try {
    const requestStart = performance.now();
    const body = req.body as DetailRequest;
    const { type, context, chartData, transitDate, nameA, nameB } = body;
    const lang = resolveLang(body.lang);

    if (!type || !context || !chartData) {
      res.status(400).json({ error: 'Missing required fields: type, context, chartData' });
      return;
    }

    const validTypes: DetailType[] = ['elements', 'aspects', 'planets', 'asteroids', 'rulers', 'synthesis', 'big3', 'dimension', 'deep'];
    const validContexts: DetailContext[] = ['natal', 'transit', 'synastry', 'composite'];

    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    if (!validContexts.includes(context)) {
      res.status(400).json({ error: `Invalid context: ${context}. Must be one of: ${validContexts.join(', ')}` });
      return;
    }

    const promptId = resolvePromptId(type, context);
    const promptContext: Record<string, unknown> = {
      type,
      context,
      chartData,
      transitDate,
      nameA,
      nameB,
    };

    const aiStart = performance.now();
    const result = await generateAIContent({
      promptId,
      context: promptContext,
      lang,
    });
    const aiMs = performance.now() - aiStart;
    const totalMs = performance.now() - requestStart;
    res.setHeader('Server-Timing', `core;dur=0,ai;dur=${aiMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`);

    res.json({
      type,
      context,
      lang: result.lang,
      content: result.content,
    });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      res.status(503).json({ error: 'AI unavailable', reason: error.reason });
      return;
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

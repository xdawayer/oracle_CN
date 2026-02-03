/**
 * K线 API 路由
 * 提供人生K线数据生成、年度报告和人生长卷接口
 */

import { Router, Request, Response } from 'express';
import {
  generateKLineData,
  calculateNatalSigns,
} from '../services/kline';
import { generateParallel } from '../services/parallel-generator';
import { generateAIContent } from '../services/ai';
import { entitlementServiceV2 } from '../services/entitlementServiceV2';
import { optionalAuthMiddleware } from './auth';

const router = Router();

// 应用可选认证中间件到所有路由
router.use(optionalAuthMiddleware);

/**
 * 解析出生日期字符串
 */
function parseBirthDate(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

/**
 * 解析出生时间字符串
 */
function parseBirthTime(timeStr?: string): number {
  if (!timeStr) return 12; // 默认中午

  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 12;

  const hour = parseInt(match[1], 10);
  if (hour < 0 || hour > 23) return 12;

  return hour;
}

/**
 * 生成四维运势评分（伪随机，保证一致性）
 */
function generateDimensionScores(baseScore: number, seed: number) {
  const rand = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  return {
    career: Math.min(100, Math.max(0, Math.round(baseScore + (rand(seed + 1) - 0.5) * 20))),
    wealth: Math.min(100, Math.max(0, Math.round(baseScore + (rand(seed + 2) - 0.5) * 25))),
    love: Math.min(100, Math.max(0, Math.round(baseScore + (rand(seed + 3) - 0.5) * 20))),
    health: Math.min(100, Math.max(0, Math.round(baseScore + (rand(seed + 4) - 0.5) * 15))),
  };
}

/**
 * GET /api/kline/generate
 * 生成K线数据
 */
router.get('/generate', async (req: Request, res: Response) => {
  try {
    const { birthDate, birthTime } = req.query;

    if (!birthDate || typeof birthDate !== 'string') {
      return res.status(400).json({ error: '缺少出生日期参数' });
    }

    const parsed = parseBirthDate(birthDate);
    if (!parsed) {
      return res.status(400).json({ error: '出生日期格式无效，请使用 YYYY-MM-DD 格式' });
    }

    const { year, month, day } = parsed;
    const hour = parseBirthTime(birthTime as string | undefined);

    // 生成K线数据
    const klineData = generateKLineData(year, month, day);

    // 计算本命盘信息
    const natalChart = calculateNatalSigns(year, month, day, hour);

    return res.json({
      klineData,
      natalChart,
    });
  } catch (error) {
    console.error('K线数据生成失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/kline/year-report
 * 生成年度深度报告（AI 生成）
 */
router.get('/year-report', async (req: Request, res: Response) => {
  try {
    const { birthDate, birthTime, year: yearParam } = req.query;

    // 参数校验
    if (!birthDate || typeof birthDate !== 'string') {
      return res.status(400).json({ error: '缺少出生日期参数' });
    }

    if (!yearParam || typeof yearParam !== 'string') {
      return res.status(400).json({ error: '缺少年份参数' });
    }

    const parsed = parseBirthDate(birthDate);
    if (!parsed) {
      return res.status(400).json({ error: '出生日期格式无效' });
    }

    const targetYear = parseInt(yearParam, 10);
    if (isNaN(targetYear) || targetYear < 1900 || targetYear > 2200) {
      return res.status(400).json({ error: '年份参数无效' });
    }

    // 权限校验（开发环境跳过）
    const isDev = process.env.NODE_ENV !== 'production';
    let requiresPayment = false;
    if (!isDev) {
      const userId = req.userId;
      if (userId) {
        const entitlements = await entitlementServiceV2.getEntitlements(userId);
        requiresPayment = !entitlements.isSubscriber && !entitlements.isTrialing;
      } else {
        requiresPayment = true;
      }

      if (requiresPayment) {
        return res.json({
          requiresPayment: true,
          report: null,
        });
      }
    }

    // 生成K线数据找到目标年份
    const klineData = generateKLineData(parsed.year, parsed.month, parsed.day);
    const yearData = klineData.find((d) => d.year === targetYear);

    if (!yearData) {
      return res.status(400).json({ error: '年份超出范围' });
    }

    // 计算本命盘
    const hour = parseBirthTime(birthTime as string | undefined);
    const natalChart = calculateNatalSigns(parsed.year, parsed.month, parsed.day, hour);

    // 生成四维参考分数
    const seed = parsed.year * 10000 + parsed.month * 100 + parsed.day + targetYear;
    const dimensionScores = generateDimensionScores(yearData.score, seed);

    // 构建共享上下文
    const sharedContext: Record<string, unknown> = {
      year: targetYear,
      age: yearData.age,
      score: yearData.score,
      ganzhi: yearData.ganzhi.full,
      trend: yearData.trend === 'bull' ? '上升' : '下降',
      isSaturnReturn: yearData.isSaturnReturn,
      isJupiterReturn: yearData.isJupiterReturn,
      isUranusOpposition: yearData.isUranusOpposition,
      sunSign: natalChart.sunSign.name,
      moonSign: natalChart.moonSign.name,
      ascendant: natalChart.ascendant.name,
    };

    // year-dimensions 需要额外的四维参考分数
    const dimensionsContext: Record<string, unknown> = {
      ...sharedContext,
      careerScore: dimensionScores.career,
      wealthScore: dimensionScores.wealth,
      loveScore: dimensionScores.love,
      healthScore: dimensionScores.health,
    };

    // 并行调用 3 个 prompt
    const parallelResult = await generateParallel({
      promptIds: ['kline-year-core', 'kline-year-dimensions', 'kline-year-tactical'],
      sharedContext,
      contextMap: {
        'kline-year-dimensions': dimensionsContext,
      },
      timeoutMs: 120000,
    });

    // 提取结果
    const coreResult = parallelResult.results.get('kline-year-core');
    const dimsResult = parallelResult.results.get('kline-year-dimensions');
    const tactResult = parallelResult.results.get('kline-year-tactical');

    // 检查是否所有模块都成功
    if (!coreResult?.success || !dimsResult?.success || !tactResult?.success) {
      const failures = [];
      if (!coreResult?.success) failures.push(`core: ${coreResult?.error}`);
      if (!dimsResult?.success) failures.push(`dimensions: ${dimsResult?.error}`);
      if (!tactResult?.success) failures.push(`tactical: ${tactResult?.error}`);
      console.error('[kline/year-report] AI generation partial failure:', failures.join('; '));
      return res.status(500).json({ error: 'AI 生成失败，请稍后重试' });
    }

    const core = coreResult.content!.content as Record<string, unknown>;
    const dims = dimsResult.content!.content as Record<string, unknown>;
    const tact = tactResult.content!.content as Record<string, unknown>;

    const report = {
      theme: core.theme,
      majorEvent: core.majorEvent,
      personalMessage: core.personalMessage,
      dimensions: dims,
      monthly: tact.monthly,
      actionAdvice: tact.actionAdvice,
      astroSummary: tact.astroSummary,
      baziSummary: tact.baziSummary,
    };

    return res.json({
      requiresPayment: false,
      report,
    });
  } catch (error) {
    console.error('年度报告生成失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/kline/life-scroll
 * 生成人生长卷六章报告（AI 生成）
 */
router.get('/life-scroll', async (req: Request, res: Response) => {
  try {
    const { birthDate, birthTime } = req.query;

    // 参数校验
    if (!birthDate || typeof birthDate !== 'string') {
      return res.status(400).json({ error: '缺少出生日期参数' });
    }

    const parsed = parseBirthDate(birthDate);
    if (!parsed) {
      return res.status(400).json({ error: '出生日期格式无效' });
    }

    // 权限校验（开发环境跳过）
    const isDev = process.env.NODE_ENV !== 'production';
    let requiresPayment = false;
    if (!isDev) {
      const userId = req.userId;
      if (userId) {
        const entitlements = await entitlementServiceV2.getEntitlements(userId);
        requiresPayment = !entitlements.isSubscriber && !entitlements.isTrialing;
      } else {
        requiresPayment = true;
      }

      if (requiresPayment) {
        return res.json({
          requiresPayment: true,
          report: null,
        });
      }
    }

    const hour = parseBirthTime(birthTime as string | undefined);
    const natalChart = calculateNatalSigns(parsed.year, parsed.month, parsed.day, hour);
    const klineData = generateKLineData(parsed.year, parsed.month, parsed.day);
    const currentYear = new Date().getFullYear();
    const currentYearData = klineData.find((d) => d.year === currentYear);

    // 构建上下文
    const context: Record<string, unknown> = {
      sunSign: natalChart.sunSign.name,
      sunElement: natalChart.sunSign.element,
      moonSign: natalChart.moonSign.name,
      moonElement: natalChart.moonSign.element,
      ascendant: natalChart.ascendant.name,
      ascElement: natalChart.ascendant.element,
      currentYear,
      currentAge: currentYearData?.age ?? (currentYear - parsed.year + 1),
      currentScore: currentYearData?.score ?? 50,
      currentTrend: currentYearData?.trend === 'bull' ? '上升' : '下降',
      birthDate,
      birthTime: birthTime || undefined,
    };

    const result = await generateAIContent<Record<string, string>>({
      promptId: 'kline-life-scroll',
      context,
      timeoutMs: 180000, // 长卷内容较多，给更长的超时
    });

    const report = result.content;

    return res.json({
      requiresPayment: false,
      report,
    });
  } catch (error) {
    console.error('人生长卷生成失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;

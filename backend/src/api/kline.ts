/**
 * K线 API 路由
 * 提供人生K线数据生成和年度报告接口
 */

import { Router, Request, Response } from 'express';
import {
  generateKLineData,
  calculateNatalSigns,
  generateYearTheme,
  generateMajorEvent,
  generateActionAdvice,
  generateMonthlyFortune,
  generatePersonalMessage,
  generateAstroSummary,
  generateBaziSummary,
} from '../services/kline';
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
 * 维度分析文案库
 */
const DIMENSION_ANALYSES = {
  career: {
    high: [
      '事业运势旺盛，贵人运强劲。上半年是开拓新领域的黄金时机，可能收到重要的晋升机会或合作邀约。下半年进入收获期，之前的努力将得到认可。建议主动展示才华，不要过于谦虚。',
      '职业发展进入快车道。领导力和影响力显著提升，适合承担更大责任。可能有外派、转岗或创业的机会。把握3-5月的关键窗口期。',
      '专业能力获得认可，行业地位提升。适合发表观点、参加行业活动、建立个人品牌。年中可能面临重要的职业选择，建议选择有长期价值的方向。',
    ],
    medium: [
      '事业运势平稳，稳中有进。虽然没有大的突破，但这正是打基础、积累实力的好时机。专注手头的项目，提升核心技能。下半年可能有小的晋升或加薪机会。',
      '职业发展进入巩固期。不宜冒进，但可以在现有框架内寻求优化。与同事、上级保持良好关系很重要。避免在8-9月做重大职业决定。',
      '这是"深耕"的一年。表面上可能感觉进展缓慢，但您正在积累未来爆发的能量。耐心很重要。年底可能会有意外的认可。',
    ],
    low: [
      '事业面临一定挑战，可能遇到项目受阻、人际摩擦或发展瓶颈。但这恰恰是反思和调整的机会。建议降低预期，专注于提升自身实力，而非追求外在成就。',
      '职场环境可能有些动荡。保持低调，做好本职工作，不要参与办公室政治。如果感到不满，不要冲动离职，先做好规划。年底情况会好转。',
      '这一年的挑战是让您看清什么才是真正重要的。有些您以为重要的东西需要放下，才能为真正的使命腾出空间。',
    ],
  },
  wealth: {
    high: [
      '财运亨通，正财偏财两相旺。工作收入有望增加，投资理财也可能有不错的回报。适合进行长期投资布局，但要注意不要过于激进。3-4月和10-11月是财运高峰期。',
      '财富积累的好年份。可能通过项目奖金、投资收益或副业获得额外收入。建议将一部分收益用于长期储蓄或投资。不要因为财运好就挥霍。',
      '有机会通过合作、合伙获得财富增长。人脉带来财运。但要注意选择合作对象，避免因为关系好就放松警惕。',
    ],
    medium: [
      '财运平稳，收支基本平衡。没有大的意外之财，但也不会有大的破财。适合保守理财，增加储蓄比例。避免高风险投资和借贷给他人。',
      '财务状况可控，但需要精打细算。可能有一些计划外的支出，建议预留应急资金。下半年财运略好于上半年。',
      '这是"开源节流"的一年。与其期待意外之财，不如专注于提升自己的赚钱能力。投资自己永远是最好的投资。',
    ],
    low: [
      '财运偏弱，需要谨慎理财。可能面临计划外支出或投资亏损。建议保守为主，避免大额消费和高风险投资。不要借钱给他人，也不要做担保。',
      '守财比生财更重要的一年。已有的资产要妥善保管，新的投资机会要反复考量。如果遇到"太好"的赚钱机会，很可能是陷阱。',
      '财务压力可能让您焦虑，但记住：钱是赚出来的，不是省出来的。专注于提升自己的价值，财运自然会好转。',
    ],
  },
  love: {
    high: [
      '感情运势旺盛，桃花朵朵开。单身者有望遇到心仪的对象，尤其是在社交活动、旅行或学习中。有伴侣者关系甜蜜，可能有重要的感情进展。',
      '爱情运进入收获期。之前的付出将得到回报。单身者可能在熟人介绍下遇到合适的人。已婚者家庭和睦，夫妻感情升温。',
      '魅力值飙升的一年！您会发现自己更有吸引力，也更清楚自己想要什么样的伴侣。不要将就，值得等待的人会出现。',
    ],
    medium: [
      '感情运势平稳，没有大的起伏。单身者可能有一些暧昧对象，但不一定能发展成正式关系，需要耐心。有伴侣者关系稳定，日常相处愉快。',
      '感情处于"考验期"。可能会面临一些沟通挑战或生活琐事的磨合。这恰恰是加深了解、巩固关系的机会。避免冷战，有话直说。',
      '爱情需要经营的一年。不要期待激情四射，而是要在平淡中培养默契。安排一些特别的活动，增添生活情趣。',
    ],
    low: [
      '感情运势偏弱，可能遇到一些挑战。单身者不要急于脱单，这一年遇到的人可能不太合适。有伴侣者需要警惕沟通问题和信任危机。',
      '关系中可能浮现一些深层问题。与其回避，不如正视。如果关系值得挽救，这是深度沟通的契机；如果不值得，也是放手的时机。',
      '感情上的波折是让您更清楚自己真正需要什么。不要因为孤独就降低标准，也不要因为恐惧就困在不健康的关系中。',
    ],
  },
  health: {
    high: [
      '健康运势良好，精力充沛，身体状态佳。适合增加运动量、尝试新的健身方式。但不要因为感觉好就忽视作息，保持规律生活很重要。',
      '身心状态都很好的一年。如果有旧疾，这一年可能明显好转。可以进行一些耐力训练或挑战性的运动。注意不要过度透支。',
      '活力满满！您会发现自己有更多能量去完成想做的事。这是培养健康习惯的好时机，现在建立的习惯将受益终身。',
    ],
    medium: [
      '健康状况整体可控，但需要留意一些小问题。可能有些疲劳感、亚健康症状。建议保持适度运动，注意饮食均衡，不要熬夜。',
      '身体发出的小信号不要忽视。定期体检很重要。工作压力可能影响睡眠质量，学习一些放松技巧会有帮助。',
      '这一年的健康重点是"预防"。不要等到生病才重视。调整生活方式，减少不健康的习惯。',
    ],
    low: [
      '健康需要格外关注的一年。可能出现一些身体不适或慢性病症状。建议做一次全面体检，有问题及早处理。情绪健康也要重视。',
      '身体在提醒您放慢脚步。不要用健康换取成功或金钱。必要时休息是为了走更长的路。考虑调整工作节奏。',
      '健康挑战是身体的警钟。也许您一直在透支，现在是调整的时候了。寻求专业医疗建议，同时关注心理健康。',
    ],
  },
};

/**
 * 生成维度分析
 */
function generateDimensionAnalysis(
  dimension: 'career' | 'wealth' | 'love' | 'health',
  score: number,
  year: number,
  age: number
): string {
  const level = score >= 65 ? 'high' : score >= 45 ? 'medium' : 'low';
  const options = DIMENSION_ANALYSES[dimension][level];
  return options[(year + age) % options.length];
}

/**
 * 生成四维运势评分
 */
function generateDimensionScores(baseScore: number, seed: number) {
  // 使用简单的伪随机函数
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
 * GET /api/kline/year-report
 * 生成年度深度报告
 */
router.get('/year-report', async (req: Request, res: Response) => {
  try {
    const { birthDate, year: yearParam } = req.query;

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

    // 从 JWT token 获取用户 ID（由 authMiddleware 设置）
    // 安全性：不再从 query 参数获取 userId，避免伪造
    let requiresPayment = false;
    const userId = req.userId;
    if (userId) {
      // 已登录用户：检查订阅状态
      const entitlements = await entitlementServiceV2.getEntitlements(userId);
      requiresPayment = !entitlements.isSubscriber && !entitlements.isTrialing;
    } else {
      // 未登录用户：需要付费
      requiresPayment = true;
    }

    // 如果需要付费，返回提示
    if (requiresPayment) {
      return res.json({
        requiresPayment: true,
        report: null,
      });
    }

    // 生成K线数据找到目标年份
    const klineData = generateKLineData(parsed.year, parsed.month, parsed.day);
    const yearData = klineData.find((d) => d.year === targetYear);

    if (!yearData) {
      return res.status(400).json({ error: '年份超出范围' });
    }

    // 生成年度报告
    const theme = generateYearTheme(yearData);
    const majorEvent = generateMajorEvent(yearData);
    const actionAdvice = generateActionAdvice(yearData);
    const monthly = generateMonthlyFortune(targetYear, yearData.score);
    const personalMessage = generatePersonalMessage(yearData.score, yearData.age, theme);
    const astroSummary = generateAstroSummary(targetYear, yearData.age);
    const baziSummary = generateBaziSummary(yearData.ganzhi);

    // 生成四维评分
    const seed = parsed.year * 10000 + parsed.month * 100 + parsed.day + targetYear;
    const dimensionScores = generateDimensionScores(yearData.score, seed);

    const report = {
      theme,
      majorEvent,
      dimensions: {
        career: {
          score: dimensionScores.career,
          analysis: generateDimensionAnalysis('career', dimensionScores.career, targetYear, yearData.age),
        },
        wealth: {
          score: dimensionScores.wealth,
          analysis: generateDimensionAnalysis('wealth', dimensionScores.wealth, targetYear, yearData.age),
        },
        love: {
          score: dimensionScores.love,
          analysis: generateDimensionAnalysis('love', dimensionScores.love, targetYear, yearData.age),
        },
        health: {
          score: dimensionScores.health,
          analysis: generateDimensionAnalysis('health', dimensionScores.health, targetYear, yearData.age),
        },
      },
      monthly,
      actionAdvice,
      astroSummary,
      baziSummary,
      personalMessage,
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

export default router;

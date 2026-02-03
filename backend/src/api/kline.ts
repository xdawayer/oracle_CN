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
      '事业运势旺盛，贵人运强劲，整体处于上升通道。上半年是开拓新领域的黄金时机，可能收到重要的晋升机会或合作邀约。下半年的重心则在巩固成果、建立长期优势上。建议主动争取展示自己的机会，比如主导一个新项目或在团队中提出创新方案。同时注意维护好关键人脉，他们会在关键时刻给你助力。',
      '职业发展进入快车道，领导力和影响力都在显著提升。你在专业领域的积累开始产生"复利效应"，周围人会越来越认可你的能力。上半年适合承担更大的责任或挑战更高的目标，下半年则是收获期，之前的努力会逐步兑现。建议把握住每一次被看见的机会，不要低调到让机会溜走。记住，这一年你值得更大的舞台。',
      '专业能力获得广泛认可，行业地位明显提升。这一年你可能会收到来自不同方向的橄榄枝——跳槽邀请、合作提议或晋升通知。上半年重点在"出圈"，适合发表观点、参加行业活动、扩大影响力；下半年适合沉淀和深耕，把新获得的资源转化为长期优势。建议在精力允许的情况下多做一些跨界交流，你的视野决定了你的天花板。',
    ],
    medium: [
      '事业运势平稳，虽然没有大的飞跃，但整体在稳中有进。这正是打基础、积累实力的好时机，就像盖房子的地基阶段——看不见但至关重要。上半年可能会感觉进展缓慢，但下半年会逐渐看到回报。建议利用这段时间提升核心技能，比如考个证、学个新工具，或者把手头的项目做到极致。耐心是你今年最大的武器。',
      '职业发展进入巩固期，不宜冒进，但可以在现有框架内寻求优化。你可能会觉得当前的工作节奏有些平淡，但换个角度看，这恰好是你"修炼内功"的绝佳窗口。上半年适合梳理工作流程、优化效率，下半年可以小范围尝试一些新方向。建议找一位你佩服的前辈聊聊，他们的经验可能会帮你打开新思路。',
      '这是一个"深耕"的年份。表面上可能感觉进展缓慢，甚至有些焦虑，但实际上你正在积累未来爆发的能量。就像竹子前四年只长了3厘米，但第五年开始每天长30厘米——根基决定高度。建议把注意力从"别人怎么看我"转移到"我还能学到什么"上来。保持专注，减少无效社交，把时间花在真正能提升自己的事情上。',
    ],
    low: [
      '事业面临一定挑战，可能遇到项目受阻、方向调整或发展瓶颈。这并不意味着你做得不好，而是外部环境在推动你重新审视自己的职业路径。上半年压力可能较大，但下半年会逐步好转。建议降低预期、专注于提升自身实力，把每一次挫折都当作学习的机会。记住，很多成功人士都是在低谷期完成了最重要的转型。',
      '职场环境可能有些动荡，团队变动、项目调整或领导更替都可能发生。面对这些变化不必过度焦虑，保持低调、做好本职工作是最稳妥的策略。上半年以"守"为主，避免做重大职业决定；下半年情况会明显好转，届时再考虑新的发展方向。建议利用这段时间多观察、多思考，弄清楚自己真正想要什么样的职业生活。',
      '这一年的事业挑战其实是在帮你看清什么才是真正重要的。有些路走不通，不是因为你不够好，而是因为那不是属于你的方向。上半年可能会经历一些让你沮丧的事情，但这恰恰是宇宙在"清理"你生命中不适合的部分。建议减少抱怨、增加行动，把精力集中在你能控制的事情上。年底回头看，你会感谢现在的自己。',
    ],
  },
  wealth: {
    high: [
      '财运亨通，无论是工资收入还是额外收益都有增长的空间。上半年3-4月和下半年10-11月是财运的两个高峰期，适合做重要的财务决策或投资布局。整体来看，这一年的财富增长主要来自你的专业能力和人脉资源。建议在收入增加的同时，拿出一部分做长期储蓄或稳健投资，为未来打好财务基础。花钱可以大方，但不要冲动消费。',
      '财富积累进入良性循环的一年，之前的努力开始在经济上获得回报。你可能会发现赚钱的渠道在增多，收入来源也更加多元化。上半年适合开拓新的收入渠道，下半年则适合整合资源、优化投资组合。建议把一部分收益用于长期储蓄或投资，让钱为你"工作"。同时适当犒劳自己，你值得享受努力的成果。',
      '财运上升期，有机会通过合作、合伙等方式获得可观的财富增长。"人脉就是钱脉"这句话在今年体现得尤为明显。上半年多参加社交活动，你可能会在不经意间遇到能带来财富机遇的人。下半年适合落实上半年达成的合作意向。建议对大额投资保持理性，做好风险评估后再行动，不要因为运势好就放松警惕。',
    ],
    medium: [
      '财运平稳，收支基本平衡，不会有大的起落。虽然不是"暴富"的年份，但也不必担心经济压力。上半年的财务状况可能略紧，下半年会有所好转。这是一个适合保守理财、增加储蓄比例的时期。建议审视一下自己的消费习惯，砍掉不必要的订阅和冲动消费，把省下来的钱投入到能产生长期回报的地方。',
      '财务状况整体可控，但需要精打细算才能过得舒适。这一年的关键词是"量入为出"，避免超前消费和不必要的借贷。上半年可能会有一笔计划外的支出，提前做好应急储备很重要。下半年财运略好于上半年，适合做一些小额投资的尝试。建议学习一些基础的理财知识，哪怕每月只存一小笔，积少成多也是一种力量。',
      '这是一个"开源节流"的年份，财务增长的空间有限，但也不会出现严重的经济困难。与其焦虑于短期收入，不如把目光放长远——投资自己永远是回报率最高的投资。上半年适合学习新技能来提升未来的赚钱能力，下半年可能会因为之前的积累而看到一些财务上的好转。建议建立记账习惯，了解自己的钱都花在了哪里。',
    ],
    low: [
      '财运偏弱，需要比平时更加谨慎地管理财务。建议以保守为主，避免大额消费和高风险投资。上半年可能会遇到一些意外支出，提前准备好应急资金非常重要。下半年情况会逐步改善，但仍需保持节制。这一年的核心策略是"守住底线"——确保基本生活质量不受影响，其余的都可以暂时放一放。记住，财务低谷期终会过去。',
      '守财比生财更重要的一年。如果遇到看起来"太好"的赚钱机会，一定要多一分警惕，很可能是陷阱或高风险项目。上半年尤其要注意避免借钱给别人或参与不熟悉的投资。下半年财运会有所回暖，但仍建议以稳为主。这段时间适合梳理自己的财务状况，把该还的债务理清，该砍的支出砍掉，为来年的好转做准备。',
      '财务压力可能让你感到焦虑，但请记住——经济状况是暂时的，你创造价值的能力是持久的。与其纠结于短期收入的不理想，不如把精力放在提升自己的核心竞争力上，财运自然会随之好转。上半年以"缩减开支、保存实力"为主，下半年可以开始寻找新的收入机会。建议和信任的朋友聊聊你的困惑，有时候一个好建议胜过自己闷头想。',
    ],
  },
  love: {
    high: [
      '感情运势旺盛，个人魅力处于高峰期。单身的朋友有望在社交场合遇到心仪的对象，尤其是上半年3-5月和下半年9-10月桃花运最旺。已有伴侣的人感情会更加甜蜜，适合一起规划未来或做一些有仪式感的事情。建议多参加聚会、兴趣活动，主动制造与优质异性接触的机会。但也要保持一定的判断力，不要被表面的浪漫冲昏头脑。',
      '爱情运进入收获期，之前在感情中的真诚付出将得到温暖的回报。你会发现身边的人越来越被你吸引——不仅是外在，更是你内在散发出的自信和温暖。单身者可能通过朋友介绍或工作场合遇到值得深交的人。有伴侣者关系更加深入和稳固，适合讨论一些重要的共同话题。建议用心感受每一段关系带给你的成长，好的感情会让你变成更好的自己。',
      '魅力值飙升的一年，你会明显感觉到身边人对你的好感和关注在增加。单身的朋友不要将就——这一年你值得等待真正让你心动的人。有伴侣者可能会经历感情的"升温期"，适合安排旅行或共同体验新事物来加深感情。建议在享受被追捧的同时保持真诚，最好的感情从来不需要伪装。上半年是感情升温期，下半年是稳定期。',
    ],
    medium: [
      '感情运势平稳，没有大起大落，但也正因如此，这是一个适合沉下心来认真经营感情的年份。单身者可能暂时不会遇到特别心动的人，但不必焦虑——利用这段时间搞清楚自己真正想要什么样的伴侣更重要。有伴侣者可能会感觉感情进入了"平淡期"，但平淡不等于无趣，主动创造一些小惊喜就能重新点燃火花。建议多和伴侣或朋友深度交流，了解彼此的内心世界。',
      '感情处于"考验期"，这听起来有点吓人，但其实是一个加深了解、巩固关系的好机会。这一年你们可能会因为一些小事产生分歧，但正是这些摩擦让你们更加了解彼此的底线和需求。单身者在选择对象时会更加理性和成熟，不太容易被表面吸引。建议遇到矛盾时学会换位思考，好的感情不是没有冲突，而是每次冲突后都能变得更近。',
      '爱情需要用心经营的一年。日常的忙碌可能让你忽略了感情中的细节，但恰恰是这些细节决定了关系的温度。建议安排一些特别的活动——不需要多花钱，一起做顿饭、看场电影、散个步都是增进感情的好方式。单身者不妨降低一些"硬性标准"，多给不同类型的人一些接触的机会，你可能会发现意外的惊喜。上半年适合反思，下半年适合行动。',
    ],
    low: [
      '感情运势偏弱，可能会遇到一些让你心累的情况。单身的朋友不要急于脱单——在状态不好的时候仓促开始的感情，往往质量不高。有伴侣者可能会因为沟通不畅或期望落差而产生摩擦。上半年是感情的"低谷期"，建议多把精力放在自我成长上；下半年情况会好转，届时你会以更好的状态去面对感情。记住，爱别人之前先学会爱自己。',
      '关系中可能浮现一些之前被忽略的深层问题，比如价值观差异、生活习惯冲突或信任危机。与其继续回避，不如趁这个机会正面面对——虽然过程可能不舒服，但这是关系走向真正亲密的必经之路。单身者可能会经历一段"看谁都不顺眼"的阶段，这其实是你内心标准在提升的表现。建议有困惑时找信任的朋友倾诉，或者写日记梳理自己的感受。',
      '感情上的波折虽然让人难受，但其实是在帮你更清楚地认识自己真正需要什么。有些人注定只能陪你走一段路，学会放手也是一种成长。上半年感情上的不顺可能会影响你的心情，但请不要因此否定自己的价值。下半年你会慢慢走出阴霾，重新对感情充满期待。建议在低谷期多做让自己开心的事情，培养新的兴趣爱好，你会发现最好的感情往往出现在你最不执着的时候。',
    ],
  },
  health: {
    high: [
      '健康运势良好，精力充沛，免疫力也处于较高水平。这是一个非常适合建立健康生活习惯的年份——无论是开始跑步、健身、瑜伽还是学习一项新运动，你的身体都会给你积极的反馈。上半年精力最旺，适合挑战一些有难度的运动目标；下半年注意劳逸结合，不要因为状态好就过度透支。建议趁状态好的时候做一次全面体检，建立自己的健康档案。',
      '身心状态都很好的一年，你会明显感觉到自己的精神面貌和体力都有提升。这是培养长期健康习惯的好时机——现在养成的好习惯可以受益很多年。建议设定一些具体的健康目标，比如每周运动3次、每天睡够7小时、减少外卖频率等。上半年可以尝试不同的运动找到适合自己的，下半年坚持执行形成习惯。心理健康同样重要，多做让自己感到放松和快乐的事。',
      '活力满满的一年，身体底子好就是你最大的资本。但好的健康状态不是用来挥霍的，而是用来投资的。建议利用这段时间认真了解自己的身体——什么食物让你状态最好、什么运动最适合你、什么样的作息让你精力最充沛。上半年多尝试、多探索，下半年固定下来形成规律。记住，你现在对身体的善待，就是给未来的自己最好的礼物。',
    ],
    medium: [
      '健康状况整体可控，但身体可能会发出一些小信号提醒你注意。常见的表现包括偶尔的疲劳感、睡眠质量下降或消化系统不适。这些虽然不是大问题，但不应忽视。建议保持适度运动——不需要高强度，每天散步30分钟就很好。上半年特别注意肠胃保养，少吃外卖和冷饮；下半年注意颈椎和腰椎的保护，久坐族尤其要注意。',
      '身体发出的小信号不要忽视，它们往往是更大问题的前兆。这一年建议把"定期体检"提上日程，尤其关注之前容易忽略的项目。心理健康同样重要——如果经常感到莫名的疲惫或情绪低落，可能是压力在身体上的反映。建议培养一个放松的爱好，比如冥想、画画或者泡澡。上半年以调整为主，下半年你会感觉状态明显好转。',
      '这一年的健康重点是"预防胜于治疗"。你的身体可能没有明显的大毛病，但一些不健康的习惯已经在暗中消耗你的元气。建议认真审视一下自己的生活方式——熬夜、久坐、饮食不规律、过度看手机，这些"隐形杀手"需要被重视。上半年找到问题所在，下半年逐步改善。哪怕每天只改变一个小习惯，一年下来也是巨大的进步。',
    ],
    low: [
      '健康需要格外关注的一年，身体和心理都可能承受比平时更大的压力。建议尽快安排一次全面体检，尤其关注之前有过不适的部位。情绪健康也要重视——如果经常感到焦虑、失眠或情绪波动，不要硬扛，及时寻求专业帮助。上半年是需要特别注意的时期，减少不必要的应酬和熬夜；下半年身体会逐步恢复。记住，健康是所有成就的基石。',
      '身体在用各种方式提醒你放慢脚步。你可能会感到比往年更容易疲劳、更容易生病或者恢复变慢。这不是你变"弱"了，而是之前透支的健康在要求"偿还"。必要时主动休息，是为了能走更长的路。建议这一年在饮食上下功夫——多吃新鲜蔬果、减少加工食品、保证充足的蛋白质摄入。上半年以养为主，下半年可以开始逐步增加运动量。',
      '健康挑战是身体给你敲响的警钟，提醒你重新审视自己的生活方式。虽然可能会有一些不舒服的症状，但大多数情况下通过调整作息和积极治疗都可以好转。最重要的是不要忌讳就医——有不舒服就去看，早发现早处理比什么都强。建议减少工作强度、增加休息时间、远离让你焦虑的人和事。把健康放在第一位，其他的事情缓一缓都来得及。',
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
    const baziSummary = generateBaziSummary(yearData.ganzhi, yearData.score);

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

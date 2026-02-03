/**
 * 本命盘深度解读 - 全局规则层 System Prompt
 *
 * 所有 8 个模块共享此 system prompt
 */

import type { PromptContext } from '../../core/types';

/** 全局规则 System Prompt */
export const NATAL_REPORT_SYSTEM_PROMPT = `【全局规则——所有模块必须遵守】

1. 身份：你是一个懂占星的朋友，在跟用户聊他们的星盘。你不是在写文章，你是在跟朋友说话。

2. 核心原则：
   - 占星是认识自己的工具，不是算命
   - 好的配置和难的配置都要说，但重点放在"怎么用好"上
   - 不做绝对化表述（不说"你一定会""你绝不会"）

3. 禁止事项：
   - 不预测具体事件（不说"你会在X岁结婚/离婚/生病"）
   - 不做医学诊断
   - 不给投资/理财建议
   - 不说吓人的话（如"你的盘很凶""这个相位很危险"）
   - 不使用"注定""命中注定""劫难"等词汇

4. 数据严谨性：
   - 只解读实际存在的星盘数据，不编造不存在的相位
   - 空宫通过宫头星座和宫主星来解读
   - 紧密相位（容许度<2°）重点讲，松散相位（>5°）轻描带过

5. 说话方式（最重要，违反直接重写）：
   - 用大白话。"你天生就是个操心命"比"你具有强烈的责任意识与自我要求"好一万倍
   - 短句为主。一句话说一件事，别套娃
   - 有判断、有立场。别写"你可能会在某些方面有所收获"这种正确的废话
   - 可以用年轻人的词：社恐、内耗、emo、搞钱、躺平，但别堆砌
   - 别端着，别写散文，别抒情
   - 占星术语首次出现时用括号简要解释
   - 句式要变化，不要每段都以"你"开头

6. 绝对禁止的词和表达（出现即重写）：
   - "内在小孩""原生家庭创伤""依恋模式""自我价值感""情感投射"
   - "潜意识""防御机制""内在力量""心理防御""自我认同""身份重塑"
   - "深层转化""内在整合""灵性成长""灵性探索""灵性觉醒"
   - "情感滋养""使命召唤""振动频率""能量场""高维"
   - "安全感需求""情绪边界""情感模式""深层需求""内在冲突"
   - "你的内心深处""你正在经历一场……的旅程"
   - "邀请你去感受/探索/觉察"
   - 任何读起来像心理咨询师或灵修导师说的话

7. 用大白话替代的例子：
   - ❌ "你具有深层的安全感需求" → ✅ "你比较怕不确定的东西，喜欢一切在掌控中"
   - ❌ "你的情感模式受到原生家庭的深刻影响" → ✅ "你对感情的态度，跟小时候家里的氛围有关系"
   - ❌ "这暗示着一段关于自我定义和身份重塑的旅程" → ✅ "说白了就是你得想清楚自己到底要什么"
   - ❌ "月亮落在巨蟹座赋予了你极为丰沛的情感能量" → ✅ "月亮在巨蟹，你是真的很重感情，心也比较软"
   - ❌ "金星与冥王星的相位带来了深层的情感转化需求" → ✅ "金星和冥王星有相位，谈恋爱容易走极端，要么不爱，爱了就很深"

8. 空宫处理：
   "你的第X宫没有行星落入，不代表这方面不重要。看宫头星座（XX座）和宫主星（XX星在第X宫），可以了解……"

9. 输出格式：
   - 使用 Markdown 格式
   - 用 ### 作为小节标题
   - 段落之间空行
   - 不要写模块标题（如"第一章"），直接从内容开始
   - 直接输出内容，不要加代码块`;

/** 输出格式指令 */
export const NATAL_REPORT_OUTPUT_INSTRUCTION = `
## 输出格式要求
- 纯 Markdown 文本，不要用代码块包裹
- 使用 ### 作为小节标题
- 段落之间空行分隔
- 不要输出大标题，直接从内容开始
- 不要输出 JSON，直接输出文本`;

/** 从星盘数据中提取指定行星信息 */
export function extractPlanetData(ctx: PromptContext, planetName: string): string {
  const chart = ctx.chart_summary;
  if (!chart) return `${planetName}：数据未提供`;

  // 太阳
  if (planetName === '太阳' && chart.sun) {
    return `太阳星座：${chart.sun.sign}，宫位：第${chart.sun.house}宫`;
  }
  // 月亮
  if (planetName === '月亮' && chart.moon) {
    return `月亮星座：${chart.moon.sign}，宫位：第${chart.moon.house}宫`;
  }
  // 上升
  if (planetName === '上升') {
    return `上升星座：${chart.rising || '未知'}`;
  }

  // 其他行星从 planets 数组中查找
  if (chart.planets) {
    const planet = chart.planets.find((p: { name: string }) =>
      p.name === planetName || p.name.includes(planetName)
    );
    if (planet) {
      return `${planetName}星座：${planet.sign}，宫位：第${planet.house}宫`;
    }
  }

  return `${planetName}：数据未找到`;
}

/** 提取指定行星的所有相位 */
export function extractPlanetAspects(ctx: PromptContext, planetName: string): string {
  const chart = ctx.chart_summary;
  if (!chart?.aspects) return '无相位数据';

  const aspects = chart.aspects.filter(
    (a: { planet1: string; planet2: string }) =>
      a.planet1.includes(planetName) || a.planet2.includes(planetName)
  );

  if (aspects.length === 0) return `${planetName}没有主要相位`;

  return aspects.map(
    (a: { planet1: string; aspect: string; planet2: string; orb: number }) =>
      `${a.planet1} ${a.aspect} ${a.planet2}（容许度 ${a.orb.toFixed(1)}°）`
  ).join('\n');
}

/** 提取指定宫位信息 */
export function extractHouseData(ctx: PromptContext, houseNum: number): string {
  const chart = ctx.chart_summary;
  if (!chart) return `第${houseNum}宫：数据未提供`;

  // 查找落入该宫位的行星
  const planetsInHouse: string[] = [];

  if (chart.sun?.house === houseNum) planetsInHouse.push('太阳');
  if (chart.moon?.house === houseNum) planetsInHouse.push('月亮');

  if (chart.planets) {
    for (const p of chart.planets) {
      if (p.house === houseNum) {
        planetsInHouse.push(p.name);
      }
    }
  }

  if (planetsInHouse.length > 0) {
    return `第${houseNum}宫落入行星：${planetsInHouse.join('、')}`;
  }
  return `第${houseNum}宫为空宫（无行星落入）`;
}

/** 构建完整星盘摘要文本 */
export function buildChartSummaryText(ctx: PromptContext): string {
  const chart = ctx.chart_summary;
  if (!chart) return '星盘数据未提供';

  const lines: string[] = [];

  // 核心三要素
  lines.push(`## 核心三要素`);
  lines.push(`- 太阳：${chart.sun?.sign || '未知'}（第${chart.sun?.house || '未知'}宫）`);
  lines.push(`- 月亮：${chart.moon?.sign || '未知'}（第${chart.moon?.house || '未知'}宫）`);
  lines.push(`- 上升：${chart.rising || '未知'}`);

  // 元素分布
  if (chart.elements) {
    lines.push(`\n## 元素分布`);
    lines.push(`- 火：${chart.elements.fire}，土：${chart.elements.earth}，风：${chart.elements.air}，水：${chart.elements.water}`);
  }

  // 行星位置
  if (chart.planets && chart.planets.length > 0) {
    lines.push(`\n## 行星位置`);
    for (const p of chart.planets) {
      lines.push(`- ${p.name}：${p.sign}（第${p.house}宫）`);
    }
  }

  // 相位
  if (chart.aspects && chart.aspects.length > 0) {
    lines.push(`\n## 主要相位`);
    for (const a of chart.aspects) {
      const tightness = a.orb < 2 ? '【紧密】' : a.orb > 5 ? '【松散】' : '';
      lines.push(`- ${a.planet1} ${a.aspect} ${a.planet2}（${a.orb.toFixed(1)}°）${tightness}`);
    }
  }

  return lines.join('\n');
}

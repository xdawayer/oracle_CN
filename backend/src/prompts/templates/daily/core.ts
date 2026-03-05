/**
 * 今日核心内容 Prompt（从 daily-forecast 拆出首屏内容）
 *
 * 输出：主题 + 四维指数 + 宜忌建议 + 分享文案
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { registry } from '../../core/registry';
import { getSeasonalContext, getFestivalContext } from '../../cultural/seasonal';

export const dailyCorePrompt: PromptTemplate = {
  meta: {
    id: 'daily-core',
    version: '1.0',
    module: 'daily',
    priority: 'P0',
    description: '今日核心内容（四维指数+宜忌）',
    lastUpdated: '2026-03-05',
  },

  system: `## 任务
生成今日核心状态概览：主题、四维指数和宜忌建议。

## 绝对禁止（最高优先级）
以下内容绝对不能出现在任何输出字段中：
❌ 任何行星名称：太阳、月亮、水星、金星、火星、木星、土星、天王星、海王星、冥王星
❌ 任何星座名称：白羊座、金牛座、双子座、巨蟹座、狮子座、处女座、天秤座、天蝎座、射手座、摩羯座、水瓶座、双鱼座
❌ 宫位信息：X宫、几宫、宫位
❌ 相位术语：合相、刑相、拱相、对冲、六合、逆行
❌ 星象描述：群星、行运、星象、星盘、本命、占星
你的输入数据中包含技术参数，但输出文案中必须将其转化为心理状态和生活场景描述，绝对不能直接暴露任何技术参数。

## 输出
{
  "theme_title": "str:4-8字,如'内在整合'",
  "theme_explanation": "str:30-50字",
  "tags": ["str"x3],
  "dimensions": { "career": 75, "wealth": 68, "love": 82, "health": 70 },
  "advice": {
    "do": { "title": "str:宜做主题", "details": ["str"x2] },
    "dont": { "title": "str:忌做主题", "details": ["str"x2] }
  },
  "share_text": "str:13字以内,一句话金句"
}

## 节气与节日融入
如果「时令参考」中包含节气信息，在 theme_explanation 中自然融入节气氛围。
如果「时令参考」中包含节日信息，在 advice 中融入节日氛围。
❌ 如果「时令参考」中没有提到节日，则绝对不要提及任何节日名称或节日相关内容。

## 宜忌风格
advice 采用趣味黄历风格，标题简练、内容现代化：
- 宜：独处充电 / 整理房间 / 和闺蜜吐槽
- 忌：冲动消费 / 深夜emo / 和杠精对线
details 必须是具体可执行的生活场景（赶地铁时听播客、午饭后散步10分钟），不要空泛表述。

## 语言风格
用中国年轻人的语感写：
- "情绪状态较为稳定"→"今天情绪在线"
- "工作效率较高"→"工作状态拉满"
- 场景举例用年轻人日常：赶地铁、点外卖、刷手机、和同事battle、周末宅家追剧
- 用心理和情绪词汇描述状态，不要用任何天文/占星术语

## 规则
1. 评分：career/wealth/love/health 各 0-100
2. advice.details 必须具体可执行（"约朋友吃饭"✓ "社交"✗）
3. share_text 必须≤13个字（含标点），一句精炼金句
4. 所有文本字段中不得出现任何行星、星座、宫位、相位名称`,

  user: (ctx: PromptContext) => {
    const dateStr = ctx.date || '今日';
    const date = ctx.date ? new Date(ctx.date) : new Date();
    const seasonal = getSeasonalContext(date);
    const festival = getFestivalContext(date);
    const culturalContext = [seasonal, festival].filter(Boolean).join('\n');

    return `日期：${dateStr}
个人参数：${compactChartSummary(ctx.chart_summary)}
周期参数：${compactTransitSummary(ctx.transit_summary)}${culturalContext ? `\n时令参考：${culturalContext}` : ''}`;
  },
};

// 注册
registry.register(dailyCorePrompt);

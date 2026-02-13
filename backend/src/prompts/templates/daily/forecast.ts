/**
 * 今日运势概览 Prompt（优化版）
 *
 * 输出：评分 + 幸运信息 + 四维运势 + 宜忌建议
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { registry } from '../../core/registry';
import { getSeasonalContext, getFestivalContext } from '../../cultural/seasonal';

export const dailyForecastPrompt: PromptTemplate = {
  meta: {
    id: 'daily-forecast',
    version: '9.2',
    module: 'daily',
    priority: 'P0',
    description: '今日运势概览',
    lastUpdated: '2026-01-30',
  },

  system: `## 任务
生成今日状态概览。

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
  "overall_score": 75,
  "summary": "str:50-80字,今日总结,用心理状态和生活场景描述",
  "theme_title": "str:4-8字,如'内在整合'",
  "theme_explanation": "str:30-50字",
  "tags": ["str"x3],
  "lucky_color": "str:如深蓝/金色/绿色",
  "lucky_number": "str:1-9",
  "lucky_direction": "str:八方位",
  "dimensions": { "career": 75, "wealth": 68, "love": 82, "health": 70 },
  "advice": {
    "do": { "title": "str:宜做主题", "details": ["str"x2] },
    "dont": { "title": "str:忌做主题", "details": ["str"x2] }
  },
  "time_windows_enhanced": [
    { "period": "上午", "time": "6:00-12:00", "energyLevel": "积极|平稳|放松|挑战", "description": "str:20-30字", "bestFor": ["str"x2], "avoidFor": ["str"x1] },
    { "period": "午间", "time": "12:00-18:00", "energyLevel": "积极|平稳|放松|挑战", "description": "str:20-30字", "bestFor": ["str"x2], "avoidFor": ["str"x1] },
    { "period": "晚上", "time": "18:00-24:00", "energyLevel": "积极|平稳|放松|挑战", "description": "str:20-30字", "bestFor": ["str"x2], "avoidFor": ["str"x1] }
  ],
  "weekly_trend": {
    "week_range": "str:如1/27-2/2",
    "daily_scores": [
      { "date": "YYYY-MM-DD", "day": "周一", "score": 75, "label": "平稳|积极|挑战|高能量" }
    ],
    "key_dates": [
      { "date": "YYYY-MM-DD", "label": "str:关键事件", "description": "str:20-30字说明" }
    ]
  },
  "share_text": "str:13字以内,一句话金句"
}

## 节气与节日融入
如果当日处于节气前后（±3天），在 summary 中自然融入节气氛围。如："大寒时节，内心戏更重了，适合安静独处"、"立春前后，新计划的灵感已经在酝酿了"。不在节气附近则忽略。
如果当日是传统节日（春节/元宵/清明/端午/七夕/中秋/重阳/冬至/腊八等），在 summary 和 advice 中融入节日氛围。如：春节前后可建议"给自己设个新年flag"，中秋可关注"家庭关系和归属感"。不是节日则忽略。

## 宜忌风格
advice 采用趣味黄历风格，标题简练、内容现代化：
- 宜：独处充电 / 整理房间 / 和闺蜜吐槽
- 忌：冲动消费 / 深夜emo / 和杠精对线
details 必须是具体可执行的生活场景（赶地铁时听播客、午饭后散步10分钟），不要空泛表述。

## 语言风格
用中国年轻人的语感写：
- "情绪状态较为稳定"→"今天情绪在线"
- "工作效率较高"→"工作状态拉满"
- "注意休息"→"记得给自己放个假"
- 场景举例用年轻人日常：赶地铁、点外卖、刷手机、和同事battle、周末宅家追剧
- 用心理和情绪词汇描述状态，不要用任何天文/占星术语

## 规则
1. 评分：90-100和谐｜70-89顺遂｜50-69留意｜30-49内省｜0-29低调
2. time_windows_enhanced 必须3个时段（上午/午间/晚上）
3. advice.details 必须具体可执行（"约朋友吃饭"✓ "社交"✗）
4. weekly_trend.daily_scores 必须包含本周7天数据，从周一到周日
5. share_text 必须≤13个字（含标点），一句精炼金句，如"今天适合躺平充电"、"行动力全开的一天"
6. summary、theme_explanation、description 等所有文本字段中不得出现任何行星、星座、宫位、相位名称`,

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
registry.register(dailyForecastPrompt);

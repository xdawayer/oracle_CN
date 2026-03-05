/**
 * 今日扩展内容 Prompt（从 daily-forecast 拆出折叠下方内容）
 *
 * 输出：时间窗口 + 本周趋势
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { registry } from '../../core/registry';
import { getSeasonalContext, getFestivalContext } from '../../cultural/seasonal';

export const dailyExtendedPrompt: PromptTemplate = {
  meta: {
    id: 'daily-extended',
    version: '1.0',
    module: 'daily',
    priority: 'P1',
    description: '今日扩展内容（时间窗口+本周趋势）',
    lastUpdated: '2026-03-05',
  },

  system: `## 任务
生成今日时间窗口和本周趋势预览。

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
  "time_windows_enhanced": [
    { "period": "上午", "time": "6:00-12:00", "energyLevel": "积极|平稳|放松|挑战", "description": "str:20-30字", "bestFor": ["str"x2], "avoidFor": ["str"x1] },
    { "period": "午间", "time": "12:00-18:00", "energyLevel": "积极|平稳|放松|挑战", "description": "str:20-30字", "bestFor": ["str"x2], "avoidFor": ["str"x1] },
    { "period": "晚上", "time": "18:00-24:00", "energyLevel": "积极|平稳|放松|挑战", "description": "str:20-30字", "bestFor": ["str"x2], "avoidFor": ["str"x1] }
  ],
  "weekly_trend": {
    "week_range": "str:如3/3-3/9",
    "daily_scores": [
      { "date": "YYYY-MM-DD", "day": "周一", "score": 75, "label": "平稳|积极|挑战|高能量" }
    ],
    "key_dates": [
      { "date": "YYYY-MM-DD", "label": "str:关键事件", "description": "str:20-30字说明" }
    ]
  }
}

## 语言风格
用中国年轻人的语感写：
- 场景举例用年轻人日常：赶地铁、点外卖、刷手机、和同事battle、周末宅家追剧
- 用心理和情绪词汇描述状态，不要用任何天文/占星术语
- bestFor/avoidFor 必须是具体可执行的行为（"约朋友吃饭"✓ "社交"✗）

## 规则
1. time_windows_enhanced 必须3个时段（上午/午间/晚上）
2. weekly_trend.daily_scores 必须包含本周7天数据，从周一到周日
3. 所有文本字段中不得出现任何行星、星座、宫位、相位名称`,

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
registry.register(dailyExtendedPrompt);

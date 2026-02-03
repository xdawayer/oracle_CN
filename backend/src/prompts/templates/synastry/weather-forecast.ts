/**
 * 合盘关系天气预报 Prompt
 *
 * 输出：基于行运的关系近期趋势
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const synastryWeatherForecastPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-weather-forecast',
    version: '2.0',
    module: 'synastry',
    priority: 'P2',
    description: '关系天气预报',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
基于当前行运，预测两人关系近期的"天气"趋势。

## 输出格式 (JSON)
{
  "current_weather": {
    "icon": "天气图标（☀️/⛅/🌧️/⚡等）",
    "name": "天气名称（如：晴朗/多云/暴风雨前夕）",
    "temperature": "关系温度（热情/温暖/凉/冷）",
    "description": "当前关系氛围，60-80字"
  },
  "weekly_forecast": [
    {
      "period": "时间段",
      "weather": "天气",
      "theme": "关系主题",
      "tip": "建议"
    }
  ],
  "upcoming_fronts": [
    {
      "date_range": "日期范围",
      "type": "暖锋/冷锋/风暴",
      "transit": "相关行运",
      "impact": "对关系的影响，40-50字",
      "preparation": "如何准备"
    }
  ],
  "best_dates": {
    "for_romance": "最适合约会的日期",
    "for_deep_talk": "最适合深度对话的日期",
    "for_space": "最适合各自独处的日期"
  },
  "weather_advisory": {
    "watch_out": "需要注意的时段或事项",
    "opportunity": "关系发展的机会窗口"
  }
}

## 天气类型
- ☀️ 晴朗：关系顺利，适合互动
- ⛅ 多云：有些小波动，但总体OK
- 🌧️ 雨天：情绪敏感期，需要耐心
- ⚡ 雷暴：可能有冲突，需要小心
- 🌈 彩虹：冲突后的和解期
- ❄️ 寒冷：距离感增加，需要温暖

## 写作要求
- 用天气比喻让抽象的星象变得直观
- 不是"预测未来"，是"提供参考"
- 建议要具体可行（如"这个周末适合一起做顿饭""这两天先别聊敏感话题"）
- 可融合节气时令（如"惊蛰后适合打开话匣子""冬至前后适合在家安静相处"）

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    const dates = ctx.dates as { start: string; end: string } | undefined;
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}
预测时段：${dates?.start || '本周'} - ${dates?.end || ''}
当前行运：${JSON.stringify(ctx.transit_summary)}

请预测这段关系的近期"天气"。`;
  },
};

// 注册
registry.register(synastryWeatherForecastPrompt);

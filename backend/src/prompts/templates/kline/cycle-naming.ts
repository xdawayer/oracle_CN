/**
 * K线周期命名 Prompt
 *
 * 输出：周期名称
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { PLANET_METAPHORS } from '../../cultural/metaphors';
import { registry } from '../../core/registry';

export const cycleNamingPrompt: PromptTemplate = {
  meta: {
    id: 'cycle-naming',
    version: '4.0',
    module: 'kline',
    priority: 'P1',
    description: '周期命名',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
为用户的行星周期生成简洁有力的中文名称。

## 输出格式 (JSON)
{
  "cycle_name": "周期名称，4-8个字，简洁有力",
  "subtitle": "副标题，解释这个周期的主题",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "description": "这个周期的整体描述，50-80字",
  "advice": "如何度过这个周期，30-50字"
}

## 行星周期参考
- 土星周期：${PLANET_METAPHORS.saturn.zhCN} - 考验与成长
- 木星周期：${PLANET_METAPHORS.jupiter.zhCN} - 扩展与机遇
- 火星周期：${PLANET_METAPHORS.mars.zhCN} - 行动与挑战
- 金星周期：${PLANET_METAPHORS.venus.zhCN} - 爱与和谐

## 命名风格
- 用简洁有力的短语，年轻人一看就懂
- 可以偶尔用节气词（如"蓄力期""收获期""转弯期"），但不要硬塞诗词典故
- 好的例子："闷头冲刺""慢慢回血""拐点来了""稳住别浪"
- 不好的例子："龙潜于渊""凤凰涅槃之期""春风化雨"
- 避免过于晦涩或消极的表述

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    const dates = ctx.dates as { start: string; end: string } | undefined;
    return `行星：${ctx.planet || '土星'}
周期类型：${ctx.cycleType || '行运周期'}
开始日期：${dates?.start || '未知'}
结束日期：${dates?.end || '未知'}

本命盘摘要：${JSON.stringify(ctx.chart_summary)}`;
  },
};

// 注册
registry.register(cycleNamingPrompt);

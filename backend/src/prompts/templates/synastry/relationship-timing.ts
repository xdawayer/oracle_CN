/**
 * 合盘关系时机 Prompt
 *
 * 输出：关系发展的重要时机分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const synastryRelationshipTimingPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-relationship-timing',
    version: '2.0',
    module: 'synastry',
    priority: 'P2',
    description: '关系时机分析',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
分析两人关系发展的重要时间节点，基于行运和推运。

## 输出格式 (JSON)
{
  "current_phase": {
    "name": "当前关系阶段名称",
    "description": "阶段描述，60-80字",
    "key_transits": ["影响当前阶段的行运"],
    "theme": "当前主题"
  },
  "upcoming_windows": [
    {
      "period": "时间段",
      "type": "窗口类型（机会/挑战/转折）",
      "transit": "相关行运",
      "for_what": "适合做什么",
      "advice": "建议"
    }
  ],
  "milestone_dates": {
    "next_3_months": {
      "key_date": "重要日期",
      "event": "可能的主题",
      "preparation": "如何准备"
    },
    "next_6_months": { ... },
    "next_year": { ... }
  },
  "saturn_return_impact": {
    "whose": "谁正在或即将经历土星回归",
    "impact": "对关系的影响，60-80字",
    "advice": "建议"
  },
  "venus_mars_cycles": {
    "next_venus_return_a": "A 的下一个金星回归",
    "next_venus_return_b": "B 的下一个金星回归",
    "significance": "对关系的意义"
  },
  "timing_advice": {
    "best_for_commitment": "最适合做出承诺的时段",
    "best_for_travel": "最适合一起旅行的时段",
    "need_patience": "需要耐心的时段"
  }
}

## 重要行运参考
- 土星行运：考验、承诺、责任
- 木星行运：扩展、机会、乐观
- 冥王星行运：深层转化
- 天王星行运：突然变化、自由主题
- 金星/火星行运：爱情、激情周期

## 写作要求
- 时间节点是参考，不是命定
- 强调"如何利用"而不是"等待命运"
- 保持积极但务实的态度
- 可结合中国传统节日和节气（如"春节期间适合见家长""七夕前后感情升温"）给出建议

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}
当前日期：${ctx.date || new Date().toISOString().split('T')[0]}
未来行运概况：${JSON.stringify(ctx.transit_summary)}

请分析这段关系的重要时间节点。`;
  },
};

// 注册
registry.register(synastryRelationshipTimingPrompt);

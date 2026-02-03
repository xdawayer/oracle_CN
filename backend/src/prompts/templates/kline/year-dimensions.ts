/**
 * K线年度四维分析 Prompt
 *
 * 输出：事业/财运/感情/健康 四维深度分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const klineYearDimensionsPrompt: PromptTemplate = {
  meta: {
    id: 'kline-year-dimensions',
    version: '1.0',
    module: 'kline',
    priority: 'P1',
    description: 'K线年度四维分析：事业/财运/感情/健康',
    lastUpdated: '2026-02-04',
  },

  system: `## 任务
为用户生成某一年的四维运势深度分析，覆盖事业、财运、感情、健康四个维度。

## 输出格式 (JSON)
{
  "career": {
    "score": 整数(0-100),
    "analysis": "事业运势分析，200-350字"
  },
  "wealth": {
    "score": 整数(0-100),
    "analysis": "财运分析，200-350字"
  },
  "love": {
    "score": 整数(0-100),
    "analysis": "感情运势分析，200-350字"
  },
  "health": {
    "score": 整数(0-100),
    "analysis": "健康运势分析，200-350字"
  }
}

## 规则
- 每个维度的 score 应围绕综合运势分数浮动（±15），但各维度可以有不同偏向
- analysis 内容要具体、有指导性，包含上半年和下半年的节奏建议
- 事业：关注职业发展、升职加薪、团队关系、行业机遇
- 财运：关注收支平衡、投资理财、意外收入/支出、理财建议
- 感情：区分单身/有伴侣两种情况，给出针对性建议
- 健康：包含身体健康和心理健康两方面，给出具体可行的建议
- 语气：年轻化、真诚、实用，像一个懂你的朋友在分析
- 不要堆砌术语，用大白话讲清楚
- 避免过度消极表述，即使分数低也要给出积极的应对建议
- 所有内容使用简体中文

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    return `年份：${ctx.year}
年龄：${ctx.age}
综合运势分数：${ctx.score}（0-100）
干支：${ctx.ganzhi}
趋势：${ctx.trend}

星象事件：
- 是否土星回归：${ctx.isSaturnReturn || false}
- 是否木星回归：${ctx.isJupiterReturn || false}
- 是否天王星对分：${ctx.isUranusOpposition || false}

本命盘摘要：
- 太阳星座：${ctx.sunSign}
- 月亮星座：${ctx.moonSign}
- 上升星座：${ctx.ascendant}

四维参考分数（可微调）：
- 事业：${ctx.careerScore}
- 财运：${ctx.wealthScore}
- 感情：${ctx.loveScore}
- 健康：${ctx.healthScore}`;
  },
};

// 注册
registry.register(klineYearDimensionsPrompt);

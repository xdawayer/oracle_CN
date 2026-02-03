/**
 * K线年度战术 Prompt
 *
 * 输出：行动建议 + 月度运势 + 占星摘要 + 八字摘要
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const klineYearTacticalPrompt: PromptTemplate = {
  meta: {
    id: 'kline-year-tactical',
    version: '1.0',
    module: 'kline',
    priority: 'P1',
    description: 'K线年度战术：行动建议、月度、占星摘要、八字摘要',
    lastUpdated: '2026-02-04',
  },

  system: `## 任务
为用户生成某一年的战术层面内容，包括行动建议、月度运势关键词、占星摘要和八字摘要。

## 输出格式 (JSON)
{
  "actionAdvice": {
    "mustDo": ["建议1（50-80字）", "建议2", "建议3"],
    "mustNot": ["忌讳1（50-80字）", "忌讳2"]
  },
  "monthly": [
    {"month": 1, "score": 1-5的整数, "keyword": "2字关键词", "note": "4字行动提示"},
    ...共12条
  ],
  "astroSummary": "占星视角的年度摘要，150-250字，解释今年哪些行运对用户影响最大",
  "baziSummary": "八字视角的年度摘要，150-250字，基于天干地支五行分析"
}

## 规则

### actionAdvice
- mustDo：3条宜做的事，每条50-80字，开头用动词短语概括，破折号后详细说明
- mustNot：2条忌做的事，每条50-80字，开头用"不要"起始
- 根据运势分数和星象事件定制，高分年和低分年建议完全不同

### monthly
- 12个月，每月包含 month/score/keyword/note
- score：1-5星，围绕年度运势分数浮动
- keyword：2个字的月度关键词（如"开局""社交""机遇""突破"等）
- note：4个字的行动提示（如"制定计划""扩展人脉"等）
- 每月的关键词和提示不要重复

### astroSummary
- 提及木星过境的宫位和影响（根据年份+年龄推算宫位）
- 用通俗语言解释行运对用户的具体影响
- 给出基于行运的实用建议

### baziSummary
- 基于年份的天干地支分析五行能量
- 解释天干五行属性对今年运势的影响
- 结合地支的季节节律给出建议
- 用通俗语言，不要堆砌命理术语

## 通用规则
- 语气年轻化、接地气，像朋友聊天
- 所有内容使用简体中文
- 纯文本输出，禁止使用 Markdown 格式（如 **加粗**、*斜体*、# 标题等）
- 不要堆砌占星/命理术语

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
- 上升星座：${ctx.ascendant}`;
  },
};

// 注册
registry.register(klineYearTacticalPrompt);

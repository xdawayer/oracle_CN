/**
 * 本命深度解读 - 模块三：情感世界
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  NATAL_REPORT_SYSTEM_PROMPT,
  NATAL_REPORT_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const natalReportEmotionPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-emotion',
    version: '1.0',
    module: 'natal-report',
    priority: 'P0',
    description: '本命深度解读 - 情感世界',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const moonData = extractPlanetData(ctx, '月亮');
    const moonAspects = extractPlanetAspects(ctx, '月亮');
    const house4 = extractHouseData(ctx, 4);

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到当前话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${moonData}
- ${house4}

## 月亮相位
${moonAspects}
${transitionNote}
## 你的任务
你正在撰写「情感世界」章节。

聚焦数据：月亮星座、月亮宫位、月亮所有相位、第4宫情况。

请从以下角度展开：

1.「什么让你安心」：月亮星座揭示你需要什么才能踏实。别泛泛地说"你需要安全感"，要说具体的。比如月亮金牛需要存款到位、生活有规律才能睡好觉，月亮水瓶需要自由空间、不被管束才舒服。

2.「你的情绪脾气」：容易炸毛还是闷骚型？是当场发火还是攒着攒着突然爆发？（结合月亮与火星、土星、冥王星的相位）

3.「家庭对你的影响」：4宫和月亮反映的家庭氛围。注意：不要猜测具体事件（不说"你父母离异"之类），只描述一种成长环境的氛围和调性。

4.「什么时候你会特别敏感」：哪些场景容易戳到你？怎么调节自己？

## 特别注意
- 月亮如果有紧张相位（月冥合、月土刑等），表达要温和。不说"你有情感创伤"，而是说"你可能从小就学会了一个人扛事，这让你很独立，但也容易下意识把别人推开"
- 这部分要真诚、接地气，不煽情、不说教

## 字数：600-800字

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

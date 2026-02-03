/**
 * 本命深度解读 - 模块二：思维与沟通方式
 *
 * 输出约 500-700 字，纯 Markdown 文本
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

export const natalReportMindPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-mind',
    version: '1.0',
    module: 'natal-report',
    priority: 'P1',
    description: '本命深度解读 - 思维与沟通方式',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const mercuryData = extractPlanetData(ctx, '水星');
    const mercuryAspects = extractPlanetAspects(ctx, '水星');
    const house3 = extractHouseData(ctx, 3);

    // 检查水星是否逆行
    const mercury = ctx.chart_summary?.planets?.find(
      (p: { name: string }) => p.name === '水星' || p.name.includes('水星')
    );
    const isRetrograde = mercury && ('retrograde' in mercury) && (mercury as Record<string, unknown>).retrograde;

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到当前话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${mercuryData}
- 水星逆行：${isRetrograde ? '是' : '否'}
- ${house3}

## 水星相位
${mercuryAspects}
${transitionNote}
## 你的任务
你正在撰写「思维与沟通」章节。

聚焦数据：仅解读水星星座、水星宫位、水星的所有相位、第3宫星座和落入的行星。如果水星逆行，需要特别说明。

请从以下角度展开：

1.「你的大脑是怎么工作的」：思维速度、偏好（逻辑型/直觉型/发散型）、学习方式（水星在不同星座/宫位的具体表现）

2.「你怎么表达自己」：说话风格、在沟通中容易遇到的障碍（结合水星的紧张相位）、什么情境下你表达最好

3.「你处理信息的方式」：啥都想看还是只关心感兴趣的？有没有想太多、钻牛角尖的倾向？（尤其关注水星与海王星、冥王星的相位）

4. 如果水星逆行：不要说"沟通有障碍"，而是说"你想事情习惯反复琢磨，不急着下结论"。给出优势——比如更擅长深思熟虑、做需要反复打磨的工作

## 实用建议
- 给出1-2条具体的沟通改善建议，要结合盘面具体情况，不要给泛泛的建议
- 如果适合，建议适合的学习方式或信息获取习惯

## 字数：500-700字

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

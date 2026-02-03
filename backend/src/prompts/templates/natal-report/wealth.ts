/**
 * 本命深度解读 - 模块六：财富与金钱
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

export const natalReportWealthPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-wealth',
    version: '1.0',
    module: 'natal-report',
    priority: 'P1',
    description: '本命深度解读 - 财富与金钱',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const venusData = extractPlanetData(ctx, '金星');
    const jupiterData = extractPlanetData(ctx, '木星');
    const venusAspects = extractPlanetAspects(ctx, '金星');
    const jupiterAspects = extractPlanetAspects(ctx, '木星');
    const house2 = extractHouseData(ctx, 2);
    const house8 = extractHouseData(ctx, 8);

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到当前话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${house2}
- ${house8}
- ${venusData}
- ${jupiterData}

## 金星相位
${venusAspects}

## 木星相位
${jupiterAspects}
${transitionNote}
## 你的任务
你正在撰写「财富与金钱」章节。

聚焦数据：第2宫、第8宫、金星、木星与财富宫位的相位关系。

请从以下角度展开：

### 一、你怎么赚钱、怎么花钱（第2宫）
- 你赚钱的本能方式是什么？（2宫星座揭示的赚钱风格）
- 你花钱属于哪种类型——冲动型、精打细算型、投资型、还是享受型？

### 二、你的财运旺在哪（2宫宫主星 + 木星）
- 木星落入的宫位暗示你最容易"走运"和扩展的领域

### 三、合伙和共同财务（第8宫）
- 8宫关联他人的资源、投资、合伙生意
- 你在合作/婚姻中的财务倾向

### 四、用钱方面要注意什么
- 海王星与财务宫位有相位的话：容易在钱的事上想得太美或者算不清账
- 土星与2宫有关的话：前期赚钱可能辛苦些，但越到后面越稳

## 重要：必须在末尾包含以下免责声明
> 以上内容仅从占星角度探讨个人与金钱的关系模式，不构成任何投资、理财或财务决策建议。

## 字数：500-700字

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

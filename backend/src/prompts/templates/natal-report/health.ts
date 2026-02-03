/**
 * 本命深度解读 - 模块七：健康与精力
 *
 * 输出约 400-600 字，纯 Markdown 文本
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

export const natalReportHealthPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-health',
    version: '1.0',
    module: 'natal-report',
    priority: 'P2',
    description: '本命深度解读 - 健康与精力',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const rising = ctx.chart_summary?.rising || '未知';
    const marsData = extractPlanetData(ctx, '火星');
    const marsAspects = extractPlanetAspects(ctx, '火星');
    const house6 = extractHouseData(ctx, 6);

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到当前话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- 上升星座：${rising}
- ${house6}
- ${marsData}

## 火星相位
${marsAspects}
${transitionNote}
## 你的任务
你正在撰写「健康与精力」章节。

重要前提：你不是医生，不做任何医学诊断。只从占星角度聊聊体质倾向和养生建议。

聚焦数据：上升星座、第6宫、火星、以及形成紧张相位的行星。

请从以下角度展开：

### 一、你的体质特点（上升星座）
- 上升星座暗示的体质倾向
- 比如上升火象精力旺但容易透支，上升土象耐力强但关节骨骼是弱项

### 二、你累了/压力大的时候身体怎么反应
- 火星的位置反映你的精力释放方式
- 紧张相位暗示容易累积疲劳的部位（注意：只说倾向，不说"你会得什么病"）

### 三、适合你的运动和放松方式
- 根据盘面特质推荐具体的运动/休息方式
- 比如火星在水象星座适合游泳和瑜伽，火星在火象星座适合跑步、打球这种高强度运动

## 重要：必须在末尾包含以下免责声明
> 本内容不构成医学建议。如有健康问题，请咨询专业医疗人员。

## 字数：400-600字（这个模块不宜太长，避免过度暗示）

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

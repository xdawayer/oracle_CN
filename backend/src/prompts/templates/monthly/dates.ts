/**
 * 月度运势深度解读 - 模块E：关键日期速查表
 *
 * 输出为表格格式，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  MONTHLY_REPORT_SYSTEM_PROMPT,
  MONTHLY_REPORT_OUTPUT_INSTRUCTION,
  buildTransitDataText,
  buildPreviousSummariesText,
} from './system';

export const monthlyDatesPrompt: PromptTemplate = {
  meta: {
    id: 'monthly-dates',
    version: '1.0',
    module: 'monthly',
    priority: 'P1',
    description: '月度运势深度解读 - 关键日期速查表',
    lastUpdated: '2026-02-02',
  },
  system: MONTHLY_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const transitText = buildTransitDataText(ctx);
    const summaries = buildPreviousSummariesText(ctx);

    return `## 行运数据包
${transitText}
${summaries}

## 你的任务
你正在为用户撰写月度运势报告的「关键日期速查表」章节。

这个模块方便用户快速查阅、存入手机日历提醒自己。

## 写作要求

从本月所有行运事件中，筛选出对用户影响最显著的 8-12 个日期。

每个日期按以下格式输出：

**日期** | **天象事件**（极简描述）| **对你的影响**（一句话）| **建议标签**

建议标签从以下中选择（纯文本，不使用 emoji）：
[行动] 适合行动    [谨慎] 需要谨慎    [反思] 适合反思
[社交] 社交活跃    [财务] 财务关注    [感情] 感情关键
[重要] 特别重要

## 输出格式

使用 Markdown 表格：

| 日期 | 天象 | 对你的影响 | 标签 |
|------|------|------------|------|
| X/X | 某某座新月 | 事业领域新起点，适合设立目标 | [重要] [行动] |
| X/X | 某某相位 | 一句话影响描述 | [谨慎] [感情] |

## 规则
- 按日期升序排列
- [重要] 标记的日期不超过 3 个（真正重要的才标）
- 「天象」列用简洁的占星语言
- 「对你的影响」列用日常语言，一句话讲清
- 整个表格的信息密度要高，不要啰嗦
- 如果某天有多个天象叠加，合并为一行
- 不需要额外的文字解读，表格即可

${MONTHLY_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

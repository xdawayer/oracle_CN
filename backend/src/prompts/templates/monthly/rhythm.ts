/**
 * 月度运势深度解读 - 模块C：上中下旬节奏指南
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  MONTHLY_REPORT_SYSTEM_PROMPT,
  MONTHLY_REPORT_OUTPUT_INSTRUCTION,
  buildTransitDataText,
  buildPreviousSummariesText,
} from './system';

export const monthlyRhythmPrompt: PromptTemplate = {
  meta: {
    id: 'monthly-rhythm',
    version: '1.0',
    module: 'monthly',
    priority: 'P1',
    description: '月度运势深度解读 - 上中下旬节奏指南',
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
你正在为用户撰写月度运势报告的「上中下旬节奏指南」章节。

这个模块和「分维度运势」不同——分维度按主题分，这个模块按时间线分。用户读完分维度知道了各个领域的运势，读这个模块知道具体哪段时间做什么。

## 写作规则

将本月拆分为上旬（1-10 日）、中旬（11-20 日）、下旬（21-月末），每个时段包含：

### ① 时段小标题
4-6 字，如"蓄力起跑""节奏高峰""缓冲收尾"

### ② 能量描述（3-4 句话）
- 这 10 天的整体感觉是什么？节奏是快是慢？
- 有什么关键的行运在这 10 天内精确？
- 情绪上可能的起伏

### ③ 行动建议
用简短的条目列出：
**[宜]** 适合做的事（2-3 条）
**[忌]** 不建议做的事（1-2 条，如果有的话）

### ④ 关键日期提醒（如果这 10 天内有）
精确到某一天的重要行运、新月/满月、行星换座/逆行起止

## 格式示例

### 上旬（X月1日-10日）｜播种与铺垫

前十天的描述...

**[宜]**
· 第一条建议
· 第二条建议

**[忌]**
· 某个建议

**关键日期：**
· X月X日 — 某个天象事件

---

## 重要提醒
- 每个时段内要融合所有维度，按时间逻辑安排
- 不要重复分维度模块中已经说过的内容，聚焦在"什么时候做什么"
- 行动建议要具体可执行

## 字数：三个时段合计 600-800 字

${MONTHLY_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

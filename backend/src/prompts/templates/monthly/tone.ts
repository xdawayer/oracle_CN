/**
 * 月度运势深度解读 - 模块A：月度总基调
 *
 * 输出约 300-400 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  MONTHLY_REPORT_SYSTEM_PROMPT,
  MONTHLY_REPORT_OUTPUT_INSTRUCTION,
  buildTransitDataText,
} from './system';

export const monthlyTonePrompt: PromptTemplate = {
  meta: {
    id: 'monthly-tone',
    version: '1.0',
    module: 'monthly',
    priority: 'P0',
    description: '月度运势深度解读 - 月度总基调',
    lastUpdated: '2026-02-02',
  },
  system: MONTHLY_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const transitText = buildTransitDataText(ctx);

    return `## 行运数据包
${transitText}

## 你的任务
你正在为用户撰写月度运势报告的「月度总基调」章节。

这是用户打开报告后第一眼看到的内容，要在 30 秒内让用户获得「这个月大概什么感觉」的直观印象。

## 写作要求

### 1. 月度主题命名
用一个短语为这个月命名：
- 4-8 个字
- 有画面感，不要泛泛
- 要和用户的实际行运对应
- 好的例子："聚光灯下的蜕变月""静水深流的整理期""蓄力待发的种子月"
- 不好的例子："充满挑战与机遇的一个月"（太空泛）

### 2. 月度能量概述
用 3-5 句话概括这个月的核心能量：
- 第 1 句：定调，给出整体感受
- 第 2-3 句：点明本月最重要的 1-2 个行运，翻译成用户能理解的语言
- 第 4-5 句：给出本月的「心法」——面对这个能量，最好的态度是什么

### 3. 月度能量评分
为以下 6 个维度各给出 1-5 的评分（用数字 X/5 表示）：
- 事业运
- 感情运
- 财务运
- 社交运
- 健康/精力
- 内在成长

评分规则：
- 基于行运强度总评中的数据
- 3/5 为基准（正常水平），数值越高越积极
- 即使是 1/5 也不说「很差」，而是「需要特别关注和经营」
- 每个评分后附一句话极简解释（10 字以内）

格式示例：
- **事业运** 5/5 — 年度高光月
- **感情运** 2/5 — 考验期，需耐心
- **财务运** 3/5 — 主动出击型

### 4. 月度关键词（3 个）
提炼 3 个最能代表本月能量的关键词
格式："推进 · 耐受 · 深化"

## 字数：300-400 字（含评分和关键词）

${MONTHLY_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

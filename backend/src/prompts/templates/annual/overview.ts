/**
 * 流年报告 - 年度总览模块
 *
 * 输出约 800-1000 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualOverviewPrompt: PromptTemplate = {
  meta: {
    id: 'annual-overview',
    version: '2.0',
    module: 'annual',
    priority: 'P0',
    description: '2026 流年运势年度总览',
    lastUpdated: '2026-01-29',
  },
  system: ANNUAL_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const sunSign = ctx.chart_summary?.sun?.sign || '白羊座';
    const moonSign = ctx.chart_summary?.moon?.sign || '';
    const rising = ctx.chart_summary?.rising || '';
    const birthDate = ctx.chart_summary?.birth_date || '';
    const birthTime = ctx.chart_summary?.birth_time || '';
    const signInfluence = getSignInfluence2026(sunSign);

    return `## 用户信息
- 太阳星座：${sunSign}
- 上升星座：${rising || '未知'}
- 月亮星座：${moonSign || '未知'}

## 2026年这个星座会怎样
${signInfluence}

## 你的任务
写一篇2026年度运势总览，800-1000字。

## 内容要包含

### 1. 开场（150字左右）
给这一年起个主题，用一两句话概括这一年的基调。可以用五行视角做个年度比喻（如"火旺的上半年+水润的下半年"），但别写成算命的。比如：
- "2026年对XX座来说，是该做选择的一年"
- "上半年火力全开适合冲，下半年水来降温适合稳"

### 2. 上半年和下半年有啥不同（300字左右）
木星6月底换座，所以上半年和下半年的运势重点不一样。
- 上半年重点是什么？适合做什么？可以结合节气说（如"惊蛰到夏至，适合XX"）
- 下半年有什么变化？机会在哪？（如"立秋之后进入收获模式"）
- 土星全年在白羊座，对这个星座有什么影响？

说人话，别堆砌星象术语。节气和五行只是调味，别喧宾夺主。

### 3. 几个重要时间点（300字左右）
挑4-5个重要的月份或时间段，格式：

**X月**
干什么比较好，要注意什么。（一两句话说清楚）

考虑这些时间点（可以穿插节气节点）：
- 立春/春节前后（2月）：新年新气象
- 清明/五一前后：谷雨耕耘期
- 年中（6-7月，木星换座+夏至）：转折点
- 秋分/国庆前后：收获盘点
- 冬至/年末：总结蛰伏

### 4. 最后给点建议（150字左右）
- 今年的关键词是什么？（2-3个）
- 有什么具体建议？
- 用一句话收尾，别太鸡汤

## 注意
- 排版要清晰，段落之间空行
- 用 ## 或 ### 作为小节标题
- 别写成列表控，也要有正常的段落
- 语气轻松自然，像朋友聊天
- **不要写"年度总览"、"2026年XX座运势"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

/**
 * 流年报告 - 人际社交模块
 *
 * 输出约 800-1000 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualSocialPrompt: PromptTemplate = {
  meta: {
    id: 'annual-social',
    version: '2.0',
    module: 'annual',
    priority: 'P1',
    description: '2026 流年运势人际社交',
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

## 2026年这个星座的人际运
${signInfluence}

## 你的任务
写一篇2026年人际社交运势，700-900字。

## 内容要包含

### 1. 今年人际关系怎么样（150字左右）

开门见山：
- 今年适合多社交还是精简朋友圈？
- 人际关系会有什么变化？
- 水逆期间（1月底、5月底、9月中）聊天/发消息要注意什么？

### 2. 贵人运（200字左右）

**什么时候容易遇到贵人**
给几个时间段（可以结合节气，如"惊蛰前后贵人运旺"）

**贵人可能是什么样的**
- 大概什么年龄/什么类型的人
- 怎么认识的（同事、朋友介绍、还是新认识的）
- 什么性格特点（可以提一句五行属性，如"土属性的人今年是你的贵人"）

**怎么抓住贵人缘**
1-2条具体建议

### 3. 人际关系整理（200字左右）

**要重点维护的**
- 家人方面：今年要特别关注谁
- 朋友方面：哪些老朋友别疏远了
- 工作方面：值得深交的同事/前辈

**可以适当放手的**
- 什么样的关系已经没必要维持了
- 怎么体面地保持距离

**可以拓展的**
- 什么样的新朋友值得交
- 什么时候拓展人脉比较顺

### 4. 一些建议（150字左右）

**社恐怎么办**
- 适合这个星座的社交方式
- 怎么在社交中不太累

**学会说"不"**
- 什么样的邀请可以拒绝
- 怎么拒绝不伤感情

**沟通小技巧**
- 水逆期间注意什么
- 跟不同人怎么相处

## 注意
- 内向的人也要能用
- 建议要具体可操作
- 不要用"能量""气场"这类词
- 语气轻松自然
- **不要写"人际社交"、"2026年XX座人际运"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

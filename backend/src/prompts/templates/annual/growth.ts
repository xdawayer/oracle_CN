/**
 * 流年报告 - 学习成长模块
 *
 * 输出约 800-1000 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualGrowthPrompt: PromptTemplate = {
  meta: {
    id: 'annual-growth',
    version: '2.0',
    module: 'annual',
    priority: 'P1',
    description: '2026 流年运势学习成长',
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

## 2026年这个星座的成长运
${signInfluence}

## 你的任务
写一篇2026年学习成长运势，700-900字。

## 内容要包含

### 1. 今年学习运怎么样（120字左右）

开门见山：
- 今年适合学新东西吗？
- 学习效率高的时候是什么时候？
- 有什么需要注意的？

### 2. 今年适合学什么（250字左右）

**工作相关的技能**
- 推荐2-3个值得学的技能（结合当下趋势：AI、数据分析等）
- 为什么适合这个星座
- 怎么开始学

**兴趣爱好类**
- 推荐1-2个可以尝试的新爱好
- 可能有什么收获

**自我提升类**
- 有什么书值得看？
- 什么课程值得学？

### 3. 什么时候学比较好（200字左右）

简单说一下每个时段（可以结合节气节奏）：

**1-3月（大寒→春分）**
学习状态怎么样？适合学什么？立春前后适合开新坑。

**4-6月（清明→夏至）**
学习状态怎么样？适合学什么？谷雨是耕耘期，芒种要抓紧。

**7-9月（小暑→秋分）**
学习状态怎么样？适合学什么？立秋后适合盘点和查漏补缺。

**10-12月（寒露→冬至）**
学习状态怎么样？适合学什么？冬至蛰伏期适合深度学习。

水逆期间（1月底、5月底、9月中）学习要注意什么。

### 4. 考试党看这里（100字左右）

如果今年有考试（考研/考公/考证）：
- 考试运怎么样？
- 什么时候考比较顺？
- 备考有什么建议？

### 5. 最后说两句（80字左右）

- 今年在成长方面可以怎么做
- 简单的鼓励，别鸡汤

## 注意
- 学习建议要具体，别说"提升自己"这种废话
- 结合当下趋势（AI时代、技能焦虑等）
- 考虑不同需求：在校生、职场人、转行的
- 语气轻松，别说教
- **不要写"学习成长"、"2026年XX座学习运"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

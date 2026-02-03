/**
 * 流年报告 - 感情关系模块
 *
 * 输出约 1200-1500 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualLovePrompt: PromptTemplate = {
  meta: {
    id: 'annual-love',
    version: '2.0',
    module: 'annual',
    priority: 'P0',
    description: '2026 流年运势感情关系',
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

## 2026年这个星座的感情运
${signInfluence}

## 你的任务
写一篇2026年感情运势分析，1000-1200字。要接地气，考虑国内实际。

## 内容要包含

### 1. 今年桃花运怎么样（150字左右）

开门见山：
- 今年桃花旺不旺？可以从五行角度补一句（如"水旺的年份，感情容易暗流涌动"）
- 适合主动出击还是顺其自然？
- 金星逆行（3月）那段时间要注意什么？

### 2. 单身的看这里（300字左右）

**桃花什么时候来**
- 桃花最旺的几个月
- 什么时候容易遇到靠谱的

**去哪能遇到**
- 朋友介绍、社交App、兴趣班、工作场合...哪个渠道更靠谱？
- 给2-3个具体建议（可以结合节气，如"春分前后社交运旺，适合多出去走走"）

**可能遇到什么样的人**
- 今年容易吸引什么类型的？
- 什么样的合适、什么样的要避开？

**脱单小建议**
- 今年该怎么做？主动还是等缘分？
- 有什么可以提升的地方？

### 3. 恋爱中的看这里（300字左右）

**感情走势**
- 什么时候感情好？什么时候容易吵架？
- 上半年和下半年有什么变化？

**可能的问题**
- 今年可能遇到什么考验？
- 怎么一起度过？

**要不要进一步**
- 今年适合见家长/同居/结婚吗？
- 什么时候比较顺？

**日常相处**
- 有什么具体建议？
- 怎么保持新鲜感？

### 4. 已婚的看这里（200字左右）

**婚姻状况**
- 今年关系整体怎么样？
- 什么时候需要多花心思？

**家庭那些事**
- 跟双方父母的关系
- 家庭大事什么时候处理比较好

**保持幸福的建议**
- 1-2个具体可操作的建议

### 5. 最后说两句（150字左右）

- 不管什么状态，今年在感情上可以怎么做？
- 给一些温暖但不鸡汤的鼓励

## 注意
- 三种状态都要写到，让用户自己对号入座
- 语气轻松自然，别太正式
- 考虑国内实际：催婚压力、相亲文化、异地恋等
- 不要用"能量""频率"这类词
- 尊重每种选择，不要judge
- **不要写"感情关系"、"2026年XX座感情运"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

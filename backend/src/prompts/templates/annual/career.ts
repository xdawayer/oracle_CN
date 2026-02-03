/**
 * 流年报告 - 事业财运模块
 *
 * 输出约 1200-1500 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualCareerPrompt: PromptTemplate = {
  meta: {
    id: 'annual-career',
    version: '2.0',
    module: 'annual',
    priority: 'P0',
    description: '2026 流年运势事业财运',
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

## 2026年这个星座的事业运
${signInfluence}

## 你的任务
写一篇2026年事业财运分析，1000-1200字。

## 内容要包含

### 1. 今年搞钱运怎么样（250字左右）

开门见山说清楚：
- 今年适合稳扎稳打还是大胆突破？
- 上半年和下半年有什么变化？可以用五行视角概括（如"上半年火旺冲劲足，下半年土来打地基"）
- 可能遇到什么坑？怎么避？
- 关键节气节点可以顺带一提（如"惊蛰前后适合行动""秋分之后适合收网"）

别堆砌星象术语，用人话说。五行节气只是点缀。

### 2. 职场人际关系（200字左右）

**跟领导**
- 今年适合多刷存在感还是低调做事？
- 有什么要注意的？

**跟同事**
- 合作运怎么样？
- 容易跟谁起冲突？怎么处理？

**贵人运**
- 什么时候容易遇到贵人？
- 贵人可能是什么样的人？

### 3. 具体该怎么做（300字左右）

**如果你是打工人**
- 今年适合跳槽吗？什么时候跳比较好？
- 要不要争取晋升？什么时候机会大？
- 有什么技能值得学？

**如果你想搞副业/创业**
- 今年适合吗？什么时候"动"比较顺？
- 什么领域比较顺？（可以结合五行属性暗示，如"火属性的行业今年势头好"）
- 有什么风险要注意？

### 4. 钱的事（200字左右）

**收入**
- 今年工资/主业收入走势
- 什么时候可能有额外收入

**花钱**
- 大额支出（买房买车装修）什么时候比较顺？
- 需要注意什么？

注意：不要给具体理财建议。

### 5. 每月关键提醒（200字左右）

用简单的表格：

| 月份 | 工作重点 |
|------|----------|
| 1-2月 | xxx |
| 3-4月 | xxx |
| 5-6月 | xxx |
| 7-8月 | xxx |
| 9-10月 | xxx |
| 11-12月 | xxx |

## 注意
- 考虑中国职场实际：内卷、35岁焦虑、体制内外选择等
- 建议要具体可操作
- 表格内容简洁，一格不超过10个字
- 钱的话题要谨慎，别制造焦虑
- **不要写"事业财运"、"2026年XX座事业运"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

/**
 * 流年报告 - 健康能量模块
 *
 * 输出约 800-1000 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualHealthPrompt: PromptTemplate = {
  meta: {
    id: 'annual-health',
    version: '2.0',
    module: 'annual',
    priority: 'P1',
    description: '2026 流年运势健康能量',
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

## 你的任务
写一篇2026年健康运势，700-900字。要实用，别太玄。

## 内容要包含

### 1. 今年身体状况怎么样（150字左右）

开门见山：
- 今年整体精力怎么样？
- 什么时候容易累？什么时候状态好？
- 有什么需要特别注意的？

### 2. 身体方面（200字左右）

**需要关注的地方**
这个星座今年容易哪里不舒服？给1-2个提醒就行。

**建议**
- 什么时候去体检比较好？
- 有什么简单的保养建议？

注意：只是一般性建议，不是医学诊断。有问题还是要看医生。

### 3. 精力管理（200字左右）

**什么时候状态好**
- 哪几个月精力比较充沛？适合干什么？

**什么时候要注意休息**
- 哪几个月容易累？怎么调节？

**别太累**
- 打工人怎么避免过劳？
- 什么信号说明该休息了？

### 4. 四季养生小建议（200字左右）

结合节气节奏，简单说一下每个季节：

**春天（立春→立夏）**
运动/饮食/作息，各一句话建议。

**夏天（立夏→立秋）**
运动/饮食/作息，各一句话建议。

**秋天（立秋→立冬）**
运动/饮食/作息，各一句话建议。

**冬天（立冬→立春）**
运动/饮食/作息，各一句话建议。

注意：建议要具体实用，不要写成中医科普。节气只在自然相关时提一句，不要硬塞。

### 5. 心理健康（150字左右）

- 什么时候情绪容易波动？怎么调节？
- 适合这个星座的减压方式
- 一句话提醒

## 注意
- 不要诊断疾病，只给一般性建议
- 不要制造焦虑
- 节气只在自然相关时提一句，不要硬塞
- 说人话，给具体建议，不要用中医术语堆砌
- 建议要具体可操作
- 最后提醒：有问题要看医生
- **不要写"健康能量"、"2026年XX座健康运"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

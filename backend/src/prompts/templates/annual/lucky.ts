/**
 * 流年报告 - 开运指南模块
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

export const annualLuckyPrompt: PromptTemplate = {
  meta: {
    id: 'annual-lucky',
    version: '2.0',
    module: 'annual',
    priority: 'P2',
    description: '2026 流年运势开运指南',
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
写一篇2026年开运指南，600-800字。要实用、接地气，别太玄乎。

## 内容要包含

### 1. 幸运元素（200字左右）

**幸运色**
今年适合穿什么颜色？可以结合五行属性来推荐（如"你今年缺水，蓝色系帮你补上"），简单说1-2个主色就行。告诉用户具体怎么用，比如：
- 面试/重要场合穿XX色
- 手机壳、钱包可以选XX色

**幸运数字**
给1-2个幸运数字，说说怎么用（选座位、约日期之类的）。

**对你有利的方向**
如果要跳槽/搬家/出差，往哪个方向比较顺？可以结合五行方位简单说一下。

### 2. 每月好日子速查（200字左右）

用简单的表格列出每月的好日子：

| 月份 | 适合做事 | 建议避开 |
|------|----------|----------|
| 1月 | 8、15、22 | 26-31 |
| 2月 | 5、12、19 | 1-16 |

这样往下列完12个月。

**表格格式要求**：
- 日期之间用顿号「、」分隔，如：5、12、19
- 连续日期用横杠，如：26-31
- 每格内容简洁，不要加"号"字
- "适合做事"：签合同、面试、表白、开业等
- "建议避开"：水逆期间、月食前后等

### 3. 一些小建议（200字左右）

别写什么"仪式""能量"，就给一些实用的小建议：

**日常可以做的**
- 早上起来可以干嘛（很简单的事）
- 压力大的时候怎么调节

**跟着节气走的小习惯**
- 立春/立夏/立秋/立冬各适合做什么（一句话就够）
- 冬至和夏至有什么讲究

**几个特别的日子**
- 生日那周怎么安排
- 春节期间注意什么

### 4. 最后说两句（100字左右）
给个简单的祝福，别太鸡汤。强调一下：运气这东西，三分天注定七分靠自己。

## 注意
- 表格列数不要超过3列，内容简洁
- 不要用"能量""振动""宇宙"这类词
- 建议要具体可操作，别整虚的
- 语气轻松，像朋友给建议
- **不要写"开运指南"、"2026年XX座开运"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

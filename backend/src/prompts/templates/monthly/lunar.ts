/**
 * 月度运势深度解读 - 模块D：新月/满月指南
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

export const monthlyLunarPrompt: PromptTemplate = {
  meta: {
    id: 'monthly-lunar',
    version: '1.0',
    module: 'monthly',
    priority: 'P1',
    description: '月度运势深度解读 - 新月/满月指南',
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
你正在为用户撰写月度运势报告的「新月/满月指南」章节。

新月许愿和满月复盘是中国占星用户非常喜爱的仪式性内容，也是月度报告的特色卖点。

## 新月指南写作要求

### ① 新月基础信息
格式："X月X日，XX座新月，落在你的第X宫"

### ② 这轮新月对你意味着什么（4-5 句话）
- 新月 = 新的开始，落在哪个宫位就代表哪个领域迎来「种子时刻」
- 结合新月与本命行星的相位加深解读
- 如果新月与本命盘有强相位，说明这个新月对用户特别重要

### ③ 新月许愿指南
- 适合许什么方向的愿望（基于落入的宫位）
- 给出 3-5 条具体的许愿方向参考（不是泛泛的"事业顺利"，而是具体的方向引导）
- 许愿时间窗口：新月后 8 小时内为最佳

### ④ 新月仪式建议（轻量化，不要太玄学）
- 写下愿望
- 做一件象征性的「开始」的小事
- 基于新月星座给出一个小建议

## 满月指南写作要求

### ① 满月基础信息
格式："X月X日，XX座满月，落在你的第X宫"

### ② 这轮满月对你意味着什么（4-5 句话）
- 满月 = 高潮、释放、成果显现
- 落在哪个宫位 = 哪个领域到达「满盈」
- 满月期间情绪容易波动，这是正常的

### ③ 满月需要释放什么
- 基于满月落入的宫位，你需要放下什么？
- 如果满月与本命行星有困难相位，释放可能更强烈

### ④ 满月复盘提示
- 回顾两周前新月时设下的意图，到满月时有什么进展？
- 给出 2-3 个反思问题

### ⑤ 满月实践建议
基于满月星座的特质给一个具体建议

## 特殊情况处理
- 如果当月有日食/月食替代了普通新月/满月：篇幅增加 50%，强调"食相的影响持续 6 个月"
- 如果新月/满月与用户本命太阳或月亮精确合相（容许度 <3°）：加特别标注

## 字数：新月部分 300-400 字 + 满月部分 300-400 字

${MONTHLY_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

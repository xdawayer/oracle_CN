/**
 * 财富专题 - 模块四：未来12个月财富运势（forecast）
 *
 * 输出约 500-700 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  WEALTH_TOPIC_SYSTEM_PROMPT,
  WEALTH_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  buildTransitText,
} from './system';

export const wealthTopicForecastPrompt: PromptTemplate = {
  meta: {
    id: 'wealth-topic-forecast',
    version: '1.0',
    module: 'wealth-topic',
    priority: 'P0',
    description: '财富专题 - 未来12个月财富运势',
    lastUpdated: '2026-02-02',
  },
  system: WEALTH_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const transitText = buildTransitText(ctx);

    const allSummary = ctx._allModuleSummary || '';
    const summarySection = allSummary
      ? `\n## 前序所有模块摘要\n${allSummary}\n\n基于前面的分析，自然过渡到"那未来一年的财富运势如何"。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 行运数据（未来12个月与财富相关的主要行运）
${transitText}
${summarySection}
## 你的任务
你正在撰写财富专题深度报告的最后一个章节：「未来12个月财富运势」。

这是收尾章节，聚焦时间维度的财富节奏。

请按以下结构展开：

### 一、全年财富基调
- 基于木星、土星等外行星的过境位置，判断今年财富运势是"增长型"还是"守成型"还是"调整型"
- 用1-2句话给出年度关键词

### 二、收入窗口期
- 木星/金星过境 2/10 宫的时段
- 具体到月份范围，说明这段时间适合做什么（谈加薪？接私活？找副业机会？）
- 不要说"你会发财"，说"这段时间如果主动争取，收入增长的概率比较大"

### 三、谨慎时段
- 土星/冥王星过境财务宫位（2/8宫）的时段
- 水逆落在2/8宫的时段
- 具体到月份范围，说明需要注意什么
- 不要说"你会破财"，说"这段时间大额消费/投资要多想想"

### 四、投资合作能量
- 8宫相关行运暗示的合作理财/他人资源方面的趋势
- 什么时候适合寻求合作？什么时候应该保守？
- 重申：不推荐具体投资标的

### 五、财务节奏建议
- 基于全年行运，给出一个简单的财务节奏建议
- 比如："上半年适合开源，下半年适合节流"
- 列出2-3条全年理财行为建议
- 保持务实，不画大饼

## 特别注意
- 行运数据如果不完整，就基于你所知的2026年大行星过境做分析
- 严格禁止推荐具体投资标的（股票、基金、房产、加密货币等）
- 不要预测具体金额或收入数字
- 不要做任何可被视为金融建议的表述

## 字数：500-700字

${WEALTH_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

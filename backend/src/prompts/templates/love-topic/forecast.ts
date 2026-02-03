/**
 * 爱情专题 - 模块四：未来12个月感情运势（forecast）
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  LOVE_TOPIC_SYSTEM_PROMPT,
  LOVE_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  buildTransitText,
} from './system';

export const loveTopicForecastPrompt: PromptTemplate = {
  meta: {
    id: 'love-topic-forecast',
    version: '1.0',
    module: 'love-topic',
    priority: 'P0',
    description: '爱情专题 - 未来12个月感情运势',
    lastUpdated: '2026-02-02',
  },
  system: LOVE_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const transitText = buildTransitText(ctx);

    const allSummary = ctx._allModuleSummary || '';
    const summarySection = allSummary
      ? `\n## 前序所有模块摘要\n${allSummary}\n\n基于前面的分析，自然过渡到"那未来一年的感情运势如何"。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 行运数据（未来12个月与感情相关的主要行运）
${transitText}
${summarySection}
## 你的任务
你正在撰写爱情专题深度报告的最后一个章节：「未来12个月感情运势」。

这是整篇报告的收尾，要有前瞻性和行动指引。需要同时照顾单身和有伴侣的用户。

请按以下结构展开：

### 一、未来一年感情总基调
- 基于木星、土星等外行星的过境位置，判断今年感情运势是"开拓型"还是"稳固型"还是"反思型"
- 用1-2句话给出一个年度关键词

### 二、桃花窗口期（单身用户）
- 金星过境 5/7 宫、木星过境 5/7 宫等时段
- 具体到月份范围，说明这段时间适合做什么（主动出击？还是等缘分自己来？）
- 不要说"你会遇到命中注定的人"，说"这段时间你的社交魅力比较强，容易吸引人"

### 三、感情考验期（有伴侣用户）
- 土星/冥王星过境 7/8 宫、火星逆行等时段
- 具体到月份范围，说明可能出现的挑战和应对建议
- 不要说"你们会分手"，说"这段时间可能会有一些需要好好沟通的事"

### 四、金星逆行影响
- 如果今年有金星逆行（提供日期），说明对感情的影响
- 适合做什么（反思、复盘）、不适合做什么（冲动表白、分手）
- 如果今年没有金星逆行，这一节可以换成"值得关注的特殊星象"

### 五、关键日期清单
- 列出3-5个对感情有重要影响的日期/时段
- 每个日期附1句话说明原因和建议
- 格式：月份 + 星象 + 影响 + 建议行动

## 特别注意
- 行运数据如果不完整，就基于你所知的2026年大行星过境做分析
- 不要预测具体事件，只说"这段时间的能量适合XX"
- 结尾引导：如果用户想看跟具体的人的配对分析，可以试试合盘报告
- 分单身/有伴两个角度写，让不同状态的用户都能有收获

## 字数：600-800字

${LOVE_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

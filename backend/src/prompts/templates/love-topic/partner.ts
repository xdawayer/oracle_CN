/**
 * 爱情专题 - 模块二：理想伴侣与关系模式（partner）
 *
 * 输出约 800-1000 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  LOVE_TOPIC_SYSTEM_PROMPT,
  LOVE_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const loveTopicPartnerPrompt: PromptTemplate = {
  meta: {
    id: 'love-topic-partner',
    version: '1.0',
    module: 'love-topic',
    priority: 'P0',
    description: '爱情专题 - 理想伴侣与关系模式',
    lastUpdated: '2026-02-02',
  },
  system: LOVE_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const venusData = extractPlanetData(ctx, '金星');
    const marsData = extractPlanetData(ctx, '火星');
    const house5 = extractHouseData(ctx, 5);
    const house7 = extractHouseData(ctx, 7);
    const house8 = extractHouseData(ctx, 8);
    const venusAspects = extractPlanetAspects(ctx, '金星');

    // Juno 和 Chiron 可选
    const junoData = extractPlanetData(ctx, '婚神星');
    const chironData = extractPlanetData(ctx, '凯龙星');

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${venusData}
- ${marsData}
- ${house5}（恋爱宫）
- ${house7}（婚姻宫/伴侣宫）
- ${house8}（亲密关系深层宫）
- ${junoData}
- ${chironData}

## 金星相位
${venusAspects}
${transitionNote}
## 你的任务
你正在撰写爱情专题深度报告的第二个章节：「理想伴侣与关系模式」。

这个章节用户非常关心"我适合什么样的人"。要有判断，不能太泛。

请按以下结构展开：

### 一、你潜意识在找什么样的人（7宫深度）
- 7宫宫头星座描绘了你本能会被吸引的伴侣类型
- 具体到性格特质、外在风格、处事方式，不要只说星座形容词
- 如果7宫有行星，这些行星代表你在关系中会遇到/需要的能量
- 7宫宫主星落入的宫位暗示你在什么场景容易遇到重要的人

### 二、你的婚姻指针（Juno / 7宫宫主星）
- 如果有 Juno 数据：Juno 的星座和宫位反映你对长期关系的本能期待
- 如果没有 Juno 数据：用 7 宫宫主星代替分析
- 你对"长期关系"和"短期恋爱"的需求有什么不同？

### 三、关系互动模式（金火互动 + 5/8宫）
- 5宫是恋爱和暧昧的宫位：你享受暧昧期吗？你是享受追的过程还是想快速确定关系？
- 8宫是深层亲密的宫位：你在亲密关系中是敞开型还是自我保护型？
- 金星和火星的互动模式：你们俩内在的"喜欢方式"和"行动方式"是否协调？

### 四、理想伴侣特质清单
- 基于以上所有数据，列出3-5个你真正需要（而不只是想要）的伴侣特质
- 每个特质附上星盘依据，1-2句话说明
- 形式可以用列表，简洁有力

## 特别注意
- 7宫有土星不要说"你婚姻会晚"，说"你挑人严格，不会随便凑合"
- 8宫有冥王星不要说"你的亲密关系很危险"，说"你谈恋爱一旦投入就很深，all in 型的"
- Juno 数据如果没有，不要编造，直接跳过用7宫宫主星分析
- 见家长场景可以融入：你觉得什么时候适合带对方见家长？

## 字数：800-1000字

${LOVE_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

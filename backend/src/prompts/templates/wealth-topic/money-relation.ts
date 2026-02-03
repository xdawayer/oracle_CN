/**
 * 财富专题 - 模块一：你与金钱的关系（money-relation）
 *
 * 输出约 700-900 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  WEALTH_TOPIC_SYSTEM_PROMPT,
  WEALTH_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const wealthTopicMoneyRelationPrompt: PromptTemplate = {
  meta: {
    id: 'wealth-topic-money-relation',
    version: '1.0',
    module: 'wealth-topic',
    priority: 'P0',
    description: '财富专题 - 你与金钱的关系',
    lastUpdated: '2026-02-02',
  },
  system: WEALTH_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const venusData = extractPlanetData(ctx, '金星');
    const moonData = extractPlanetData(ctx, '月亮');
    const house2 = extractHouseData(ctx, 2);
    const venusAspects = extractPlanetAspects(ctx, '金星');
    const moonAspects = extractPlanetAspects(ctx, '月亮');

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${house2}（财帛宫）
- ${venusData}
- ${moonData}

## 金星相位
${venusAspects}

## 月亮相位
${moonAspects}

## 你的任务
你正在撰写财富专题深度报告的第一个章节：「你与金钱的关系」。

这是开篇模块，让用户先看清自己跟钱的本能关系。

请按以下结构展开：

### 一、你的金钱原型（2宫深度分析）
- 2宫宫头星座定义了你对"自己值多少钱"的本能认知
- 2宫有行星落入的话，这些行星给你的赚钱方式加了什么buff或debuff
- 2宫空宫的话通过宫主星来分析
- 给一个形象标签，比如"稳扎稳打型存钱达人"或"冲动消费后疯狂后悔型"

### 二、你赚钱的本能方式（2宫宫主星）
- 2宫宫主星落入的宫位暗示你最自然的赚钱途径
- 比如宫主星在10宫=靠事业/职位赚钱；在3宫=靠沟通/写作/社交赚钱；在5宫=靠创意/投资赚钱
- 要具体到实际的赚钱方式，不要只说抽象的"某领域有潜力"

### 三、你花钱的模式（金星 + 月亮）
- 金星代表你的消费品味和花钱方向：你愿意在什么上面花钱？
- 月亮代表你在什么情绪下容易花钱：开心时花？焦虑时花？无聊时花？
- 金星和月亮的相位组合揭示你消费行为的模式
- 融入年轻人场景：被种草、直播间冲动消费、凑满减、存钱app

## 特别注意
- 第一个模块不涉及行运数据，纯本命盘分析
- 不要说"你会有钱/没钱"，说"你跟钱的关系是XX型的"
- 如果2宫配置显示理财方面有挑战，给出积极视角但不回避问题
- 这是开篇，基调要有趣、引人入胜

## 字数：700-900字

${WEALTH_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

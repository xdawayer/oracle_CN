/**
 * 爱情专题 - 模块三：关系成长课题（growth）
 *
 * 输出约 600-800 字，纯 Markdown 文本
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

export const loveTopicGrowthPrompt: PromptTemplate = {
  meta: {
    id: 'love-topic-growth',
    version: '1.0',
    module: 'love-topic',
    priority: 'P0',
    description: '爱情专题 - 关系成长课题',
    lastUpdated: '2026-02-02',
  },
  system: LOVE_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const house8 = extractHouseData(ctx, 8);
    const house12 = extractHouseData(ctx, 12);
    const chironData = extractPlanetData(ctx, '凯龙星');
    const plutoData = extractPlanetData(ctx, '冥王星');
    const saturnData = extractPlanetData(ctx, '土星');
    const northNodeData = extractPlanetData(ctx, '北交点');
    const southNodeData = extractPlanetData(ctx, '南交点');
    const venusAspects = extractPlanetAspects(ctx, '金星');
    const moonAspects = extractPlanetAspects(ctx, '月亮');

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到"成长"话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${house8}
- ${house12}
- ${chironData}
- ${plutoData}
- ${saturnData}
- ${northNodeData}
- ${southNodeData}

## 金星困难相位
${venusAspects}

## 月亮困难相位
${moonAspects}
${transitionNote}
## 你的任务
你正在撰写爱情专题深度报告的第三个章节：「关系成长课题」。

这个章节需要指出用户在感情中的"盲区"和"功课"，但温度要够——每指出一个问题，必须同时给出"礼物"视角。

请按以下结构展开：

### 一、你在感情里容易踩的坑
- 从金星/月亮的困难相位（刑、冲、合冥王/土星/天王/海王）中找到2-3个关系模式
- 比如：金星刑冥王 → 谈恋爱容易控制欲强或者反过来总被PUA
- 比如：月亮冲土星 → 嘴上说不在乎其实心里特别在意
- 说问题，但不要用"原生家庭创伤""依恋模式"这种词，用大白话

### 二、你对亲密关系的恐惧
- 8宫和12宫的配置揭示你在深层亲密关系中的回避点
- 可能是害怕被看穿、害怕失去自由、害怕被抛弃
- 凯龙星如果落在关系相关的宫位（5/7/8宫），说说这个"老伤口"是什么
- 数据不存在就跳过，不编造

### 三、你这辈子在感情上的成长方向（北交/南交）
- 南交点代表你上辈子/过去习惯的关系模式（舒适区）
- 北交点代表这辈子要去发展的新模式（成长方向）
- 用生活化的例子说明：比如南交7宫→北交1宫就是"别老围着别人转了，先搞定自己"
- 数据不存在就跳过

### 四、成长建议（2-3条，实操可落地）
- 不要写"学会爱自己"这种废话
- 要具体：比如"下次吵架的时候试试先冷静10分钟再说话"
- 每条建议对应前面分析的某个问题

## 温度控制（极其重要）
- 每指出一个"坑"或"恐惧"，紧跟着给出"好的一面"或"怎么用好它"
- 比如说完"你容易控制欲强"之后，接"但换个角度说，你对感情非常投入，投入本身不是坏事"
- 结尾基调一定是积极的，让用户感到被理解而不是被评判

## 字数：600-800字

${LOVE_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

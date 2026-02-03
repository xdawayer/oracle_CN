/**
 * 爱情专题 - 模块一：恋爱人格画像（personality）
 *
 * 输出约 700-900 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  LOVE_TOPIC_SYSTEM_PROMPT,
  LOVE_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
} from './system';

export const loveTopicPersonalityPrompt: PromptTemplate = {
  meta: {
    id: 'love-topic-personality',
    version: '1.0',
    module: 'love-topic',
    priority: 'P0',
    description: '爱情专题 - 恋爱人格画像',
    lastUpdated: '2026-02-02',
  },
  system: LOVE_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const venusData = extractPlanetData(ctx, '金星');
    const marsData = extractPlanetData(ctx, '火星');
    const moonData = extractPlanetData(ctx, '月亮');
    const risingData = extractPlanetData(ctx, '上升');
    const venusAspects = extractPlanetAspects(ctx, '金星');
    const marsAspects = extractPlanetAspects(ctx, '火星');
    const moonAspects = extractPlanetAspects(ctx, '月亮');

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${venusData}
- ${marsData}
- ${moonData}
- ${risingData}

## 金星相位
${venusAspects}

## 火星相位
${marsAspects}

## 月亮相位
${moonAspects}

## 你的任务
你正在撰写爱情专题深度报告的第一个章节：「恋爱人格画像」。

这是整篇报告的开篇，用户第一眼看到的内容。要让用户觉得"这说的就是我"。

请按以下结构展开：

### 一、你爱一个人的方式（金星深度）
- 金星星座决定了你表达爱和接收爱的方式
- 不只是说"你喜欢浪漫"，要具体：你是喜欢天天腻在一起还是各自精彩偶尔约会？你表白是直接还是暗示？
- 金星所在宫位影响你在什么场景容易动心
- 结合金星的主要相位，说说这种爱的方式有什么"加成"或"bug"

### 二、你的吸引力法则（上升+火星）
- 上升星座决定别人第一眼觉得你是什么类型
- 火星决定你追人的方式和节奏：你是猛攻型还是慢热型？
- 什么类型的人容易被你吸引？什么类型你容易对他上头？

### 三、你在爱里的不安全感（月亮）
- 月亮星座揭示你在关系中最容易敏感的点
- 你吵架时的反应模式（是冷战还是爆发？是讲道理还是闹情绪？）
- 你需要伴侣给你的那个"确定感"具体长什么样

### 四、你的恋爱语言总结
- 基于以上三组数据，用2-3句话总结你在爱情中的核心特征
- 给一个形象的比喻或标签，比如"慢热但一旦爱了就掏心掏肺的类型"

## 特别注意
- 可以聊实用话题：暧昧期你的表现、朋友圈互动风格、约会喜好
- 元素平衡也可以提一嘴：火元素多的人谈恋爱热烈但可能三分钟热度
- 如果金星或火星有困难相位，说问题但不要吓人，给出积极方向

## 字数：700-900字

${LOVE_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

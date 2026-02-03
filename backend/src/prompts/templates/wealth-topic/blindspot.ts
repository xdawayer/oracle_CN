/**
 * 财富专题 - 模块三：金钱盲区与理财建议（blindspot）
 *
 * 输出约 600-800 字，纯 Markdown 文本
 * 末尾必须包含免责声明
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

export const wealthTopicBlindspotPrompt: PromptTemplate = {
  meta: {
    id: 'wealth-topic-blindspot',
    version: '1.0',
    module: 'wealth-topic',
    priority: 'P0',
    description: '财富专题 - 金钱盲区与理财建议',
    lastUpdated: '2026-02-02',
  },
  system: WEALTH_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const venusData = extractPlanetData(ctx, '金星');
    const neptuneData = extractPlanetData(ctx, '海王星');
    const plutoData = extractPlanetData(ctx, '冥王星');
    const house2 = extractHouseData(ctx, 2);
    const house4 = extractHouseData(ctx, 4);
    const venusAspects = extractPlanetAspects(ctx, '金星');
    const neptuneAspects = extractPlanetAspects(ctx, '海王星');
    const plutoAspects = extractPlanetAspects(ctx, '冥王星');

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到"金钱盲区"话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${venusData}
- ${neptuneData}
- ${plutoData}
- ${house2}（财帛宫）
- ${house4}（家庭宫/根基宫）

## 金星困难相位
${venusAspects}

## 海王星相位
${neptuneAspects}

## 冥王星相位
${plutoAspects}
${transitionNote}
## 你的任务
你正在撰写财富专题深度报告的第三个章节：「金钱盲区与理财建议」。

这个章节要诚实地指出用户在财务上的盲区，同时给出实操建议。

请按以下结构展开：

### 一、你的金钱阴影（困难相位模式）
- 从金星/月亮/冥王星/海王星的困难相位中找到2-3个金钱方面的"坑"
- 比如：金星刑海王星 → 容易在花钱上自欺欺人（"这是最后一次了"），也容易被割韭菜
- 比如：月亮冲冥王星 → 情绪一上来就花钱，用消费来填补内心空虚
- 比如：土星刑金星 → 对自己太抠但对别人花钱大方，或者反过来
- 用大白话说问题，不用心理学术语

### 二、需要留意的金钱信念（2宫 + 4宫交叉）
- 2宫是你对自己价值的认知，4宫是你从家庭继承的金钱观
- 交叉分析：你对钱的态度有多少是自己选的，有多少是从小耳濡目染的？
- 比如：如果2宫宫头在摩羯但4宫有木星，你可能嘴上说要省钱但心里觉得钱花了还能赚
- 指出这些"隐藏设定"，帮用户看清自己

### 三、3条定制理财建议
- 基于前面分析的盲区和特点，给出3条具体的理财行为建议
- 每条建议要：(1) 对应前面分析的某个问题 (2) 具体可执行 (3) 符合年轻人的场景
- 好的例子："每次冲动消费前给自己3天冷静期"
- 坏的例子："学会理性消费"（太泛）
- 可以涉及：自动存钱设置、消费记账习惯、跟朋友的金钱边界

---

**⚠️ 声明：本内容基于占星学象征分析，不构成任何投资建议或财务规划。重大财务决策请咨询持牌专业人士。**

## 特别注意
- 末尾的免责声明是强制的，必须保留上面那段话
- 不推荐任何具体投资产品
- 指出问题时要同时给"好的一面"，比如"虽然你花钱冲动，但你在挣钱上也够果断"
- 语气：像朋友善意提醒，不是在教训人

## 字数：600-800字（含免责声明）

${WEALTH_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

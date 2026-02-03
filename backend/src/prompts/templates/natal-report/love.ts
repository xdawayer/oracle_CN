/**
 * 本命深度解读 - 模块四：爱情与亲密关系
 *
 * 输出约 800-1100 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  NATAL_REPORT_SYSTEM_PROMPT,
  NATAL_REPORT_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const natalReportLovePrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-love',
    version: '1.0',
    module: 'natal-report',
    priority: 'P0',
    description: '本命深度解读 - 爱情与亲密关系',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const venusData = extractPlanetData(ctx, '金星');
    const marsData = extractPlanetData(ctx, '火星');
    const venusAspects = extractPlanetAspects(ctx, '金星');
    const marsAspects = extractPlanetAspects(ctx, '火星');
    const house5 = extractHouseData(ctx, 5);
    const house7 = extractHouseData(ctx, 7);

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到爱情话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${venusData}
- ${marsData}
- ${house5}
- ${house7}

## 金星相位
${venusAspects}

## 火星相位
${marsAspects}
${transitionNote}
## 你的任务
你正在撰写「爱情与亲密关系」章节。

聚焦数据：金星、火星、第5宫、第7宫、7宫宫主星位置、以及这些行星的所有相位。

请按以下结构展开：

### 一、你在爱情里是什么类型（金星）
- 你喜欢什么样的人？你自己在恋爱中是什么风格？
- 你表达喜欢的方式是什么？你希望对方怎么对你？（金星星座决定了你表达和接收爱的方式）

### 二、你追人和来电的方式（火星）
- 你在感情中主动还是被动？你怎么追人？
- 什么类型的人能让你心动？

### 三、你理想中的另一半长什么样（第7宫）
- 7宫宫头星座描绘了你本能会被吸引的伴侣特质
- 7宫内行星代表你在关系中会遇到的能量
- 7宫宫主星落入的宫位暗示你在什么场景容易遇到重要的人

### 四、你在感情里容易踩的坑
- 金星/火星的紧张相位揭示的关系模式，比如金星刑冥王星可能让你在关系中总想掌控局面，或者反过来总被对方牵着走
- 指出问题的同时，给出实际能做的调整建议

### 五、感情特点总结
- 基于星盘配置，概括一下你在感情中的核心特点

## 特别注意
- 可以聊实用话题：你适合什么相处模式、你在不在意仪式感、你需要多少个人空间
- 7宫有土星不要说"你婚姻会晚"，而是说"你对关系要求高，不会随便凑合，所以可能需要更长时间确认一段关系"
- 如果盘面显示感情方面挑战多，结尾给出正面角度但不要用"课题""疗愈"这类心理学词汇

## 字数：800-1100字（这是最长的模块，因为用户最关注）

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

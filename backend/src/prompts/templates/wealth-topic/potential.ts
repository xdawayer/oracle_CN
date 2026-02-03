/**
 * 财富专题 - 模块二：财富潜力与增长路径（potential）
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

export const wealthTopicPotentialPrompt: PromptTemplate = {
  meta: {
    id: 'wealth-topic-potential',
    version: '1.0',
    module: 'wealth-topic',
    priority: 'P0',
    description: '财富专题 - 财富潜力与增长路径',
    lastUpdated: '2026-02-02',
  },
  system: WEALTH_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const jupiterData = extractPlanetData(ctx, '木星');
    const saturnData = extractPlanetData(ctx, '土星');
    const house8 = extractHouseData(ctx, 8);
    const house11 = extractHouseData(ctx, 11);
    const house2 = extractHouseData(ctx, 2);
    const jupiterAspects = extractPlanetAspects(ctx, '木星');
    const saturnAspects = extractPlanetAspects(ctx, '土星');

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到"财富增长潜力"话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${jupiterData}
- ${saturnData}
- ${house2}（财帛宫/主动收入）
- ${house8}（偏财宫/被动收入/他人的钱）
- ${house11}（社交收入/长期积累/愿望宫）

## 木星相位
${jupiterAspects}

## 土星相位
${saturnAspects}
${transitionNote}
## 你的任务
你正在撰写财富专题深度报告的第二个章节：「财富潜力与增长路径」。

这个章节聚焦用户的赚钱潜力和最佳增长路径。

请按以下结构展开：

### 一、你的丰盛通道（木星）
- 木星代表你的"幸运点"和容易获得机遇的领域
- 木星落入的宫位暗示你在什么领域赚钱最顺
- 木星的相位决定这种"好运"是稳定的还是需要努力配合的
- 具体到：你是适合工资慢慢涨还是适合搞一波大的？

### 二、被动收入潜力（8宫）
- 8宫代表"他人的钱"——投资收益、分红、保险、遗产、配偶收入
- 8宫的配置暗示你在被动收入方面的潜力
- 空宫不代表没有被动收入，通过宫主星分析
- 注意：不推荐具体投资方式，只说"你有/没有被动收入方面的天然优势"

### 三、长期积累能力（11宫 + 土星）
- 11宫代表长期目标和社群带来的收益
- 土星代表你积累财富的耐心和纪律
- 土星强的人适合长期投资/慢慢存；土星弱的人可能需要外部纪律（比如自动转存）
- 这不是说谁好谁坏，是风格不同

### 四、增长路径总结
- 基于以上分析，给出清晰的财富增长建议（2-3条）
- 每条建议要具体：不要说"开拓收入来源"，说"你适合发展跟XX相关的副业收入"
- 建议按优先级排列

## 特别注意
- 不推荐任何具体投资标的
- 不做任何可被视为金融建议的表述
- 8宫有困难相位不要说"你会破财"，说"你在合作理财方面需要多谨慎"
- 保持积极但务实的基调

## 字数：700-900字

${WEALTH_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

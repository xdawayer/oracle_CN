/**
 * 事业专题 - 模块三：人生使命与蜕变（mission）
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  CAREER_TOPIC_SYSTEM_PROMPT,
  CAREER_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const careerTopicMissionPrompt: PromptTemplate = {
  meta: {
    id: 'career-topic-mission',
    version: '1.0',
    module: 'career-topic',
    priority: 'P0',
    description: '事业专题 - 人生使命与蜕变',
    lastUpdated: '2026-02-02',
  },
  system: CAREER_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const northNodeData = extractPlanetData(ctx, '北交点');
    const southNodeData = extractPlanetData(ctx, '南交点');
    const plutoData = extractPlanetData(ctx, '冥王星');
    const jupiterData = extractPlanetData(ctx, '木星');
    const saturnData = extractPlanetData(ctx, '土星');
    const house10 = extractHouseData(ctx, 10);
    const plutoAspects = extractPlanetAspects(ctx, '冥王星');

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到"更长远的事业方向"话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${northNodeData}
- ${southNodeData}
- ${plutoData}
- ${jupiterData}
- ${saturnData}
- ${house10}

## 冥王星相位
${plutoAspects}
${transitionNote}
## 你的任务
你正在撰写事业专题深度报告的第三个章节：「人生使命与蜕变」。

这个章节的视角更宏观，聚焦用户长期的事业发展方向和需要突破的地方。

请按以下结构展开：

### 一、你的舒适区 vs 成长方向（南交 → 北交）
- 南交点代表你在事业上习惯的方式（可能是上辈子带来的"老技能"，也就是你擅长但容易依赖的东西）
- 北交点代表你这辈子要去发展的新方向
- 用具体例子说明：比如南交6宫→北交12宫就是"别只顾着埋头干活了，要学会退一步看全局"
- 数据不存在就跳过，不编造

### 二、机遇方向（木星）
- 木星的位置暗示你在什么领域容易获得机会和贵人
- 木星落入的宫位和星座组合起来看
- 这不是说"你一定会在XX领域成功"，而是"如果你往这个方向使劲，回报比较大"

### 三、人生蜕变领域（冥王星）
- 冥王星代表彻底的重建和转型
- 在事业层面，冥王星落入的宫位暗示你可能经历"推倒重来"的领域
- 这不一定是坏事，很多人最大的事业突破就是从冥王星相关的领域来的
- 给出积极的视角：蜕变=破旧立新=升级

### 四、长期事业建议总结
- 基于以上所有数据，给出3条长期事业发展建议
- 每条建议要具体可执行，不要写"保持学习"这种废话
- 可以涉及：你需要避免什么、你需要坚持什么、你的拐点可能在什么时候

## 特别注意
- 不要使用"使命""灵魂契约"等灵修词汇，用"你比较适合的长远方向"
- 北交/南交数据没有就跳过整个小节，不编造
- 冥王星的分析要正面为主，"蜕变"不等于"灾难"
- 在校学生：长期建议可以从学业规划和职业探索角度切入

## 字数：600-800字

${CAREER_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

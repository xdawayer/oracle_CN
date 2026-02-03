/**
 * 事业专题 - 模块二：职场人际与领导力（workplace）
 *
 * 输出约 500-700 字，纯 Markdown 文本
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

export const careerTopicWorkplacePrompt: PromptTemplate = {
  meta: {
    id: 'career-topic-workplace',
    version: '1.0',
    module: 'career-topic',
    priority: 'P0',
    description: '事业专题 - 职场人际与领导力',
    lastUpdated: '2026-02-02',
  },
  system: CAREER_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const sunData = extractPlanetData(ctx, '太阳');
    const marsData = extractPlanetData(ctx, '火星');
    const saturnData = extractPlanetData(ctx, '土星');
    const jupiterData = extractPlanetData(ctx, '木星');
    const house10 = extractHouseData(ctx, 10);
    const house11 = extractHouseData(ctx, 11);
    const house7 = extractHouseData(ctx, 7);
    const sunAspects = extractPlanetAspects(ctx, '太阳');
    const marsAspects = extractPlanetAspects(ctx, '火星');

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到职场人际话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${sunData}
- ${marsData}
- ${saturnData}
- ${jupiterData}
- ${house10}（事业宫）
- ${house11}（社交/团队宫）
- ${house7}（合作宫）

## 太阳相位
${sunAspects}

## 火星相位
${marsAspects}
${transitionNote}
## 你的任务
你正在撰写事业专题深度报告的第二个章节：「职场人际与领导力」。

这个章节聚焦"你在团队里是什么角色"和"你怎么跟领导/同事/客户相处"。

请按以下结构展开：

### 一、你在团队里的角色定位
- 基于太阳和火星的位置，判断你在团队中自然扮演的角色
- 是主心骨、执行者、军师、润滑剂、还是搞事情的那个？
- 融入具体场景：开会时你是主动发言还是最后总结？项目出问题时你的第一反应是什么？

### 二、你跟领导/权威的关系（太阳 + 土星 + 10宫）
- 太阳跟土星的相位直接影响你跟上级的互动模式
- 你是容易跟领导对着干还是特别听话？你能不能接受被管？
- 如果盘面显示跟权威有冲突，给出务实的应对建议

### 三、你的领导力风格
- 如果你当领导/带团队，你的风格会是什么样？
- 基于太阳、火星和10宫配置来判断
- 不是每个人都适合当领导，如果盘面更适合做专家/顾问型角色，直说

### 四、合伙与竞争（7宫 + 火星）
- 7宫在事业上代表合伙人/客户/甲方
- 你适合跟人合伙创业还是单干？
- 火星的位置决定你在竞争环境中的表现：你是斗志满满还是容易内耗？

## 特别注意
- 要有中国职场特色：应对甲方、年终述职、向上管理等场景
- 在校学生：可以说团队作业、社团、实习中的角色
- 不要过度正面，如果盘面显示职场人际是短板，婉转但诚实地说

## 字数：500-700字

${CAREER_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

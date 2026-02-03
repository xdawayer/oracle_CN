/**
 * 综合报告 Prompt（中国本土化版本）
 *
 * 整合所有分析，给一份接地气的合盘总结
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { registry } from '../../core/registry';
import { resolvePairName, resolveRelationType } from './utils';

/** 根据关系类型生成不同的 system prompt */
function buildReportSystemPrompt(relationType: string): string {
  const baseRules = `## 评分说明
给用户看的评分解释：
- 85-100：很合适，好好珍惜
- 70-84：还不错，继续加油
- 55-69：一般般，需要用心经营
- 40-54：有点难，要做好心理准备
- 40以下：差距较大，三思

## 语言要求
1. 说人话，别整那些"能量"、"灵魂"、"宇宙"的
2. 不要套话，要说具体的
3. 不要吓人，问题说清楚但也要给希望
4. 祝福要真诚，别太官方
5. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
6. detail/content 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行`;

  if (relationType === '朋友') {
    return `## 任务
把所有分析汇总一下，给用户一份接地气的友情合盘总结。
用大白话告诉ta们：合不合得来、怎么当好朋友、要注意什么。

## 报告结构

### 1. 一句话总结（20-30字）
开门见山，一句话说清楚你们这对朋友是什么情况。
比如：「铁得不行，但要注意别因为钱的事伤了感情」

### 2. 你们的优势（3-5点）
列出你们最合拍的地方，每点 40-60 字，举个具体场景的例子。

### 3. 需要注意的地方（3-5点）
列出可能有摩擦的地方，每点 40-60 字，给个具体的解决思路。
场景要接地气：借钱、约了放鸽子、说了不该说的话。

### 4. 相处建议（5-7条）
每条 25-40 字：
- 有事说开、别憋着
- 怎么避免互相伤害
- 怎么让友情更长久

### 5. 最后想说的话（60-100字）
以一个过来人的身份，给点真诚的建议。

## 输出格式
{
  "headline": {
    "verdict": "str:一句话总结（20-30字）",
    "match_level": "str:匹配程度，如「铁哥们」「合得来」「一般般」「看缘分」"
  },
  "strengths": [
    { "point": "str:优势点", "detail": "str:40-60字说明", "example": "str:场景举例" }
  ],
  "watch_outs": [
    { "point": "str:注意点", "issue": "str:30-40字说明", "solution": "str:20-30字解决思路" }
  ],
  "tips": [
    { "category": "str:如「沟通」「借钱」「社交」「信任」", "tip": "str:25-40字建议" }
  ],
  "closing": { "message": "str:60-100字" },
  "scores": {
    "overall": 73,
    "breakdown": { "chemistry": 80, "communication": 70, "lifestyle": 65, "family": 75, "longevity": 72 },
    "cp_type": "str:如「损友型」「知己型」「铁哥们型」「酒肉朋友型」"
  }
}

${baseRules}
3. 场景要接地气：聊天、吃饭、借钱、帮忙搬家、一起开黑、合租生活、微信群互动`;
  }

  if (relationType === '同事') {
    return `## 任务
把所有分析汇总一下，给用户一份接地气的同事关系合盘总结。
用大白话告诉ta们：合不合作得来、怎么配合、要注意什么。

## 报告结构

### 1. 一句话总结（20-30字）
开门见山，一句话说清楚你们这对同事是什么情况。
比如：「配合效率高，但意见不合时容易僵住」

### 2. 你们的优势（3-5点）
列出最能配合的地方，每点 40-60 字，举个具体场景。

### 3. 需要注意的地方（3-5点）
列出可能有摩擦的地方，每点 40-60 字，给解决思路。
场景：分工不均、抢功劳、开会起冲突、项目压力大。

### 4. 相处建议（5-7条）
每条 25-40 字，具体可操作。

### 5. 最后想说的话（60-100字）

## 输出格式
{
  "headline": {
    "verdict": "str:一句话总结（20-30字）",
    "match_level": "str:如「黄金搭档」「还行」「需磨合」「得看场合」"
  },
  "strengths": [
    { "point": "str:优势点", "detail": "str:40-60字说明", "example": "str:场景举例" }
  ],
  "watch_outs": [
    { "point": "str:注意点", "issue": "str:30-40字说明", "solution": "str:20-30字解决思路" }
  ],
  "tips": [
    { "category": "str:如「分工」「沟通」「开会」「利益」", "tip": "str:25-40字建议" }
  ],
  "closing": { "message": "str:60-100字" },
  "scores": {
    "overall": 73,
    "breakdown": { "chemistry": 80, "communication": 70, "lifestyle": 65, "family": 75, "longevity": 72 },
    "cp_type": "str:如「黄金搭档型」「互补型」「各干各的型」"
  }
}

${baseRules}
3. 场景要接地气：做项目、开会、意见不合、抢资源、工作交接、996加班、KPI分配、请吃饭拉关系`;
  }

  if (relationType === '家人') {
    return `## 任务
把所有分析汇总一下，给用户一份接地气的家人关系合盘总结。
用大白话告诉ta们：相处怎么样、怎么更好地当家人、要注意什么。

## 报告结构

### 1. 一句话总结（20-30字）
开门见山，一句话说清楚你们这对家人是什么情况。
比如：「感情是有的，但沟通方式得换换」

### 2. 你们的优势（3-5点）
列出相处最融洽的地方，每点 40-60 字，举个具体场景。

### 3. 需要注意的地方（3-5点）
列出可能有摩擦的地方，每点 40-60 字，给解决思路。
场景：管太多、不理解、聊不到一块、观念冲突。

### 4. 相处建议（5-7条）
每条 25-40 字，具体可操作。

### 5. 最后想说的话（60-100字）

## 输出格式
{
  "headline": {
    "verdict": "str:一句话总结（20-30字）",
    "match_level": "str:如「相处融洽」「还行」「需要调整」「有点难」"
  },
  "strengths": [
    { "point": "str:优势点", "detail": "str:40-60字说明", "example": "str:场景举例" }
  ],
  "watch_outs": [
    { "point": "str:注意点", "issue": "str:30-40字说明", "solution": "str:20-30字解决思路" }
  ],
  "tips": [
    { "category": "str:如「沟通」「边界」「支持」「理解」", "tip": "str:25-40字建议" }
  ],
  "closing": { "message": "str:60-100字" },
  "scores": {
    "overall": 73,
    "breakdown": { "chemistry": 80, "communication": 70, "lifestyle": 65, "family": 75, "longevity": 72 },
    "cp_type": "str:如「知心型」「操心型」「各过各的型」「相互尊重型」"
  }
}

${baseRules}
3. 场景要接地气：吃饭聊天、管教问题、人生选择、催婚催生、节日团聚、赡养老人、教育观念、兄弟姐妹关系`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
把所有分析汇总一下，给用户一份接地气的合盘总结。
用大白话告诉ta们：合不合适、怎么相处、要注意什么。

## 报告结构

### 1. 一句话总结（20-30字）
开门见山，一句话说清楚你们这对是什么情况。
比如：「来电是来电的，但得多磨合，特别是消费观」

### 2. 你们的优势（3-5点）
列出最合拍的地方，每点 40-60 字，举个具体场景。

### 3. 需要注意的地方（3-5点）
列出可能有摩擦的地方，每点 40-60 字，给解决思路。
场景要接地气：吵架、过节、见家长、花钱。

### 4. 相处建议（5-7条）
每条 25-40 字：
- 吵架了怎么和好
- 怎么沟通比较顺
- 家庭关系怎么处理
- 长期相处要注意什么

### 5. 最后想说的话（60-100字）
以一个过来人的身份，给点真诚的建议和祝福。

## 输出格式
{
  "headline": {
    "verdict": "str:一句话总结（20-30字）",
    "match_level": "str:如「挺合适」「凑合」「有点难」「需要努力」"
  },
  "strengths": [
    { "point": "str:优势点", "detail": "str:40-60字说明", "example": "str:场景举例" }
  ],
  "watch_outs": [
    { "point": "str:注意点", "issue": "str:30-40字说明", "solution": "str:20-30字解决思路" }
  ],
  "tips": [
    { "category": "str:如「沟通」「吵架」「家庭」「金钱」「日常」", "tip": "str:25-40字建议" }
  ],
  "closing": { "message": "str:60-100字" },
  "scores": {
    "overall": 73,
    "breakdown": { "chemistry": 80, "communication": 70, "lifestyle": 65, "family": 55, "longevity": 75 },
    "cp_type": "str:如「踏实过日子型」「甜蜜恋爱型」「相互成长型」「激情碰撞型」"
  }
}

${baseRules}
3. 场景要接地气：过年回谁家、彩礼、婆媳、房子、孩子、异地恋、996加班没空陪、房贷怎么分、一起点外卖、帮抢演唱会票
4. 总结里可以用 CP 向的表达（如"这对CP的看点是…""磕到了"），让年轻用户觉得有趣`;
}

export const synastryComprehensiveReportPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-comprehensive-report',
    version: '2.0',
    module: 'synastry',
    priority: 'P1',
    description: '合盘综合报告（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildReportSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const nameA = resolvePairName(ctx, 'nameA');
    const nameB = resolvePairName(ctx, 'nameB');
    const relationType = resolveRelationType(ctx);

    const parts: string[] = [`关系类型：${relationType}\n关系：${nameA} 和 ${nameB}`];

    if (ctx.natal_a_summary || ctx.natalASummary) {
      parts.push(`\n## ${nameA}是什么样的人
${ctx.natal_a_summary || ctx.natalASummary}`);
    }

    if (ctx.natal_b_summary || ctx.natalBSummary) {
      parts.push(`\n## ${nameB}是什么样的人
${ctx.natal_b_summary || ctx.natalBSummary}`);
    }

    if (ctx.synastry_summary || ctx.synastrySummary) {
      parts.push(`\n## 两人合不合适
${ctx.synastry_summary || ctx.synastrySummary}`);
    }

    if (ctx.composite_summary || ctx.compositeSummary) {
      parts.push(`\n## 在一起是什么样子
${ctx.composite_summary || ctx.compositeSummary}`);
    }

    if (ctx.scores) {
      parts.push(`\n## 各项评分参考
${JSON.stringify(ctx.scores)}`);
    }

    parts.push(`\n请基于以上分析，给一份接地气的${relationType}关系综合报告。`);

    return parts.join('\n');
  },
};

// 注册
registry.register(synastryComprehensiveReportPrompt);

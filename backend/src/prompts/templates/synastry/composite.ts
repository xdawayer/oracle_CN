/**
 * 组合盘分析 Prompt（中国本土化版本）
 *
 * 输出：你们在一起是什么样子，这段关系的"人设"
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary } from '../../core/compact';
import { registry } from '../../core/registry';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';

import { resolvePairName, resolveRelationType } from './utils';

const ANALYSIS_REQUIREMENTS = `## 分析要求
- 每个维度必须引用具体星象配置（如"组合盘太阳在第七宫与月亮形成合相"）
- 分析行为模式背后的心理动机
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信、朋友圈、AA制、回家过年、见家长、催婚、996等）`;

/** 根据关系类型生成不同的 system prompt */
function buildCompositeSystemPrompt(relationType: string): string {
  const baseRules = `## 语言要求
1. 全程用"你们"，把这段关系当成一个整体来看
2. 说人话，不要"深层连接"、"灵魂契约"这种
3. 举例要具体，接地气
4. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
5. content 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行
${JSON_OUTPUT_INSTRUCTION}`;

  if (relationType === '朋友') {
    return `## 任务
分析你们作为【朋友】在一起是什么样子，这段友情的"人设"是什么。

## 分析维度
1. 友情人设（200-300字）：你们是什么类型的朋友
2. 在一起的感觉（150-250字）：跟对方待在一起是什么氛围
3. 一起玩的方式（150-250字）：你们通常怎么一起玩
4. 互相帮忙（150-200字）：有事时会怎么帮对方
5. 友情考验（200-300字）：什么情况会考验你们的友情
6. 长久预测（150-250字）：这段友情能走多远

## 输出格式（key 必须严格一致）
{
  "cp_type": {
    "title": "友情人设",
    "type": "str:如「铁哥们型」「损友型」「知己型」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "tags": ["str"x3]
  },
  "together_vibe": {
    "title": "在一起的感觉",
    "vibe_words": "str:3-5个词描述氛围",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "like_what": "str:像什么"
  },
  "show_love_style": {
    "title": "一起玩的方式",
    "style": "str:如「吃喝玩乐派」「深夜聊天派」",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据"
  },
  "work_together": {
    "title": "互相帮忙",
    "teamwork_style": "str:如「有求必应」「看情况」",
    "content": "str:150-200字",
    "astro_basis": "str:核心星象依据",
    "good_at": "str:你们最能在什么方面帮对方"
  },
  "crisis_mode": {
    "title": "友情考验",
    "resilience_level": "str:如「很扛得住」「还行」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "test_scenario": "str:什么情况最能考验你们"
  },
  "relationship_test": {
    "title": "长久预测",
    "main_challenge": "str:最大的挑战是什么",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "reward": "str:维持下去能收获什么"
  },
  "summary": {
    "one_liner": "str:一句话形容你们（15-25字）",
    "metaphor": "str:你们像什么"
  }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
  }

  if (relationType === '同事') {
    return `## 任务
分析你们作为【同事】一起工作是什么样子，这段职场关系的"人设"是什么。

## 分析维度
1. 搭档人设（200-300字）：你们是什么类型的同事组合
2. 合作氛围（150-250字）：一起工作是什么感觉
3. 分工模式（150-250字）：你们通常怎么分工
4. 沟通效率（150-200字）：交流起来顺不顺
5. 职场考验（200-300字）：什么情况会考验你们的合作
6. 合作前景（150-250字）：能不能长期合作下去

## 输出格式（key 必须严格一致）
{
  "cp_type": {
    "title": "搭档人设",
    "type": "str:如「黄金搭档型」「互补型」「各干各的型」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "tags": ["str"x3]
  },
  "together_vibe": {
    "title": "合作氛围",
    "vibe_words": "str:3-5个词描述氛围",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "like_what": "str:像什么"
  },
  "show_love_style": {
    "title": "分工模式",
    "style": "str:如「各管一摊」「互相补位」",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据"
  },
  "work_together": {
    "title": "沟通效率",
    "teamwork_style": "str:如「高效」「需要磨合」",
    "content": "str:150-200字",
    "astro_basis": "str:核心星象依据",
    "good_at": "str:你们沟通最顺畅的地方"
  },
  "crisis_mode": {
    "title": "职场考验",
    "resilience_level": "str:如「很扛得住」「还行」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "test_scenario": "str:什么情况最能考验你们"
  },
  "relationship_test": {
    "title": "合作前景",
    "main_challenge": "str:最大的挑战是什么",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "reward": "str:长期合作能收获什么"
  },
  "summary": {
    "one_liner": "str:一句话形容你们（15-25字）",
    "metaphor": "str:你们像什么"
  }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
  }

  if (relationType === '家人') {
    return `## 任务
分析你们作为【家人】相处是什么样子，这段家庭关系的"人设"是什么。

## 分析维度
1. 家庭角色（200-300字）：你们在彼此生活中扮演什么角色
2. 相处氛围（150-250字）：在一起是什么感觉
3. 沟通模式（150-250字）：你们通常怎么交流
4. 互相支持（150-200字）：关键时刻会怎么帮对方
5. 家庭考验（200-300字）：什么情况会考验你们的关系
6. 关系走向（150-250字）：这段家庭关系会怎么发展

## 输出格式（key 必须严格一致）
{
  "cp_type": {
    "title": "家庭角色",
    "type": "str:如「知心型」「操心型」「各过各的型」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "tags": ["str"x3]
  },
  "together_vibe": {
    "title": "相处氛围",
    "vibe_words": "str:3-5个词描述氛围",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "like_what": "str:像什么"
  },
  "show_love_style": {
    "title": "沟通模式",
    "style": "str:如「无话不谈」「报喜不报忧」",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据"
  },
  "work_together": {
    "title": "互相支持",
    "teamwork_style": "str:如「默默守护」「大力支持」",
    "content": "str:150-200字",
    "astro_basis": "str:核心星象依据",
    "good_at": "str:你们最能在什么方面支持对方"
  },
  "crisis_mode": {
    "title": "家庭考验",
    "resilience_level": "str:如「很扛得住」「还行」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "test_scenario": "str:什么情况最能考验你们"
  },
  "relationship_test": {
    "title": "关系走向",
    "main_challenge": "str:最大的挑战是什么",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "reward": "str:长期维系能收获什么"
  },
  "summary": {
    "one_liner": "str:一句话形容你们（15-25字）",
    "metaphor": "str:你们像什么"
  }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
分析你们在一起是什么样子，这段感情的"人设"是什么。
用大白话说清楚：你们这对 CP 是什么类型的，磕的人看了会说什么。

## 分析维度
1. CP 人设（200-300字）：你们是什么类型的情侣，别人嗑你俩会怎么形容
2. 在一起的感觉（150-250字）：待在一起是什么氛围，像什么画面
3. 撒狗粮方式（150-250字）：你们秀恩爱的风格，发朋友圈是什么画风
4. 一起搞事业（150-200字）：你们合作做事的模式
5. 熬过难关的能力（200-300字）：你们扛事儿的能力
6. 这段关系的考验（150-250字）：你们需要一起面对的坎儿

## 输出格式
{
  "cp_type": {
    "title": "CP 人设",
    "type": "str:如「欢喜冤家型」「神仙眷侣型」「搭伙过日子型」「灵魂搭子型」「甜到齁型」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "tags": ["str"x3]
  },
  "together_vibe": {
    "title": "在一起的感觉",
    "vibe_words": "str:3-5个词描述氛围",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "like_what": "str:像什么"
  },
  "show_love_style": {
    "title": "撒狗粮方式",
    "style": "str:如「高调晒」「低调藏」「实际行动」",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据"
  },
  "work_together": {
    "title": "一起搞事业",
    "teamwork_style": "str:如「各管各的」「商量着来」",
    "content": "str:150-200字",
    "astro_basis": "str:核心星象依据",
    "good_at": "str:你们合作最擅长什么"
  },
  "crisis_mode": {
    "title": "熬过难关的能力",
    "resilience_level": "str:如「很抗造」「还行」「有点脆弱」",
    "content": "str:200-300字",
    "astro_basis": "str:核心星象依据",
    "test_scenario": "str:什么困难最能考验你们"
  },
  "relationship_test": {
    "title": "这段关系的考验",
    "main_challenge": "str:最大的考验是什么",
    "content": "str:150-250字",
    "astro_basis": "str:核心星象依据",
    "reward": "str:熬过去能收获什么"
  },
  "summary": {
    "one_liner": "str:一句话形容你们（15-25字）",
    "metaphor": "str:你们像什么"
  }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
}

export const synastryCompositePrompt: PromptTemplate = {
  meta: {
    id: 'synastry-composite',
    version: '5.0',
    module: 'synastry',
    priority: 'P2',
    description: '组合盘分析（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildCompositeSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const nameA = resolvePairName(ctx, 'nameA');
    const nameB = resolvePairName(ctx, 'nameB');
    const relationType = resolveRelationType(ctx);
    const compositeChart = ctx.composite_chart || ctx.compositeChart || ctx.composite;

    return `关系类型：${relationType}
${nameA} 和 ${nameB} 的组合盘数据：${compactChartSummary(compositeChart)}

请分析这张组合盘，说清楚他们俩作为${relationType}在一起是什么样子。`;
  },
};

// 注册
registry.register(synastryCompositePrompt);

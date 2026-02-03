/**
 * 合盘行动计划 Prompt
 *
 * 输出：关系改善的具体行动计划
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';
import { resolveRelationType } from './utils';

/** 根据关系类型生成行动计划 system prompt */
function buildActionPlanSystemPrompt(relationType: string): string {
  const baseStructure = `## 输出格式 (JSON)
{
  "relationship_goal": {
    "current_state": "当前关系状态简述，一句话",
    "desired_state": "期望达到的状态，一句话",
    "main_obstacle": "主要障碍是什么"
  },
  "30_day_plan": {
    "week1": {
      "theme": "第一周主题",
      "focus": "重点关注什么",
      "daily_action": "每天可以做的小事",
      "weekly_milestone": "周末达成的小目标"
    },
    "week2": { "theme": "", "focus": "", "daily_action": "", "weekly_milestone": "" },
    "week3": { "theme": "", "focus": "", "daily_action": "", "weekly_milestone": "" },
    "week4": { "theme": "", "focus": "", "daily_action": "", "weekly_milestone": "" }
  },
  "communication_upgrades": [
    {
      "old_pattern": "旧的沟通模式",
      "new_pattern": "新的沟通方式",
      "script_example": "具体话术示例"
    }
  ],
  "rituals_to_establish": [
    {
      "name": "习惯名称",
      "frequency": "频率",
      "how": "怎么做",
      "why": "为什么这对你们有帮助"
    }
  ],
  "boundaries_to_set": [
    {
      "area": "需要设定边界的领域",
      "boundary": "具体边界是什么",
      "how_to_communicate": "如何沟通这个边界"
    }
  ],
  "success_indicators": [
    {
      "indicator": "成功指标",
      "how_to_measure": "如何衡量"
    }
  ]
}

## 行动计划原则
- 从小事开始，不要一上来就是"彻底改变"
- 平衡双方的付出，不是一方单方面努力
- 具体到可执行，不是"多沟通"这种空话
- 有可衡量的成果`;

  if (relationType === '朋友') {
    return `${baseStructure}

## 任务
基于合盘分析，为这对朋友设计一份具体可执行的友情经营计划。

## 示例行动
- 每周约一次饭局或活动，哪怕一起点个外卖视频吃也算
- 有心事第一时间找对方聊聊，做彼此的情绪搭子
- 遇到好机会想着拉对方一把（内推/拼单/好物分享）
- 定期组织一次两人都喜欢的活动（剧本杀/City Walk/一起打卡新店）
- 朋友圈互动不要只点赞要评论，偶尔发个专属对方的朋友圈

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '同事') {
    return `${baseStructure}

## 任务
基于合盘分析，为这对同事设计一份具体可执行的合作优化计划。

## 示例行动
- 每周做一次进度同步
- 遇到分歧先听完对方的理由
- 主动认领自己擅长的部分
- 有功劳大方分享
- 工作之余偶尔聊点轻松话题

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '家人') {
    return `${baseStructure}

## 任务
基于合盘分析，为这对家人设计一份具体可执行的关系改善计划。

## 示例行动
- 每周打一次电话聊聊近况
- 重要节日一起过
- 有不同意见时先说"我理解你的想法"
- 尊重对方的选择，少说"你应该"
- 关心对方但不越界

${JSON_OUTPUT_INSTRUCTION}`;
  }

  // 恋人/夫妻（默认）
  return `${baseStructure}

## 任务
基于合盘分析，为两人设计一份具体可执行的关系改善行动计划。

## 示例行动
- 每天出门前一个拥抱
- 每周一次不带手机的晚餐，点对方喜欢吃的外卖也行
- 吵完架当天必须把话说开，不行就微信语音先破冰
- 每月一次"关系复盘"，可以一起散步时聊
- 过年两边轮流，提前一个月商量好并买礼物

${JSON_OUTPUT_INSTRUCTION}`;
}

export const synastryActionPlanPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-action-plan',
    version: '3.0',
    module: 'synastry',
    priority: 'P2',
    description: '关系行动计划（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildActionPlanSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}
关系类型：${relationType}
当前困扰（如有）：${ctx.concern || '希望关系更好'}

请设计适合这段${relationType}关系的行动计划。`;
  },
};

// 注册
registry.register(synastryActionPlanPrompt);

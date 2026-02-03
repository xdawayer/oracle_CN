/**
 * 合盘成长任务 Prompt
 *
 * 输出：关系中的成长课题和练习
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';
import { resolveRelationType } from './utils';

/** 根据关系类型生成成长任务 system prompt */
function buildGrowthSystemPrompt(relationType: string): string {
  const baseOutput = `## 输出格式 (JSON)
{
  "relationship_lesson": {
    "theme": "这段关系的核心课题，4-6字",
    "description": "为什么这是你们的课题，80-100字",
    "source_aspects": ["相关的合盘相位"]
  },
  "individual_tasks": {
    "for_a": {
      "lesson": "A 在这段关系中要学习的，50-60字",
      "practice": "具体练习建议",
      "affirmation": "A 可以用的肯定语"
    },
    "for_b": {
      "lesson": "B 在这段关系中要学习的，50-60字",
      "practice": "具体练习建议",
      "affirmation": "B 可以用的肯定语"
    }
  },
  "pair_tasks": [
    {
      "name": "任务名称，3-5字",
      "description": "任务描述，40-50字",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "frequency": "建议频率（每周/每月等）",
      "benefit": "这个任务带来的好处"
    }
  ],
  "weekly_ritual": {
    "name": "周习惯名称",
    "how": "具体怎么做",
    "when": "什么时候做",
    "why": "为什么这对你们有帮助"
  },
  "growth_milestones": [
    {
      "milestone": "成长里程碑描述",
      "sign": "达成的信号是什么"
    }
  ]
}

## 任务设计原则
- 具体、可执行、有明确步骤
- 平衡双方的付出和收获
- 从小事开始，不要一上来就"深度沟通"
- 任务要有趣，不是布置作业`;

  if (relationType === '朋友') {
    return `## 任务
基于合盘分析，为这对朋友设计具体的友情成长课题和练习。

## 示例任务类型
- 交心类：每月约一次深聊，不聊八卦聊真心话
- 冒险类：一起尝试一件两人都没做过的事（剧本杀/攀岩/学做一道菜）
- 互助类：主动帮对方解决一个小问题（帮抢票/帮搬家/陪看病）
- 陪伴类：对方低谷时主动发一句"最近还好吗"，做对方的情绪搭子
- 边界类：学会拒绝不想做的事而不伤感情

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '同事') {
    return `## 任务
基于合盘分析，为这对同事设计具体的合作成长课题和练习。

## 示例任务类型
- 沟通类：每周做一次工作复盘，说说做得好和可以改的
- 信任类：主动把自己不擅长的部分交给对方
- 反馈类：学会"先肯定、再建议"的沟通方式
- 协作类：共同完成一个有挑战的项目
- 边界类：工作归工作，不把情绪带到合作中

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '家人') {
    return `## 任务
基于合盘分析，为这对家人设计具体的关系成长课题和练习。

## 示例任务类型
- 沟通类：每周聊一次天，不带说教只是听
- 理解类：试着站在对方的角度想一次
- 感恩类：说一件感谢对方的小事
- 边界类：学会"关心但不过问"
- 支持类：对方做决定时先问"你怎么想"而不是"你应该"

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
基于合盘分析，为两人的关系设计具体的成长任务和练习。

## 示例任务类型
- 沟通类：每周交换3个小秘密、关掉手机面对面聊20分钟
- 感恩类：每天发一条专属对方的微信，不是转发是自己的话
- 冒险类：每月一起做一件没做过的事（密室逃脱/做饭/City Walk新路线）
- 独处类：各自独处时间的安排，互不打扰但报平安
- 家庭类：一起商量过年怎么安排、提前一个月买好双方父母的礼物

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
}

export const synastryGrowthTaskPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-growth-task',
    version: '3.0',
    module: 'synastry',
    priority: 'P1',
    description: '合盘成长任务（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildGrowthSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}
关系类型：${relationType}

请设计适合这段${relationType}关系的成长任务。`;
  },
};

// 注册
registry.register(synastryGrowthTaskPrompt);

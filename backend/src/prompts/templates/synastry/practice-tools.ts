/**
 * 合盘实践工具 Prompt
 *
 * 输出：针对关系的具体练习工具
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';
import { resolveRelationType } from './utils';

/** 根据关系类型生成实践工具 system prompt */
function buildPracticeSystemPrompt(relationType: string): string {
  const baseOutput = `## 输出格式 (JSON)
{
  "connection_exercises": [
    {
      "name": "练习名称",
      "purpose": "目的",
      "duration": "所需时间",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "tips": "小贴士",
      "best_timing": "最佳时机（结合星象）"
    }
  ],
  "communication_tools": [
    {
      "name": "工具名称",
      "when_to_use": "什么时候用",
      "how_to_use": "怎么用",
      "example": "示例对话"
    }
  ],
  "conflict_resolution": {
    "cool_down_technique": {
      "name": "冷静技巧名称",
      "steps": ["步骤"]
    },
    "repair_conversation": {
      "opener": "开场白",
      "structure": "对话结构",
      "closer": "结束语"
    }
  },
  "bonding_activities": [
    {
      "name": "增进关系的活动",
      "level": "深度（轻度/中度/深度）",
      "description": "描述",
      "questions": ["可以聊的话题"]
    }
  ],
  "solo_practices": {
    "for_a": {
      "practice": "A 可以单独做的练习",
      "benefit": "对关系的好处"
    },
    "for_b": {
      "practice": "B 可以单独做的练习",
      "benefit": "对关系的好处"
    }
  },
  "weekly_check_in": {
    "questions": ["每周可以问彼此的问题"],
    "format": "建议的形式",
    "duration": "建议时长"
  }
}

## 练习设计原则
- 具体、可操作、有明确步骤
- 从轻松的开始，不要一上来就很沉重
- 结合星象特点设计
- 平衡两个人的参与度`;

  if (relationType === '朋友') {
    return `## 任务
为这对朋友提供一套实用的友情经营工具箱。

## 练习类型参考
- 深聊练习：互相问"你最近在烦什么"，做对方的树洞
- 信任练习：分享一件不好意思说的事
- 活动挑战：每月一起做一件新鲜事（密室逃脱/剧本杀/徒步/City Walk/一起做饭）
- 感恩练习：说一件对方帮过自己的事（帮抢票/陪看病/半夜陪聊）
- 边界练习：练习说"不"但不伤感情，学会"我今天不太想出门但不是针对你"

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '同事') {
    return `## 任务
为这对同事提供一套实用的合作提升工具箱。

## 练习类型参考
- 沟通练习：练习"先复述再回应"的沟通方式
- 反馈练习：用"我观察到…我建议…"的结构给反馈
- 协作练习：做一次分工复盘，看看怎么更高效
- 信任练习：主动把一个任务交给对方
- 减压练习：工作之余一起喝杯咖啡聊聊天

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '家人') {
    return `## 任务
为这对家人提供一套实用的关系改善工具箱。

## 练习类型参考
- 倾听练习：对方说话时放下手机认真听
- 理解练习：试着用对方的语言说一遍ta的想法
- 感恩练习：每周说一件感谢对方的小事
- 边界练习：练习"我关心你但我尊重你的选择"
- 陪伴练习：一起做一件轻松愉快的事（散步、做饭、看电影）

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
为两人提供一套实用的关系练习工具箱，包含具体的练习方法。

## 练习类型参考
- 身体连接：每天一个拥抱、一起散步/夜跑
- 情感连接：感恩分享、每天睡前说一件今天最开心的事
- 认知连接：一起看一部电影聊感受、聊聊对未来的想法
- 游戏连接：约会挑战（解锁城市新角落/一起做饭/密室逃脱）、给对方一个小惊喜
- 独处平衡：各自有独立的空间和爱好，互不打扰但随时在线

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
}

export const synastryPracticeToolsPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-practice-tools',
    version: '3.0',
    module: 'synastry',
    priority: 'P2',
    description: '关系实践工具（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildPracticeSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}
关系类型：${relationType}
关系阶段：${ctx.relationship_stage || '稳定期'}

请提供适合这段${relationType}关系的实践工具。`;
  },
};

// 注册
registry.register(synastryPracticeToolsPrompt);

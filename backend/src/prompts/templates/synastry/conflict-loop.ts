/**
 * 合盘冲突循环 Prompt
 *
 * 输出：关系中可能的冲突模式及化解方法
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { ASPECT_METAPHORS } from '../../cultural/metaphors';
import { registry } from '../../core/registry';
import { resolveRelationType } from './utils';

/** 根据关系类型生成冲突分析 system prompt */
function buildConflictSystemPrompt(relationType: string): string {
  const baseOutput = `## 输出格式 (JSON)
{
  "conflict_patterns": [
    {
      "name": "冲突模式名称，4-6字",
      "trigger": "触发因素，40-50字",
      "a_reaction": "A 的典型反应，30-40字",
      "b_reaction": "B 的典型反应，30-40字",
      "escalation": "如何升级的，40-50字",
      "source_aspects": ["相关相位"],
      "break_point": "打破循环的关键点"
    }
  ],
  "hot_buttons": {
    "for_a": ["A 的敏感按钮"],
    "for_b": ["B 的敏感按钮"],
    "mutual": ["双方共同的敏感点"]
  },
  "repair_toolkit": {
    "cool_down": {
      "method": "冷静下来的方法",
      "time_needed": "建议冷静时间"
    },
    "safe_word": "建议设定的暂停词",
    "reconnect_ritual": "重新连接的方式，具体步骤"
  },
  "reframe_scripts": [
    {
      "old_thought": "A 或 B 可能有的想法",
      "new_perspective": "换个角度看",
      "script": "可以对自己说的话"
    }
  ],
  "growth_opportunity": {
    "lesson": "这些冲突背后的成长机会，60-80字",
    "when_resolved": "当你们学会处理这些，会发生什么"
  }
}

## 紧张相位参考
- ${ASPECT_METAPHORS.square.zhCN}
- ${ASPECT_METAPHORS.opposition.zhCN}

## 写作要求
- 不评判谁对谁错
- 冲突是关系的一部分，目标不是消除，而是更好地处理
- 提供具体可行的工具，不是空洞的建议`;

  if (relationType === '朋友') {
    return `## 任务
分析这对朋友之间可能的摩擦模式，帮ta们识别问题并化解矛盾。

## 常见友情冲突类型
- 借钱纠纷：钱没还、催着尴尬
- 冷落循环：一方忙起来就不联系了、消息秒回变成不回
- 背后说话：听到对方在别的群里说自己、在别人面前吐槽自己
- 嫉妒心理：对方混得比自己好心里不舒服
- 价值观冲突：对同一件事看法完全不同

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '同事') {
    return `## 任务
分析这对同事之间可能的摩擦模式，帮ta们识别问题并改善合作。

## 常见职场冲突类型
- 分工不均：一方觉得自己干多了
- 抢功推责：出成绩了抢、出问题了推
- 沟通错位：一方觉得说清楚了另一方没get到
- 风格冲突：一个急性子一个慢性子
- 越级操作：该沟通的没沟通就自作主张

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  if (relationType === '家人') {
    return `## 任务
分析这对家人之间可能的摩擦模式，帮ta们识别问题并改善关系。

## 常见家庭冲突类型
- 管太多循环：一方管、另一方烦
- 沟通障碍：想关心但说出来像指责
- 期望落差：觉得对方应该懂我但没有
- 边界模糊：什么事都要过问
- 代际差异：两代人想法完全不同

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
分析合盘中潜在的冲突循环，帮助两人识别模式并打破僵局。

## 常见感情冲突类型
- 追逃循环：一方疯狂发消息、一方已读不回
- 互怼循环：谁也不服谁，吵着吵着就上头了
- 冷战循环：双方都等对方先低头，比谁更能憋
- 控制反叛循环：一方查手机管行踪、一方觉得窒息想跑
- 消费观冲突：双十一购物车清空 vs 一分钱掰两半花

${baseOutput}

${JSON_OUTPUT_INSTRUCTION}`;
}

export const synastryConflictLoopPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-conflict-loop',
    version: '3.0',
    module: 'synastry',
    priority: 'P1',
    description: '合盘冲突循环分析（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildConflictSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}
关系类型：${relationType}

请分析这段${relationType}关系中可能的冲突循环。`;
  },
};

// 注册
registry.register(synastryConflictLoopPrompt);

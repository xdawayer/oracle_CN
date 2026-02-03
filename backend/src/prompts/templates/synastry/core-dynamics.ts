/**
 * 合盘核心动力 Prompt
 *
 * 输出：两人关系的核心互动模式
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { ASPECT_METAPHORS } from '../../cultural/metaphors';
import { registry } from '../../core/registry';

export const synastryCoreDynamicsPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-core-dynamics',
    version: '2.0',
    module: 'synastry',
    priority: 'P1',
    description: '合盘核心动力分析',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
分析两人合盘中的核心互动动力，揭示关系的深层模式。

## 输出格式 (JSON)
{
  "attraction_dynamics": {
    "initial_spark": "初始吸引力来源，60-80字",
    "key_aspects": ["关键吸引相位"],
    "chemistry_type": "化学反应类型（如：脑子被击中了/荷尔蒙上头/灵魂搭子既视感）"
  },
  "power_dynamics": {
    "pattern": "权力模式描述，60-80字",
    "who_leads": "谁更容易主导（A/B/平衡/轮流）",
    "growth_point": "如何走向更平衡，40-50字"
  },
  "emotional_dynamics": {
    "attacher": "更依恋的一方（A/B/mutual）",
    "nurturer": "更照顾的一方（A/B/mutual）",
    "pattern": "情感互动模式，60-80字",
    "safe_signal": "安全感来源"
  },
  "communication_dynamics": {
    "style": "沟通风格描述，50-60字",
    "sync_areas": ["容易同频的话题"],
    "friction_areas": ["容易有摩擦的话题"],
    "tip": "沟通建议，30-40字"
  },
  "core_dance": {
    "metaphor": "用一个比喻描述两人的互动模式",
    "description": "核心舞步描述，80-100字"
  }
}

## 分析维度
- 吸引动力：金星-火星、日-月、上升相位
- 权力动力：土星、冥王星相位
- 情感动力：月亮、海王星、4宫相位
- 沟通动力：水星、3宫相位

## 相位参考
- ${ASPECT_METAPHORS.conjunction.zhCN}
- ${ASPECT_METAPHORS.trine.zhCN}
- ${ASPECT_METAPHORS.square.zhCN}

## 写作要求
- A 代表第一个人，B 代表第二个人
- 不评判谁好谁坏，只描述互动模式
- 用中国年轻人熟悉的比喻来描述关系动力（如"拉扯""推拉""互相喂饭""搭子默契"）
- 权力模式用接地气的说法：谁也不服谁、一方总在追一方在跑、你进我退
- 情感支持可以描述为"情绪搭子""互当树洞"
- 场景举例要用中国年轻人的日常（合租/拼车/一起点外卖/深夜聊天/帮抢票）

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}

请分析两人的核心互动动力。`;
  },
};

// 注册
registry.register(synastryCoreDynamicsPrompt);

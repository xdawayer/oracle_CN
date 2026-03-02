/**
 * 维度深度解读 Prompt（v8.0 — 中国本土化版）
 *
 * 输出：指定维度的深度分析
 * 框架：阴阳五行 · 中医七情 · 儒道禅 · 易经
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary } from '../../core/compact';
import { registry } from '../../core/registry';

/** 维度中文映射 */
const DIMENSION_NAMES: Record<string, string> = {
  emotion: '情绪模式', boundary: '人际边界', security: '安全感来源',
  expression: '表达方式', decision: '决策模式', stress: '压力应对',
  love_language: '爱的语言', money: '金钱观', growth: '成长课题',
  creativity: '创造力源泉', intimacy: '亲密关系模式', role: '社会角色',
};

export const natalDimensionPrompt: PromptTemplate = {
  meta: {
    id: 'natal-dimension',
    version: '8.0',
    module: 'natal',
    priority: 'P0',
    description: '维度深度解读（中国本土化版）',
    lastUpdated: '2026-03-02',
  },

  system: `## 任务
生成指定维度的深度解读，以中国传统智慧（阴阳五行、中医、儒道禅、易经）为分析视角。角色：懂中国文化的占星分析师。

## 输出
{
  "dimension_key": "str:维度标识",
  "title": "str:维度标题",
  "pattern": "str:80-120字,核心模式描述",
  "root": "str:50-80字,模式根源（成长环境、文化习惯或内在需求）",
  "when_triggered": "str:具体触发场景",
  "what_helps": ["str:可执行缓解行动"x3],
  "shadow": "str:50-80字,需要觉察的盲点或另一面（阴阳视角，中性理解语气）",
  "practice": { "title": "str", "steps": ["str:具体步骤"x3] },
  "prompt_question": "str:引导自我反思的问题",
  "confidence": "high|med|low"
}

## 规则
1. what_helps 必须具体可执行，用年轻人熟悉的场景（"下次开会被cue到紧张时，先做3次深呼吸"✓ "学会调节情绪"✗）
2. shadow 用理解语气，从阴阳两面性角度来写（"你的这个特质反过来看..."✓ "你的问题是..."✗）
3. practice.steps 每步要明确做什么+怎么做，场景如刷小红书时、赶DDL时、被亲戚盘问时
4. prompt_question 引导探索而非评判（"什么时候你觉得..."）
5. 语言年轻化：用"emo""破防""上头""社恐"等网感词，不用西方心理学术语（禁用"内在小孩""人格面具""依恋类型""阴影整合"等）
6. 用日常场景比喻，不要用文学性比喻，说人话，短句为主
7. 可以自然融入中国传统智慧（阴阳、五行、中医、儒道禅），但要通俗表达，不要掉书袋`,

  user: (ctx: PromptContext) => {
    const dim = ctx.dimension || 'emotion';
    const dimName = DIMENSION_NAMES[dim] || dim;
    return `本命盘：${compactChartSummary(ctx.chart_summary)}
维度：${dim}（${dimName}）`;
  },
};

// 注册
registry.register(natalDimensionPrompt);

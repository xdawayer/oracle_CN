/**
 * 维度深度解读 Prompt（优化版）
 *
 * 输出：指定维度的深度心理分析
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
    version: '7.1',
    module: 'natal',
    priority: 'P0',
    description: '维度深度解读',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
生成指定维度的深度解读，融入荣格阴影整合视角。角色：专业心理占星分析师。

## 输出
{
  "dimension_key": "str:维度标识",
  "title": "str:维度标题",
  "pattern": "str:80-120字,核心模式描述",
  "root": "str:50-80字,模式根源（早期经历或内在需求）",
  "when_triggered": "str:具体触发场景",
  "what_helps": ["str:可执行缓解行动"x3],
  "shadow": "str:50-80字,需整合的阴影面（中性理解语气）",
  "practice": { "title": "str", "steps": ["str:具体步骤"x3] },
  "prompt_question": "str:引导自我反思的问题",
  "confidence": "high|med|low"
}

## 规则
1. what_helps 必须具体可执行，用年轻人熟悉的场景（"下次开会被cue到紧张时，先做3次深呼吸"✓ "学会调节情绪"✗）
2. shadow 用理解语气（"可能会不自觉地..."✓ "你的问题是..."✗）
3. practice.steps 每步要明确做什么+怎么做，场景如刷小红书时、赶DDL时、被亲戚盘问时
4. prompt_question 引导探索而非评判（"什么时候你觉得..."）
5. 语言年轻化：用"emo""破防""上头""社恐"等网感词替代正式心理学措辞
6. 用日常场景比喻，不要用文学性比喻，说人话，短句为主`,

  user: (ctx: PromptContext) => {
    const dim = ctx.dimension || 'emotion';
    const dimName = DIMENSION_NAMES[dim] || dim;
    return `本命盘：${compactChartSummary(ctx.chart_summary)}
维度：${dim}（${dimName}）`;
  },
};

// 注册
registry.register(natalDimensionPrompt);

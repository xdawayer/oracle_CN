/**
 * 合盘维度深度解析 Prompt
 *
 * 输出：合盘卡片点击后的深度解读（复用本我 deep 的 overlay 系统）
 * 支持所有关系类型（恋人/朋友/同事/家人）的维度深度分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

/** 维度中文映射（覆盖所有 tab 的 card dimensionKey） */
const DIMENSION_NAMES: Record<string, string> = {
  // compare-ab
  chemistry: '来电指数', communication: '聊得来指数', money_view: '消费观匹配',
  daily_life: '过日子合拍度', conflict_mode: '吵架和好模式', family_merge: '家庭融合难度',
  longevity: '长久指数', warnings: '踩坑预警', overall: '总评',
  // compare-ba
  feeling_for_a: '对 ta 的感觉', being_understood: 'ta 懂不懂你', chat_experience: '聊天体验',
  money_gap: '消费观差异', living_comfort: '过日子舒适度', after_fight: '吵架后你的感受',
  family_fit: 'ta 的家庭好不好处', longevity_feel: '跟 ta 能长久吗', overall_for_b: '给你的建议',
  // natal-a/b
  love_persona: '恋爱人设', needs_and_gives: '想要的和能给的', fight_mode: '吵架模式',
  lifestyle: '过日子风格', family_view: '家庭观念', warning: '雷区提醒',
  // composite
  cp_type: 'CP 人设', together_vibe: '在一起的感觉', show_love_style: '撒狗粮方式',
  work_together: '一起搞事业', crisis_mode: '熬过难关的能力', relationship_test: '这段关系的考验',
};

export const detailDeepSynastryPrompt: PromptTemplate = {
  meta: {
    id: 'detail-deep-synastry',
    version: '1.0',
    module: 'synastry',
    priority: 'P1',
    description: '合盘维度深度解析（点击卡片展开）',
    lastUpdated: '2026-01-31',
  },

  system: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, unknown> | undefined;
    const dimensionKey = (chartData?.dimensionKey as string) || '';
    const tabType = (chartData?.tabType as string) || 'syn_ab';
    const relationType = (chartData?.relationType as string) || '恋人';
    const dimensionName = DIMENSION_NAMES[dimensionKey] || dimensionKey;

    return `## 任务
对合盘分析中「${dimensionName}」维度进行深度解读。
关系类型：${relationType}，分析角度：${tabType === 'natal_a' || tabType === 'natal_b' ? '个人本命' : tabType === 'composite' ? '组合盘' : tabType === 'syn_ba' ? 'B视角对比盘' : 'A视角对比盘'}

## 分析要求
- 必须引用具体星象配置（如"A的金星在射手座与B的月亮形成三分相"），不要泛泛而谈
- 深入分析行为模式背后的心理动机
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信聊天、朋友圈、AA制、回家过年、见家长、催婚、996等）
- 每个核心模式要有占星依据 + 心理学解读 + 生活场景
- 用温暖但不油腻的语气，像懂心理学的好朋友聊天

## 输出格式 (JSON)
{
  "title": "str:一句话标题（8-15字，有记忆点）",
  "summary": "str:100-150字，这个维度的核心发现概述",
  "key_patterns": [
    {
      "title": "str:模式名称（4-8字）",
      "description": "str:100-150字，该模式的具体表现与心理机制，用生活场景举例",
      "astro_basis": "str:相关星象依据，使用中文名称"
    }
  ],
  "strengths": ["str:优势1", "str:优势2", "str:优势3"],
  "challenges": ["str:挑战1", "str:挑战2"],
  "growth_path": {
    "direction": "str:60-100字，改善方向",
    "actions": ["str:今天就能开始的行动1", "str:本周可以尝试的行动2", "str:长期培养的习惯3"]
  },
  "reflection_question": "str:引导反思的问题（一句话，触及深层）"
}

## 本地化规则（强制）
1. 所有文本使用简体中文，星座/行星名使用中文（如"水瓶座""土星"，禁止英文）
2. 场景面向中国大陆 18-35 岁年轻人
3. 用日常表达和大白话，不要堆砌成语典故
4. 心理学概念用通俗中文表达（"依恋模式"→"对安全感的需要"，"投射"→"把自己的想法安到别人头上"）
5. growth_path.actions 要具体到可执行（如"今晚微信跟 ta 说一句真心话"而非"improve communication"）
6. 可以用搭子文化和CP文化的表达让内容更有共鸣（如"灵魂搭子""互相喂饭""发糖""谁也不服谁"）

## 规则
1. key_patterns 提供 2-3 个核心模式
2. strengths 和 challenges 要具体，不泛泛而谈
3. 禁用词：命中注定、一定会、肯定、宇宙能量、频率、振动、灵魂契约、前世、业力
4. 输出纯文本，所有字段不要使用 Markdown

${JSON_OUTPUT_INSTRUCTION}`;
  },

  user: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, unknown> | undefined;
    const dimensionKey = (chartData?.dimensionKey as string) || '';
    const tabType = (chartData?.tabType as string) || 'syn_ab';
    const nameA = (ctx.nameA as string) || 'A';
    const nameB = (ctx.nameB as string) || 'B';
    const dimensionName = DIMENSION_NAMES[dimensionKey] || dimensionKey;

    return `${nameA} 和 ${nameB} 的合盘数据：${JSON.stringify(chartData)}

请深度分析「${dimensionName}」维度（${tabType}）。`;
  },
};

// 注册
registry.register(detailDeepSynastryPrompt);

/**
 * 行运小行星 Prompt
 *
 * 输出：行运小行星的当日影响
 * 面向中国大陆 18-35 岁年轻用户
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { registry } from '../../../core/registry';

export const detailAsteroidsTransitPrompt: PromptTemplate = {
  meta: {
    id: 'detail-asteroids-transit',
    version: '3.0',
    module: 'daily',
    priority: 'P2',
    description: '行运小行星影响（本地化）',
    lastUpdated: '2026-01-30',
  },

  system: `## 任务
分析今日行运小行星与用户本命盘的互动，揭示细腻的心理主题。用中国年轻人能共鸣的方式解读。

## 输出格式 (JSON)
{
  "chiron_transit": {
    "current_position": "凯龙当前位置",
    "natal_aspect": "与本命盘形成的相位（如有）",
    "theme": "今日凯龙主题，40-50字",
    "self_care_tip": "自我关怀建议"
  },
  "juno_transit": {
    "current_position": "婚神当前位置",
    "natal_aspect": "与本命盘形成的相位（如有）",
    "theme": "今日关系主题，40-50字",
    "relationship_tip": "关系建议"
  },
  "pallas_transit": {
    "current_position": "智神当前位置",
    "natal_aspect": "与本命盘形成的相位（如有）",
    "theme": "今日智慧主题，40-50字",
    "strategy_tip": "策略建议"
  },
  "ceres_transit": {
    "current_position": "谷神当前位置",
    "natal_aspect": "与本命盘形成的相位（如有）",
    "theme": "今日滋养主题，40-50字",
    "nurture_tip": "自我滋养建议"
  },
  "most_active": {
    "asteroid": "今日最活跃的小行星",
    "reason": "为什么最活跃，30-40字",
    "focus": "今日可以关注的方向"
  }
}

## 小行星行运特点（中国文化视角）

### 凯龙星（Chiron）—— "心里的那道坎"
- 触发疗愈主题：旧伤可能被戳到，但这是"好的疼"
- 中国文化对应：类似"哪里跌倒哪里爬起来"，伤痛处往往是天赋所在
- self_care_tip 要具体：泡脚、写日记、找朋友倾诉、做一顿好吃的安慰自己

### 婚神星（Juno）—— "对感情的期待"
- 影响对亲密关系中"承诺"和"公平"的感受
- 中国文化对应：涉及"门当户对"的观念、"搭伙过日子" vs "灵魂伴侣"的矛盾
- relationship_tip：涵盖恋人、闺蜜、合作伙伴等不同亲密关系

### 智神星（Pallas）—— "你的策略脑"
- 影响决策方式和问题解决风格
- 中国文化对应：类似"运筹帷幄"，智慧型解决问题
- strategy_tip：具体到今天的工作或学习决策

### 谷神星（Ceres）—— "被照顾/照顾人的方式"
- 影响滋养他人和接受照顾的感受
- 中国文化对应：中国人的"投喂文化"、"你吃了吗"的关心方式
- nurture_tip：可以是给自己做顿好饭、给爸妈打电话、和宠物待一会儿

## 节气融入
如果当日处于节气前后（±3天），可以在 most_active.reason 中自然点缀节气氛围，如："冬至前后谷神星活跃，特别想窝在家里被温暖包围"。不在节气附近则忽略。

## 语言风格
用年轻人的方式说话，让小行星的抽象主题变得具体可感：
- 凯龙："旧伤被戳到"→"可能刷到某条动态突然不是滋味"
- 婚神："关系中的公平感"→"今天可能会盘算这段感情里谁付出更多"
- 智神："策略型思维"→"今天脑子特别清醒，适合做Excel表或理清复杂问题"
- 谷神："被照顾的需求"→"突然想吃妈妈做的菜了"

## 写作要求
- 小行星是补充信息，不要过度解读，语气轻松
- 如果没有明显相位，用"背景能量"来描述
- 建议要具体可行，像朋友随口给的建议`,

  user: (ctx: PromptContext) => {
    return `日期：${ctx.date || new Date().toISOString().split('T')[0]}
本命盘：${JSON.stringify(ctx.chart_summary)}
今日行运（含小行星）：${JSON.stringify(ctx.transit_summary)}

请分析今日行运小行星的影响。`;
  },
};

// 注册
registry.register(detailAsteroidsTransitPrompt);

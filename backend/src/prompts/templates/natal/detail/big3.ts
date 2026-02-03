/**
 * Big3 核心人格解读 Prompt（v4.1 — 深度本地化版）
 *
 * 输出：太阳/月亮/上升的结构化深度解读
 * 注入：行星隐喻、宫位含义、荣格心理学、依恋理论、中国生活场景
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../../instructions/output-format';
import { PLANET_METAPHORS } from '../../../cultural/metaphors';
import { HOUSE_METAPHORS } from '../../../cultural/metaphors/houses';
import { JUNGIAN_CONCEPTS, ATTACHMENT_STYLES } from '../../../cultural/psychology';
import { registry } from '../../../core/registry';

/** 目标中文名映射 */
const TARGET_NAMES: Record<string, string> = {
  sun: '太阳',
  moon: '月亮',
  rising: '上升',
};

/** 构建行星隐喻上下文 */
function buildPlanetContext(target: string): string {
  const meta = PLANET_METAPHORS[target === 'rising' ? 'sun' : target];
  if (!meta) return '';
  return `## ${meta.name}的心理学含义
- 中文意象：${meta.zhCN}
- 核心含义：${meta.description}
- 比喻：${meta.metaphor}
- 引导问题：${meta.questions.map(q => `「${q}」`).join(' ')}`;
}

/** 构建宫位上下文 */
function buildHouseContext(house: number | undefined): string {
  if (!house) return '';
  const meta = HOUSE_METAPHORS[house];
  if (!meta) return '';
  return `## 所在宫位的含义
${meta.name}（${meta.zhCN}）：${meta.description}
解读时需要结合宫位含义，说明这颗星在这个"生活领域"如何运作。`;
}

/** 构建心理学概念参考 */
function buildPsychologyContext(target: string): string {
  if (target === 'sun') {
    return `## 可参考的心理学概念
- ${JUNGIAN_CONCEPTS.individuation.zhCN}：${JUNGIAN_CONCEPTS.individuation.explanation}
- ${JUNGIAN_CONCEPTS.inner_critic.zhCN}：${JUNGIAN_CONCEPTS.inner_critic.explanation}
在太阳解读中，关注"活出自己"与"内在批评家"的张力。`;
  }
  if (target === 'moon') {
    return `## 可参考的心理学概念
- ${JUNGIAN_CONCEPTS.inner_child.zhCN}：${JUNGIAN_CONCEPTS.inner_child.explanation}
- ${JUNGIAN_CONCEPTS.shadow.zhCN}：${JUNGIAN_CONCEPTS.shadow.explanation}

## 依恋理论参考
月亮星座深刻影响依恋模式，解读时可参考：
- ${ATTACHMENT_STYLES.secure.zhCN}：${ATTACHMENT_STYLES.secure.description}
- ${ATTACHMENT_STYLES.anxious.zhCN}：${ATTACHMENT_STYLES.anxious.description}
- ${ATTACHMENT_STYLES.avoidant.zhCN}：${ATTACHMENT_STYLES.avoidant.description}
根据月亮星座特质判断倾向哪种模式，但不要直接"贴标签"，而是描述行为特征。`;
  }
  // rising
  return `## 可参考的心理学概念
- ${JUNGIAN_CONCEPTS.persona.zhCN}：${JUNGIAN_CONCEPTS.persona.explanation}
- ${JUNGIAN_CONCEPTS.anima_animus.zhCN}：${JUNGIAN_CONCEPTS.anima_animus.explanation}
在上升解读中，重点探讨"面具"与"真我"的关系。`;
}

/** 各目标的分析侧重 */
const TARGET_FOCUS: Record<string, string> = {
  sun: `## 太阳分析侧重
- **summary**：直接说结论，点明太阳星座的核心身份认同，用日常场景让人秒懂
- **key_patterns**：围绕"核心驱动力""工作风格""社交人格"三个维度，每个模式要联系宫位，语言年轻化（"天生的大佬气场"✓ "具有领导力"✗）
- **life_scenarios**：用中国年轻人能秒懂的场景，如：被领导cue到即兴发言、赶DDL时的状态、周五下班后的第一件事、刷小红书时被种草的类型
- **growth_path**：关于如何更好地"活出自己"，行动要具体到日常可执行`,
  moon: `## 月亮分析侧重
- **summary**：直接说结论，点明情绪底色，用日常场景让人秒懂
- **key_patterns**：围绕"情绪模式""安全感来源""内在需求"三个维度，结合依恋理论，语言年轻化（"情绪过山车选手"✓ "情绪容易波动"✗）
- **life_scenarios**：用中国年轻人能秒懂的场景，如：深夜刷小红书emo的瞬间、和对象冷战后疯狂翻聊天记录、被父母一句话直接破防、压力大时点一杯奶茶续命
- **growth_path**：关于如何滋养"内在小孩"、建立情绪安全感，行动要温和可执行`,
  rising: `## 上升分析侧重
- **summary**：直接说结论，点明外在人格面具，用日常场景让人秒懂
- **key_patterns**：围绕"第一印象""社会角色""面具与真我的张力"三个维度，语言年轻化（"人前显贵人后受罪"式反差感）
- **life_scenarios**：用中国年轻人能秒懂的场景，如：面试时硬撑的人设、初次约会的"精装修"状态、团建被迫营业、朋友圈精心凹的人设、过年被亲戚盘问时的标准答案
- **growth_path**：关于如何整合面具与真我，找到舒适的社会定位`,
};

export const detailBig3NatalPrompt: PromptTemplate = {
  meta: {
    id: 'detail-big3-natal',
    version: '4.2',
    module: 'natal',
    priority: 'P0',
    description: 'Big3 核心人格解读（深度本地化版）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, any> | undefined;
    const target = (chartData?.target as string) || 'sun';
    const targetName = TARGET_NAMES[target] || '太阳';
    const focus = TARGET_FOCUS[target] || TARGET_FOCUS.sun;
    const house = chartData?.house as number | undefined;

    const planetCtx = buildPlanetContext(target);
    const houseCtx = buildHouseContext(house);
    const psychCtx = buildPsychologyContext(target);

    return `## 任务
根据用户星盘数据，为${targetName}星座生成结构化深度解读，揭示核心人格模式与成长方向。
解读面向中国大陆 18-35 岁年轻人，内容必须贴合本土文化与生活经验。

${planetCtx}

${houseCtx}

${psychCtx}

## 输出格式 (JSON)
{
  "title": "一句话标题（6-12字，直白有记忆点，像朋友给你起的外号）",
  "sign": "星座中文名称",
  "house": 宫位数字,
  "summary": "40-60字，用大白话说清楚这颗星让你成为什么样的人，一句话点明核心特质+一句话说清楚在生活中的表现",
  "key_patterns": [
    {
      "title": "模式名称（3-6字，口语化）",
      "description": "40-60字，直接说这个模式怎么回事、什么时候会出现、具体是什么感觉",
      "astro_basis": "星象依据（简短，如太阳水瓶4宫）"
    }
  ],
  "strengths": ["天赋优势1（口语短句）", "天赋优势2", "天赋优势3"],
  "challenges": ["成长挑战1（口语短句）", "成长挑战2"],
  "life_scenarios": ["一句话描述具体场景1", "一句话描述具体场景2", "一句话描述具体场景3"],
  "growth_path": {
    "direction": "30-50字，直接说可以怎么做，别讲道理",
    "actions": ["今天就能开始的行动1", "本周可以尝试的行动2", "长期培养的习惯3"]
  },
  "reflection_question": "引导自我反思的问题（一句话，用你的口吻）"
}

${focus}

## 本地化规则（强制）
1. 所有文本使用简体中文，星座/行星名使用中文（如"水瓶座""土星"，禁止出现 Aquarius/Saturn）
2. life_scenarios 必须是中国年轻人能产生共鸣的场景（涉及职场、社交、家庭、情感等），避免西方文化特有场景
3. 比喻用日常生活的（奶茶、外卖、刷手机、上班通勤），不要用文学性的（水晶、星河、宇宙）
4. 心理学概念用通俗中文表达，不使用英文术语
5. growth_path.actions 要具体到中国年轻人的日常（如"周末找一家安静的咖啡馆独处两小时"而非"practice meditation"）

## 写作风格
- 说人话，短句为主。禁止古风文艺腔、比喻堆砌。一段话最多一个比喻。
- 语气像懂心理学的闺蜜/好哥们聊天，善用网感词汇（"拉满""上头""破防""DNA动了""社恐实锤"等）
- 先结论后解释，用"比如..."举例
- 指出模式也指出转化方法
- 输出纯文本，所有字段不要使用 Markdown
- 禁用词：命中注定、一定会、宇宙能量、频率、振动、灵魂契约、前世、业力

${JSON_OUTPUT_INSTRUCTION}`;
  },

  user: (ctx: PromptContext) => {
    const chartData = ctx.chartData as Record<string, any> | undefined;
    const target = chartData?.target || 'sun';
    const targetName = TARGET_NAMES[target] || '太阳';
    return `请为以下${targetName}星座生成结构化深度解读：

${targetName}位置：${chartData?.sign || '未知'}，${chartData?.house || '未知'}宫，${chartData?.degree || 0}°${chartData?.minute || 0}'
相关相位：${JSON.stringify(chartData?.aspects || [])}

完整星盘数据：${JSON.stringify(chartData)}`;
  },
};

// 注册
registry.register(detailBig3NatalPrompt);

/**
 * 比较盘分析 Prompt（中国本土化版本）
 *
 * 输出：两人合不合适，能不能过到一起去
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactSynastrySignals } from '../../core/compact';
import { registry } from '../../core/registry';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';

import { resolvePairName, resolveRelationType } from './utils';

/** 根据关系类型生成不同的 system prompt */
function buildCompareSystemPrompt(relationType: string): string {
  const baseRules = `## 语言要求
1. 说人话，禁止用：能量共振、灵魂连接、宇宙安排
2. 场景要具体、接地气
3. 不要绝对结论，用"可能"、"容易"、"倾向于"
4. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
5. content 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行
${JSON_OUTPUT_INSTRUCTION}`;

  if (relationType === '朋友') {
    return `## 任务
从 A 的角度分析：跟 B 做朋友是什么体验。

## 分析维度（8个方面）
1. 合拍指数（150-250字）：第一感觉合不合得来
2. 聊得来指数（150-250字）：日常聊天顺不顺
3. 消费观匹配（150-200字）：涉及钱会不会尴尬（AA/请客/借钱）
4. 日常相处（200-300字）：一起玩的体验怎么样
5. 有分歧时（150-250字）：意见不合怎么处理
6. 能不能交心（200-300字）：能说掏心窝的话吗
7. 长久指数（150-250字）：会不会越处越好
8. 友情雷区（150-250字）：需要注意什么

## 输出格式（key 必须严格一致，与其他关系类型保持统一）
{
  "chemistry": { "title": "合拍指数", "score": 85, "content": "str:150-250字", "astro_basis": "str:核心星象依据", "key_signals": ["str"x2] },
  "communication": { "title": "聊得来指数", "score": 78, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "money_view": { "title": "消费观匹配", "score": 70, "match_type": "str", "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "daily_life": { "title": "日常相处", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据", "match_areas": ["str"x2], "gap_areas": ["str"x2] },
  "conflict_mode": { "title": "有分歧时", "score": 65, "fight_pattern": "str", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_merge": { "title": "能不能交心", "score": 60, "difficulty_level": "str:交心难度", "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "longevity": { "title": "长久指数", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warnings": { "title": "友情雷区", "danger_zones": ["str"x3], "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall": { "score": 73, "verdict": "str:15-25字总结", "relationship_type": "str:友情类型" }
}

## 分析要求
- 每个维度必须引用具体星象配置（如"A的金星在射手座与B的月亮形成三分相"）
- 分析行为模式背后的心理动机（如"月亮金牛的安全感需求导致..."）
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信、朋友圈、AA制、回家过年、见家长、催婚、996等）

## 场景举例
- 一起吃饭谁买单/AA 还是轮流请
- 借钱还不还、催着尴不尴尬
- 约好了放鸽子、微信消息不回
- 合租生活习惯冲突
- 一起开黑打游戏的配合度

${baseRules}`;
  }

  if (relationType === '同事') {
    return `## 任务
从 A 的角度分析：跟 B 做同事是什么体验。

## 分析维度（8个方面）
1. 默契指数（150-250字）：做事风格合不合
2. 沟通效率（150-250字）：说话能不能在点上
3. 利益分配（150-200字）：对利益/功劳的态度合不合
4. 日常配合（200-300字）：配合起来顺不顺
5. 有分歧时（150-250字）：意见不合怎么处理
6. 信任程度（200-300字）：工作交给对方放不放心
7. 长期合作（150-250字）：能不能长期搭档
8. 职场雷区（150-250字）：需要注意什么

## 输出格式（key 必须严格一致，与其他关系类型保持统一）
{
  "chemistry": { "title": "默契指数", "score": 85, "content": "str:150-250字", "astro_basis": "str:核心星象依据", "key_signals": ["str"x2] },
  "communication": { "title": "沟通效率", "score": 78, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "money_view": { "title": "利益分配", "score": 70, "match_type": "str", "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "daily_life": { "title": "日常配合", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据", "match_areas": ["str"x2], "gap_areas": ["str"x2] },
  "conflict_mode": { "title": "有分歧时", "score": 65, "fight_pattern": "str", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_merge": { "title": "信任程度", "score": 60, "difficulty_level": "str:信任难度", "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "longevity": { "title": "长期合作", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warnings": { "title": "职场雷区", "danger_zones": ["str"x3], "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall": { "score": 73, "verdict": "str:15-25字总结", "relationship_type": "str:同事类型" }
}

## 分析要求
- 每个维度必须引用具体星象配置（如"A的金星在射手座与B的月亮形成三分相"）
- 分析行为模式背后的心理动机（如"月亮金牛的安全感需求导致..."）
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信、朋友圈、AA制、回家过年、见家长、催婚、996等）

## 场景举例
- 分工不均怎么说、996 谁干得多
- 开会意见不合、OKR/KPI 怎么分
- 抢功劳/甩锅/邀功
- 项目压力大互相推、deadline 前互相甩活
- 互相请吃饭拉关系、下班后要不要社交

${baseRules}`;
  }

  if (relationType === '家人') {
    return `## 任务
从 A 的角度分析：跟 B 这个家人的相处体验。

## 分析维度（8个方面）
1. 亲近指数（150-250字）：感觉亲近还是疏远
2. 沟通体验（150-250字）：说话会不会互相伤
3. 消费观差异（150-200字）：对家庭开支看法一不一致
4. 日常相处（200-300字）：生活在一起舒不舒服
5. 有矛盾时（150-250字）：有分歧怎么化解
6. 边界与支持（200-300字）：会不会管太多、关键时会不会支持你
7. 长久关系（150-250字）：关系会越来越好还是越来越远
8. 家庭雷区（150-250字）：需要注意什么

## 输出格式（key 必须严格一致，与其他关系类型保持统一）
{
  "chemistry": { "title": "亲近指数", "score": 85, "content": "str:150-250字", "astro_basis": "str:核心星象依据", "key_signals": ["str"x2] },
  "communication": { "title": "沟通体验", "score": 78, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "money_view": { "title": "消费观差异", "score": 70, "match_type": "str", "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "daily_life": { "title": "日常相处", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据", "match_areas": ["str"x2], "gap_areas": ["str"x2] },
  "conflict_mode": { "title": "有矛盾时", "score": 65, "fight_pattern": "str", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_merge": { "title": "边界与支持", "score": 60, "difficulty_level": "str:边界难度", "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "longevity": { "title": "长久关系", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warnings": { "title": "家庭雷区", "danger_zones": ["str"x3], "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall": { "score": 73, "verdict": "str:15-25字总结", "relationship_type": "str:家人相处类型" }
}

## 分析要求
- 每个维度必须引用具体星象配置（如"A的金星在射手座与B的月亮形成三分相"）
- 分析行为模式背后的心理动机（如"月亮金牛的安全感需求导致..."）
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信、朋友圈、AA制、回家过年、见家长、催婚、996等）

## 场景举例
- 催婚催生怎么应对、过年被盘问
- 人生选择对方不理解（辞职/考研/出国）
- 节日聚会气氛尴尬、亲戚比较
- 管太多让人窒息、远程遥控
- 赡养老人怎么分、教育观念不同

${baseRules}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
从 A 的角度分析：跟 B 在一起是什么体验。

## 分析维度（8个方面）
1. 来电指数（150-250字）：有没有心动的感觉
2. 聊得来指数（150-250字）：日常沟通顺不顺
3. 消费观匹配（150-200字）：对钱的态度合不合
4. 过日子合拍度（200-300字）：能不能踏实过日子
5. 吵架和好模式（150-250字）：闹矛盾怎么处理
6. 家庭融合难度（200-300字）：两边家庭好不好处
7. 长久指数（150-250字）：能不能走长远
8. 踩坑预警（150-250字）：需要注意什么

## 输出格式
{
  "chemistry": { "title": "来电指数", "score": 85, "content": "str:150-250字", "astro_basis": "str:核心星象依据", "key_signals": ["str"x2] },
  "communication": { "title": "聊得来指数", "score": 78, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "money_view": { "title": "消费观匹配", "score": 70, "match_type": "str", "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "daily_life": { "title": "过日子合拍度", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据", "match_areas": ["str"x2], "gap_areas": ["str"x2] },
  "conflict_mode": { "title": "吵架和好模式", "score": 65, "fight_pattern": "str", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_merge": { "title": "家庭融合难度", "score": 60, "difficulty_level": "str", "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "longevity": { "title": "长久指数", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warnings": { "title": "踩坑预警", "danger_zones": ["str"x3], "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall": { "score": 73, "verdict": "str:15-25字总结", "relationship_type": "str" }
}

## 分析要求
- 每个维度必须引用具体星象配置（如"A的金星在射手座与B的月亮形成三分相"）
- 分析行为模式背后的心理动机（如"月亮金牛的安全感需求导致..."）
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信、朋友圈、AA制、回家过年、见家长、催婚、996等）

## 场景举例
- 吵架谁先道歉、冷战几天受不了、谁先在微信服软
- 过年回谁家、彩礼怎么谈、双方父母怎么安排
- AA 还是你请我请、谁管钱谁花钱、双十一谁清购物车
- 异地恋见面频率、加班太多没时间陪、深夜emo谁先发消息
- 房贷怎么分、生不生孩子、帮对方抢演唱会票

${baseRules}`;
}

export const synastryCompareAbPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-compare-ab',
    version: '5.0',
    module: 'synastry',
    priority: 'P2',
    description: '比较盘分析（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildCompareSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const nameA = resolvePairName(ctx, 'nameA');
    const nameB = resolvePairName(ctx, 'nameB');
    const relationType = resolveRelationType(ctx);

    return `关系类型：${relationType}
${nameA}星盘：${compactChartSummary(ctx.chartA || ctx.chart_a)}
${nameB}星盘：${compactChartSummary(ctx.chartB || ctx.chart_b)}
合盘相位：${compactSynastrySignals(ctx.synastry_signals || ctx.synastry_aspects || ctx.synastry)}`;
  },
};

// 注册
registry.register(synastryCompareAbPrompt);

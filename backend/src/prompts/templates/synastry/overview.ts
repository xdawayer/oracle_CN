/**
 * 合盘总览 Prompt（中国本土化版本）
 *
 * 输出：五维关系模型 + 核心互动 + 最合拍/需磨合
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactSynastrySignals } from '../../core/compact';
import { registry } from '../../core/registry';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';

import { resolvePairName, resolveRelationType } from './utils';

/** 根据关系类型生成不同的 system prompt */
function buildSystemPrompt(relationType: string): string {
  const baseRules = `## 语言要求
1. 说人话，禁止用：能量共振、灵魂连接、宇宙安排、业力牵引
2. 像朋友聊天一样说
3. 场景要具体、接地气
4. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
5. content/description 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行
6. advice 相关字段不要以"建议你："开头，直接写建议内容
${JSON_OUTPUT_INSTRUCTION}`;

  const analysisRequirements = `## 分析要求
- 每个维度必须引用具体星象配置（如"金星在射手座三宫"）
- 分析行为模式背后的心理动机
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境

`;

  if (relationType === '朋友') {
    return `## 任务
分析两人作为【朋友】的相处模式。

${analysisRequirements}## 输出格式
{
  "overall_score": 78,
  "relationship_type": "str:见下方类型",
  "five_dimensions": [
    { "name": "聊得来", "score": 85, "description": "str:40-60字，能不能愉快聊天", "astro_basis": "str:核心星象依据" },
    { "name": "三观合", "score": 72, "description": "str:40-60字，想法是否一路", "astro_basis": "str:核心星象依据" },
    { "name": "玩得到一起", "score": 68, "description": "str:40-60字，兴趣爱好能否对上", "astro_basis": "str:核心星象依据" },
    { "name": "能交心", "score": 75, "description": "str:40-60字，能不能说掏心窝的话", "astro_basis": "str:核心星象依据" },
    { "name": "靠得住", "score": 80, "description": "str:40-60字，关键时刻能不能指望", "astro_basis": "str:核心星象依据" }
  ],
  "core_dynamic": { "title": "str:你们的友情模式", "description": "str:150-250字" },
  "best_match": { "title": "str:最聊得来的地方", "description": "str:80-150字" },
  "needs_work": { "title": "str:容易有摩擦的地方", "description": "str:80-150字" },
  "one_line_summary": "str:20-30字"
}

## 友情类型（选一个）
- 「损友型」：互相吐槽但感情铁
- 「知己型」：懂你不用多解释，灵魂搭子
- 「玩伴型」：一起嗨特别来劲，吃喝玩乐搭子
- 「益友型」：互相促进成长
- 「老铁型」：平时不联系但一叫就到
- 「情绪搭子型」：专业倾听、互当情绪垃圾桶（褒义）

## 友情场景
- 能不能一起打游戏/逛街/喝酒/密室逃脱
- 借钱会不会尴尬
- 能不能吐槽工作和感情、深夜emo谁先发消息
- 会不会因为小事翻脸
- 帮抢演唱会票/一起拼外卖/合租磨合

${baseRules}`;
  }

  if (relationType === '同事') {
    return `## 任务
分析两人作为【同事】的职场相处模式。

${analysisRequirements}## 输出格式
{
  "overall_score": 78,
  "relationship_type": "str:见下方类型",
  "five_dimensions": [
    { "name": "配合度", "score": 85, "description": "str:40-60字，工作配合顺不顺", "astro_basis": "str:核心星象依据" },
    { "name": "沟通效率", "score": 72, "description": "str:40-60字，说话能不能在点上", "astro_basis": "str:核心星象依据" },
    { "name": "互补性", "score": 68, "description": "str:40-60字，能力是否互补", "astro_basis": "str:核心星象依据" },
    { "name": "信任感", "score": 75, "description": "str:40-60字，能不能放心交给对方", "astro_basis": "str:核心星象依据" },
    { "name": "竞争风险", "score": 80, "description": "str:40-60字，会不会有利益冲突", "astro_basis": "str:核心星象依据" }
  ],
  "core_dynamic": { "title": "str:你们的合作模式", "description": "str:150-250字" },
  "best_match": { "title": "str:最能配合的地方", "description": "str:80-150字" },
  "needs_work": { "title": "str:需要注意的地方", "description": "str:80-150字" },
  "one_line_summary": "str:20-30字"
}

## 同事类型（选一个）
- 「黄金搭档型」：配合默契效率高
- 「互补型」：你强的地方我弱，刚好
- 「良性竞争型」：互相激励往上冲
- 「各干各的型」：井水不犯河水
- 「需要磨合型」：风格差异大，多沟通

## 职场场景
- 一起做项目会不会顺
- 意见不合怎么处理
- 会不会抢功劳
- 开会时的互动模式

${baseRules}`;
  }

  if (relationType === '家人') {
    return `## 任务
分析两人作为【家人】的相处模式。

${analysisRequirements}## 输出格式
{
  "overall_score": 78,
  "relationship_type": "str:见下方类型",
  "five_dimensions": [
    { "name": "理解度", "score": 85, "description": "str:40-60字，能不能互相理解", "astro_basis": "str:核心星象依据" },
    { "name": "沟通方式", "score": 72, "description": "str:40-60字，说话会不会伤人", "astro_basis": "str:核心星象依据" },
    { "name": "边界感", "score": 68, "description": "str:40-60字，会不会过度干涉", "astro_basis": "str:核心星象依据" },
    { "name": "支持度", "score": 75, "description": "str:40-60字，关键时刻站不站你", "astro_basis": "str:核心星象依据" },
    { "name": "相处舒适度", "score": 80, "description": "str:40-60字，在一起自在不自在", "astro_basis": "str:核心星象依据" }
  ],
  "core_dynamic": { "title": "str:你们的家庭相处模式", "description": "str:150-250字" },
  "best_match": { "title": "str:最能互相理解的地方", "description": "str:80-150字" },
  "needs_work": { "title": "str:容易产生矛盾的地方", "description": "str:80-150字" },
  "one_line_summary": "str:20-30字"
}

## 家人相处类型（选一个）
- 「相互尊重型」：有边界感但关系亲近
- 「热热闹闹型」：什么都聊，像朋友一样
- 「各过各的型」：不太交流但也不吵
- 「需要空间型」：太近容易吵，保持距离刚好
- 「操心型」：一方总爱管另一方

## 家庭场景
- 一起吃饭聊什么
- 对人生选择的态度
- 会不会过度关心
- 有矛盾怎么化解

${baseRules}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
分析两人的【感情关系】，说人话。不预测分手/结婚。

${analysisRequirements}## 输出格式
{
  "overall_score": 78,
  "relationship_type": "str:见下方类型",
  "five_dimensions": [
    { "name": "来电感", "score": 85, "description": "str:40-60字，有没有心动的感觉", "astro_basis": "str:核心星象依据" },
    { "name": "聊得来", "score": 72, "description": "str:40-60字，日常沟通顺不顺", "astro_basis": "str:核心星象依据" },
    { "name": "懂对方", "score": 68, "description": "str:40-60字，能不能理解对方", "astro_basis": "str:核心星象依据" },
    { "name": "三观合", "score": 75, "description": "str:40-60字，想法是否一路", "astro_basis": "str:核心星象依据" },
    { "name": "能长久", "score": 80, "description": "str:40-60字，有没有稳定感", "astro_basis": "str:核心星象依据" }
  ],
  "core_dynamic": { "title": "str:你们的相处模式", "description": "str:150-250字" },
  "best_match": { "title": "str:最合拍的地方", "description": "str:80-150字" },
  "needs_work": { "title": "str:容易磨的地方", "description": "str:80-150字" },
  "one_line_summary": "str:20-30字"
}

## 感情类型（选一个）
- 「老夫老妻型」：相处自然，没那么多心跳但很踏实
- 「欢喜冤家型」：吵吵闹闹但谁也离不开谁，天生一对冤家CP
- 「一拍即合型」：聊什么都能接上，默契感强，灵魂搭子
- 「互相成就型」：在一起后双方都变得更好，彼此的贵人
- 「细水长流型」：感情不是烈火，但越处越舒服
- 「心动担当型」：在一起心跳会加速，磕到了

## 感情场景
- 吵架谁先道歉、谁先服软发微信
- 过年回谁家、双方父母怎么安排
- AA还是你请我请、外卖谁来点
- 谁管钱谁花钱、双十一购物车谁清
- 加班太多会不会闹、周末宅家还是出门
- 帮对方抢演唱会门票/秒杀

${baseRules}`;
}

export const synastryOverviewPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-overview',
    version: '15.0',
    module: 'synastry',
    priority: 'P0',
    description: '合盘关系总览（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const nameA = resolvePairName(ctx, 'nameA');
    const nameB = resolvePairName(ctx, 'nameB');
    const relationType = resolveRelationType(ctx);

    return `关系类型：${relationType}
${nameA}星盘：${compactChartSummary(ctx.chartA_summary || ctx.chartA)}
${nameB}星盘：${compactChartSummary(ctx.chartB_summary || ctx.chartB)}
合盘信号：${compactSynastrySignals(ctx.synastry_signals || ctx.synastry)}`;
  },
};

// 注册
registry.register(synastryOverviewPrompt);

/**
 * 合盘亮点 Prompt（中国本土化版本）
 *
 * 输出：最合拍的地方 + 容易有摩擦的地方 + 关系优势/注意点
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactSynastrySignals } from '../../core/compact';
import { registry } from '../../core/registry';

import { resolvePairName, resolveRelationType } from './utils';

/** 根据关系类型生成不同的 system prompt */
function buildHighlightsSystemPrompt(relationType: string): string {
  const baseRules = `## 规则
1. best_parts/watch_outs 各2-4条
2. 合拍：金星(互相欣赏)｜月亮(情绪懂得)｜水星(聊得来)｜拱六合(相处顺)
3. 摩擦：火刑(容易吵)｜土星(有压力)｜冥王(想控制)｜刑冲(有张力)
4. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
5. description 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行`;

  if (relationType === '朋友') {
    return `## 任务
分析这段【友情】最合拍的地方和容易有摩擦的地方。用大白话说清楚。

## 输出
{
  "best_parts": [
    { "aspect": "str:相位", "title": "str:合拍的点", "description": "str:50-80字", "scenario": "str:具体场景" }
  ],
  "watch_outs": [
    { "aspect": "str:相位", "title": "str:容易摩擦的点", "description": "str:50-80字", "tip": "str:怎么处理" }
  ],
  "top_3_strengths": ["str:友情优势"x3],
  "top_3_watch_outs": ["str:友情注意点"x3],
  "chemistry_score": { "physical": 75, "emotional": 82, "intellectual": 68 }
}

${baseRules}
4. scenario 用友情场景（一起吃饭/聊心事/借钱/帮忙搬家/组队开黑/合租生活/微信群互动/帮抢票/一起拼外卖/深夜emo陪聊）
5. physical 代表相处默契度，emotional 代表信任感，intellectual 代表聊得来程度
6. 合拍用搭子文化表达，如"灵魂搭子""情绪搭子"；互相支持可以用"互当情绪垃圾桶（褒义）"`;
  }

  if (relationType === '同事') {
    return `## 任务
分析这段【职场关系】最合拍的地方和容易有摩擦的地方。用大白话说清楚。

## 输出
{
  "best_parts": [
    { "aspect": "str:相位", "title": "str:合作默契的点", "description": "str:50-80字", "scenario": "str:具体场景" }
  ],
  "watch_outs": [
    { "aspect": "str:相位", "title": "str:容易有摩擦的点", "description": "str:50-80字", "tip": "str:怎么处理" }
  ],
  "top_3_strengths": ["str:合作优势"x3],
  "top_3_watch_outs": ["str:合作注意点"x3],
  "chemistry_score": { "physical": 75, "emotional": 82, "intellectual": 68 }
}

${baseRules}
4. scenario 用职场场景（合作项目/开会讨论/分工配合/意见分歧/利益冲突/996加班/KPI分配/请吃饭拉关系）
5. physical 代表配合效率，emotional 代表信任感，intellectual 代表沟通顺畅度`;
  }

  if (relationType === '家人') {
    return `## 任务
分析这段【家庭关系】最合拍的地方和容易有摩擦的地方。用大白话说清楚。

## 输出
{
  "best_parts": [
    { "aspect": "str:相位", "title": "str:相处融洽的点", "description": "str:50-80字", "scenario": "str:具体场景" }
  ],
  "watch_outs": [
    { "aspect": "str:相位", "title": "str:容易有摩擦的点", "description": "str:50-80字", "tip": "str:怎么处理" }
  ],
  "top_3_strengths": ["str:家庭优势"x3],
  "top_3_watch_outs": ["str:家庭注意点"x3],
  "chemistry_score": { "physical": 75, "emotional": 82, "intellectual": 68 }
}

${baseRules}
4. scenario 用家庭场景（聊天交流/节日聚会/人生选择/界限问题/支持帮助/催婚催生/赡养老人/教育观念）
5. physical 代表相处舒适度，emotional 代表理解程度，intellectual 代表沟通效果`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
分析这段【感情关系】最合拍的地方和容易有摩擦的地方。用大白话说清楚，不预测分手/结婚。

## 输出
{
  "best_parts": [
    { "aspect": "str:金星合月亮", "title": "str:合拍的点", "description": "str:50-80字", "scenario": "str:具体场景" }
  ],
  "watch_outs": [
    { "aspect": "str:火星刑土星", "title": "str:容易摩擦的点", "description": "str:50-80字", "tip": "str:怎么处理" }
  ],
  "top_3_strengths": ["str:感情优势"x3],
  "top_3_watch_outs": ["str:感情注意点"x3],
  "chemistry_score": { "physical": 75, "emotional": 82, "intellectual": 68 }
}

${baseRules}
4. scenario 用感情场景（吵架谁道歉/过年回谁家/加班太多/消费观/家务分工/房贷怎么分/异地见面/帮抢演唱会票/一起点外卖/深夜emo谁先发消息）
5. 关系好的方面可以用CP向的表达，比如"磕到了""甜到齁""发糖现场"；摩擦可以用"谁也不服谁""互相拉扯"等年轻化表达`;
}

export const synastryHighlightsPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-highlights',
    version: '4.0',
    module: 'synastry',
    priority: 'P0',
    description: '合盘关系亮点（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildHighlightsSystemPrompt(relationType);
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
registry.register(synastryHighlightsPrompt);

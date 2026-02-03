/**
 * 比较盘分析 Prompt（中国本土化版本）- B 的视角
 *
 * 输出：从 B 的角度看，跟 A 在一起合不合适
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactSynastrySignals } from '../../core/compact';
import { registry } from '../../core/registry';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';

import { resolvePairName, resolveRelationType } from './utils';

const ANALYSIS_REQUIREMENTS = `## 分析要求
- 每个维度必须引用具体星象配置（如"A的金星在射手座与B的月亮形成三分相"）
- 分析行为模式背后的心理动机（如"月亮金牛的安全感需求导致..."）
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境（微信、朋友圈、AA制、回家过年、见家长、催婚、996等）`;

/** 根据关系类型生成不同的 system prompt（B 视角） */
function buildCompareBaSystemPrompt(relationType: string): string {
  const baseRules = `## 语言要求
1. 完全站在 B 的角度，用"你"称呼 B，用"ta"称呼 A
2. 说人话，禁止用：能量共振、灵魂连接
3. 不要绝对结论，给 B 思考空间
4. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
5. content 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行
6. advice 相关字段不要以"建议你："开头，直接写建议内容
${JSON_OUTPUT_INSTRUCTION}`;

  if (relationType === '朋友') {
    return `## 任务
从你（B）的角度分析：跟 ta（A）做朋友是什么体验。

## 分析维度（8个方面）
1. 对 ta 的感觉（150-250字）：第一感觉合不合得来
2. ta 懂不懂你（150-250字）：能理解你的想法吗
3. 聊天体验（150-200字）：聊得来不来
4. 消费观差异（150-200字）：AA/请客/借钱会不会尴尬
5. 日常相处（200-300字）：一起玩的体验怎么样
6. 有分歧时（150-250字）：闹不愉快了 ta 会怎么处理
7. 能不能交心（200-300字）：能说掏心窝的话吗
8. 跟 ta 能当长久朋友吗（150-250字）：会越处越好吗

## 输出格式（key 必须严格一致，与其他关系类型保持统一）
{
  "feeling_for_a": { "title": "对 ta 的感觉", "score": 85, "content": "str:150-250字", "what_attracts": "str:ta 哪里吸引你", "astro_basis": "str:核心星象依据" },
  "being_understood": { "title": "ta 懂不懂你", "score": 78, "content": "str:150-250字", "understanding_level": "str", "astro_basis": "str:核心星象依据" },
  "chat_experience": { "title": "聊天体验", "score": 70, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "money_gap": { "title": "消费观差异", "score": 65, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "living_comfort": { "title": "日常相处", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "after_fight": { "title": "有分歧时", "score": 60, "content": "str:150-250字", "fight_pattern": "str:闹不愉快时的表现", "astro_basis": "str:核心星象依据" },
  "family_fit": { "title": "能不能交心", "score": 55, "content": "str:200-300字", "difficulty": "str:交心难度", "astro_basis": "str:核心星象依据" },
  "longevity_feel": { "title": "跟 ta 能当长久朋友吗", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall_for_b": { "score": 72, "verdict": "str:给你的一句话总结", "advice_for_b": "str:给你的建议" }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
  }

  if (relationType === '同事') {
    return `## 任务
从你（B）的角度分析：跟 ta（A）做同事是什么体验。

## 分析维度（8个方面）
1. 对 ta 的感觉（150-250字）：第一印象和合作直觉
2. ta 懂不懂你（150-250字）：能理解你的工作方式吗
3. 沟通感受（150-200字）：ta 说话好不好沟通
4. 利益态度（150-200字）：对功劳/利益怎么看
5. 日常配合（200-300字）：配合起来顺不顺
6. 有分歧时（150-250字）：ta 会怎么处理不同意见
7. 能不能信任（200-300字）：工作交给 ta 放不放心
8. 跟 ta 能长期合作吗（150-250字）：搭档前景怎么样

## 输出格式（key 必须严格一致，与其他关系类型保持统一）
{
  "feeling_for_a": { "title": "对 ta 的感觉", "score": 85, "content": "str:150-250字", "what_attracts": "str:ta 工作中的亮点", "astro_basis": "str:核心星象依据" },
  "being_understood": { "title": "ta 懂不懂你", "score": 78, "content": "str:150-250字", "understanding_level": "str", "astro_basis": "str:核心星象依据" },
  "chat_experience": { "title": "沟通感受", "score": 70, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "money_gap": { "title": "利益态度", "score": 65, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "living_comfort": { "title": "日常配合", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "after_fight": { "title": "有分歧时", "score": 60, "content": "str:150-250字", "fight_pattern": "str:分歧时的表现", "astro_basis": "str:核心星象依据" },
  "family_fit": { "title": "能不能信任", "score": 55, "content": "str:200-300字", "difficulty": "str:信任难度", "astro_basis": "str:核心星象依据" },
  "longevity_feel": { "title": "跟 ta 能长期合作吗", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall_for_b": { "score": 72, "verdict": "str:给你的一句话总结", "advice_for_b": "str:给你的建议" }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
  }

  if (relationType === '家人') {
    return `## 任务
从你（B）的角度分析：跟 ta（A）这个家人的相处体验。

## 分析维度（8个方面）
1. 对 ta 的感觉（150-250字）：心里觉得亲近还是疏远
2. ta 懂不懂你（150-250字）：能理解你的想法吗
3. 聊天体验（150-200字）：说话聊得来吗
4. 消费观差异（150-200字）：对家庭开支看法一样吗
5. 日常相处（200-300字）：在一起舒不舒服
6. 有矛盾时（150-250字）：ta 会怎么处理
7. ta 会不会管太多（200-300字）：边界感怎么样、关键时会支持你吗
8. 跟 ta 能越来越亲吗（150-250字）：关系会越来越好吗

## 输出格式（key 必须严格一致，与其他关系类型保持统一）
{
  "feeling_for_a": { "title": "对 ta 的感觉", "score": 85, "content": "str:150-250字", "what_attracts": "str:ta 让你觉得温暖的地方", "astro_basis": "str:核心星象依据" },
  "being_understood": { "title": "ta 懂不懂你", "score": 78, "content": "str:150-250字", "understanding_level": "str", "astro_basis": "str:核心星象依据" },
  "chat_experience": { "title": "聊天体验", "score": 70, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "money_gap": { "title": "消费观差异", "score": 65, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "living_comfort": { "title": "日常相处", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "after_fight": { "title": "有矛盾时", "score": 60, "content": "str:150-250字", "fight_pattern": "str:矛盾时的表现", "astro_basis": "str:核心星象依据" },
  "family_fit": { "title": "ta 会不会管太多", "score": 55, "content": "str:200-300字", "difficulty": "str:边界把握难度", "astro_basis": "str:核心星象依据" },
  "longevity_feel": { "title": "跟 ta 能越来越亲吗", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall_for_b": { "score": 72, "verdict": "str:给你的一句话总结", "advice_for_b": "str:给你的建议" }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
从你（B）的角度分析：跟 ta（A）在一起是什么感觉。

## 分析维度（8个方面）
1. 对 ta 的感觉（150-250字）：心动不心动
2. ta 懂不懂你（150-250字）：能理解你吗
3. 聊天体验（150-200字）：聊得来吗
4. 消费观差异（150-200字）：对钱的态度合吗
5. 过日子舒适度（200-300字）：能一起生活吗
6. 吵架后你的感受（150-250字）：ta 会让着你吗
7. ta 的家庭好不好处（200-300字）：融入 ta 家难吗
8. 跟 ta 能长久吗（150-250字）：有稳定感吗

## 输出格式
{
  "feeling_for_a": { "title": "对 ta 的感觉", "score": 85, "content": "str:150-250字", "what_attracts": "str", "astro_basis": "str:核心星象依据" },
  "being_understood": { "title": "ta 懂不懂你", "score": 78, "content": "str:150-250字", "understanding_level": "str", "astro_basis": "str:核心星象依据" },
  "chat_experience": { "title": "聊天体验", "score": 70, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "money_gap": { "title": "消费观差异", "score": 65, "content": "str:150-200字", "astro_basis": "str:核心星象依据" },
  "living_comfort": { "title": "过日子舒适度", "score": 75, "content": "str:200-300字", "astro_basis": "str:核心星象依据" },
  "after_fight": { "title": "吵架后你的感受", "score": 60, "content": "str:150-250字", "fight_pattern": "str", "astro_basis": "str:核心星象依据" },
  "family_fit": { "title": "ta 的家庭好不好处", "score": 55, "content": "str:200-300字", "difficulty": "str", "astro_basis": "str:核心星象依据" },
  "longevity_feel": { "title": "跟 ta 能长久吗", "score": 80, "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "overall_for_b": { "score": 72, "verdict": "str:给你的一句话总结", "advice_for_b": "str:给你的建议" }
}

${ANALYSIS_REQUIREMENTS}

${baseRules}`;
}

export const synastryCompareBaPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-compare-ba',
    version: '5.0',
    module: 'synastry',
    priority: 'P2',
    description: '比较盘分析 B 视角（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildCompareBaSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const nameA = resolvePairName(ctx, 'nameA');
    const nameB = resolvePairName(ctx, 'nameB');
    const relationType = resolveRelationType(ctx);

    return `关系类型：${relationType}
${nameA}（ta）星盘：${compactChartSummary(ctx.chartA || ctx.chart_a)}
${nameB}（你）星盘：${compactChartSummary(ctx.chartB || ctx.chart_b)}
合盘相位：${compactSynastrySignals(ctx.synastry_signals || ctx.synastry_aspects || ctx.synastry)}

请从${nameB}的视角分析这段关系，帮ta看清楚跟${nameA}在一起是什么感觉。`;
  },
};

// 注册
registry.register(synastryCompareBaPrompt);

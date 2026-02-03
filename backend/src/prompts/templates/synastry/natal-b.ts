/**
 * 合盘中 B 的本命分析 Prompt（中国本土化版本）
 *
 * 输出：从 B 的视角看 ta 在关系中是什么样的人
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary } from '../../core/compact';
import { registry } from '../../core/registry';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';

import { resolveNameB, resolveRelationType } from './utils';

/** 根据关系类型生成不同的 system prompt */
function buildNatalSystemPrompt(relationType: string): string {
  const baseRules = `## 语言要求
1. 说人话，不要用心理学术语
2. 接地气，用中国年轻人熟悉的表达
3. 举例要具体
4. 输出格式中的 "str:" 只是类型标注，实际输出时不要带 "str:" 前缀，直接输出内容文本
5. content 字段中每说完一个要点用换行符(\\n)分隔，有编号时(1. 2. 3.)每条独占一行
${JSON_OUTPUT_INSTRUCTION}`;

  const analysisRequirements = `## 分析要求
- 每个维度必须引用具体星象配置（如"金星在射手座三宫"）
- 分析行为模式背后的心理动机
- 用"比如..."举具体中国年轻人的生活场景
- 场景必须贴合中国大陆语境

`;

  if (relationType === '朋友') {
    return `## 任务
分析这个人作为朋友是什么样的，用大白话说。

## 分析维度
1. 社交人设（150-250字）：ta是什么类型的朋友
2. 交友需求（120-200字）：ta在友情里需要什么、能给什么
3. 相处摩擦（120-200字）：跟ta做朋友容易因为什么闹不愉快
4. 生活偏好（150-250字）：ta的兴趣爱好、社交习惯
5. 友情观念（150-250字）：ta对友情的态度、能不能交心
6. 友情雷区（120-200字）：跟ta做朋友要注意什么

${analysisRequirements}## 输出格式（key 必须严格一致）
{
  "love_persona": { "title": "社交人设", "type": "str:类型", "content": "str:150-250字", "astro_basis": "str:核心星象依据", "tags": ["str"x3] },
  "needs_and_gives": { "title": "交友需求", "needs": ["str"x2], "gives": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "fight_mode": { "title": "相处摩擦", "trigger": "str:容易因为什么不愉快", "style": "str:不愉快时的表现", "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "lifestyle": { "title": "生活偏好", "money_attitude": "str:对钱的态度", "living_habit": "str:兴趣爱好", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_view": { "title": "友情观念", "marriage_attitude": "str:对友情的态度", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warning": { "title": "友情雷区", "mines": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "one_sentence": "str:一句话总结（15-25字）"
}

${baseRules}`;
  }

  if (relationType === '同事') {
    return `## 任务
分析这个人作为同事是什么样的，用大白话说。

## 分析维度
1. 职场人设（150-250字）：ta在工作中是什么类型
2. 工作需求（120-200字）：ta在职场需要什么、能贡献什么
3. 工作分歧（120-200字）：跟ta共事容易因为什么起冲突
4. 工作习惯（150-250字）：ta做事的方式、沟通风格
5. 职场态度（150-250字）：ta对事业、合作的态度
6. 职场雷区（120-200字）：跟ta共事要注意什么

${analysisRequirements}## 输出格式（key 必须严格一致）
{
  "love_persona": { "title": "职场人设", "type": "str:类型", "content": "str:150-250字", "astro_basis": "str:核心星象依据", "tags": ["str"x3] },
  "needs_and_gives": { "title": "工作需求", "needs": ["str"x2], "gives": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "fight_mode": { "title": "工作分歧", "trigger": "str:容易因为什么起冲突", "style": "str:冲突时的表现", "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "lifestyle": { "title": "工作习惯", "money_attitude": "str:对利益的态度", "living_habit": "str:做事风格", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_view": { "title": "职场态度", "marriage_attitude": "str:对事业的态度", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warning": { "title": "职场雷区", "mines": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "one_sentence": "str:一句话总结（15-25字）"
}

${baseRules}`;
  }

  if (relationType === '家人') {
    return `## 任务
分析这个人在家庭中是什么样的，用大白话说。

## 分析维度
1. 家庭角色（150-250字）：ta在家里是什么样的人
2. 情感需求（120-200字）：ta需要家人给什么、能给什么
3. 家庭矛盾（120-200字）：跟ta相处容易因为什么闹矛盾
4. 生活方式（150-250字）：ta的生活习惯、沟通方式
5. 家庭观念（150-250字）：ta对家庭、亲情的态度
6. 敏感雷区（120-200字）：跟ta相处要注意什么

${analysisRequirements}## 输出格式（key 必须严格一致）
{
  "love_persona": { "title": "家庭角色", "type": "str:类型", "content": "str:150-250字", "astro_basis": "str:核心星象依据", "tags": ["str"x3] },
  "needs_and_gives": { "title": "情感需求", "needs": ["str"x2], "gives": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "fight_mode": { "title": "家庭矛盾", "trigger": "str:容易因为什么闹矛盾", "style": "str:闹矛盾时的表现", "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "lifestyle": { "title": "生活方式", "money_attitude": "str:对家庭开支的态度", "living_habit": "str:生活习惯", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_view": { "title": "家庭观念", "marriage_attitude": "str:对家庭的态度", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warning": { "title": "敏感雷区", "mines": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "one_sentence": "str:一句话总结（15-25字）"
}

${baseRules}`;
  }

  // 恋人/夫妻（默认）
  return `## 任务
分析这个人在恋爱中是什么样的，用大白话说。

## 分析维度
1. 恋爱人设（150-250字）：ta在感情里是什么类型
2. 想要的和能给的（150-250字）：ta需要什么、能给什么
3. 吵架模式（120-200字）：吵架时ta会怎样
4. 过日子风格（150-250字）：消费观、生活习惯
5. 家庭观念（150-250字）：对结婚、家庭的态度
6. 雷区提醒（120-200字）：跟ta恋爱要注意什么

${analysisRequirements}## 输出格式
{
  "love_persona": { "title": "恋爱人设", "type": "str:类型", "content": "str:150-250字", "astro_basis": "str:核心星象依据", "tags": ["str"x3] },
  "needs_and_gives": { "title": "想要的和能给的", "needs": ["str"x2], "gives": ["str"x2], "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "fight_mode": { "title": "吵架模式", "trigger": "str", "style": "str", "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "lifestyle": { "title": "过日子风格", "money_attitude": "str", "living_habit": "str", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "family_view": { "title": "家庭观念", "marriage_attitude": "str", "content": "str:150-250字", "astro_basis": "str:核心星象依据" },
  "warning": { "title": "雷区提醒", "mines": ["str"x2], "content": "str:120-200字", "astro_basis": "str:核心星象依据" },
  "one_sentence": "str:一句话总结（15-25字）"
}

${baseRules}`;
}

export const synastryNatalBPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-natal-b',
    version: '5.0',
    module: 'synastry',
    priority: 'P1',
    description: 'B 的人设分析（支持多种关系类型）',
    lastUpdated: '2026-01-30',
  },

  system: (ctx: PromptContext) => {
    const relationType = resolveRelationType(ctx);
    return buildNatalSystemPrompt(relationType);
  },

  user: (ctx: PromptContext) => {
    const name = resolveNameB(ctx);
    const chartData = ctx.chartB || ctx.chart_b || ctx.chart;
    const gender = ctx.genderB || ctx.gender_b || ctx.gender || '';
    const hasBirthTime = ctx.has_birth_time_b !== false && ctx.hasBirthTimeB !== false;

    let prompt = `姓名：${name}`;
    if (gender) prompt += `\n性别：${gender}`;
    prompt += `\n星盘数据：${compactChartSummary(chartData)}`;

    if (!hasBirthTime) {
      prompt += `\n\n注意：无准确出生时间，宫位相关分析请谨慎处理，在输出中添加 "no_birth_time": true`;
    }

    return prompt;
  },
};

// 注册
registry.register(synastryNatalBPrompt);

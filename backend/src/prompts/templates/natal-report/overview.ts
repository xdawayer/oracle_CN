/**
 * 本命深度解读 - 模块一：星盘总览与人格画像
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  NATAL_REPORT_SYSTEM_PROMPT,
  NATAL_REPORT_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetAspects,
} from './system';

export const natalReportOverviewPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-overview',
    version: '1.0',
    module: 'natal-report',
    priority: 'P0',
    description: '本命深度解读 - 星盘总览与人格画像',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);

    // 提取太阳、月亮之间的相位
    const sunAspects = extractPlanetAspects(ctx, '太阳');
    const moonAspects = extractPlanetAspects(ctx, '月亮');

    return `## 完整星盘数据
${chartText}

## 太阳相位
${sunAspects}

## 月亮相位
${moonAspects}

## 你的任务
你正在为用户撰写本命盘解读报告的「星盘总览」章节。

基于提供的星盘数据，从「太阳星座与宫位」「月亮星座与宫位」「上升星座」三个核心维度，为用户描绘一幅完整的人格画像。

## 写作要求

1. 开头用1-2句话给出一个生动的整体印象，像在描述一个你认识的朋友，而不是在念教科书。比如不要写"太阳双子座代表沟通能力强"，而是写"你骨子里是一个对世界充满好奇的人，脑子里永远同时转着三四个念头"。

2. 分别解读太阳（你骨子里是什么样的人）、月亮（你需要什么才安心）、上升（别人第一眼看到的你，你面对陌生人的方式）。

3. 重点描述这三者之间的关系——它们配合得好不好？有没有矛盾？比如太阳和月亮刑相位说明"你想要的"和"你需要的"经常打架。

4. 如果三者之间元素/模式差异大（比如太阳风象、月亮水象、上升土象），要解读这种"不同面"——你在不同场景下表现可能判若两人。

5. 用一个比喻或意象来总结这个人的核心特质。

## 语言风格
- 像一个懂行的朋友在跟用户聊天，说话直接、有判断力
- 不要用"你可能会""你也许是"这类模糊的对冲语言，要有立场
- 可以用中国用户熟悉的比喻
- 不堆砌占星术语，必须用的时候括号解释
- 不要使用心理学术语（如"内在小孩""依恋模式""自我价值感"等）

## 字数：600-800字

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

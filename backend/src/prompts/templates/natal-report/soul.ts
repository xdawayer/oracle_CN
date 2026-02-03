/**
 * 本命深度解读 - 模块八：人生方向与成长
 *
 * 输出约 700-900 字，纯 Markdown 文本
 * 这是最后一个模块，需要注入所有前序模块摘要
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  NATAL_REPORT_SYSTEM_PROMPT,
  NATAL_REPORT_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const natalReportSoulPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-soul',
    version: '1.0',
    module: 'natal-report',
    priority: 'P1',
    description: '本命深度解读 - 人生方向与成长',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const plutoData = extractPlanetData(ctx, '冥王星');
    const plutoAspects = extractPlanetAspects(ctx, '冥王星');
    const house12 = extractHouseData(ctx, 12);

    // 提取北交点和凯龙星
    const planets = ctx.chart_summary?.planets || [];
    const findPlanet = (names: string[]) =>
      planets.find((p: { name: string }) => names.some(n => p.name === n || p.name.includes(n)));
    const formatPlanet = (label: string, planet: unknown) => {
      if (!planet) return `${label}：数据未找到`;
      const p = planet as Record<string, unknown>;
      return `${label}：${p.sign}（第${p.house}宫）`;
    };

    const northNode = findPlanet(['北交点', '北交']);
    const southNode = findPlanet(['南交点', '南交']);
    const chiron = findPlanet(['凯龙星', '凯龙', 'Chiron']);

    const northNodeText = formatPlanet('北交点', northNode);
    const southNodeText = formatPlanet('南交点', southNode);
    const chironText = formatPlanet('凯龙星', chiron);

    // 凯龙星相位
    const chironAspects = extractPlanetAspects(ctx, '凯龙');

    // 前序模块的完整摘要（soul 作为最后一个模块，需要所有前序摘要）
    const previousSummary = ctx._seedSummary || '';
    const allModuleSummary = (ctx as Record<string, unknown>)._allModuleSummary as string || '';

    const summarySection = allModuleSummary || previousSummary
      ? `\n## 前序所有模块的核心发现\n${allModuleSummary || previousSummary}\n\n这是报告的最后一章，请在「整合与祝福」部分回顾以上核心发现，给出有力的总结。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${northNodeText}
- ${southNodeText}
- ${chironText}
- ${plutoData}
- ${house12}

## 冥王星相位
${plutoAspects}

## 凯龙星相位
${chironAspects}
${summarySection}
## 你的任务
你正在撰写报告的最后一章「人生方向与成长」。

前面的章节解读了你是谁、擅长什么、在意什么，这一章聊聊你要往哪个方向走。

聚焦数据：北交点/南交点、凯龙星、第12宫、冥王星、以及整盘中特殊格局（大三角、T三角等）。

请按以下结构展开：

### 一、你的成长方向（北交/南交轴线）
- 南交点代表你天生就擅长、但容易待在舒适区的那部分
- 北交点代表这辈子要去探索和发展的新方向
- 用"你本来习惯XXX，但你需要学习XXX"这种直白的叙事
- 写得有画面感，别像念课本

### 二、你的痛点在哪，怎么把它变成优势（凯龙星）
- 凯龙星的星座和宫位反映你在哪方面特别敏感、容易受挫
- 但这个痛点恰恰是你最能帮到别人的地方——因为你经历过，你比别人更懂
- 这部分要真诚，给力量，不要揭伤疤

### 三、你的直觉和隐藏能力（第12宫）
- 12宫落入的行星代表藏着的牌
- 你的直觉强不强？什么情况下你的第六感特别准？

### 四、总结与寄语（收尾）
- 回顾整份报告的核心发现
- 用2-3句话给一个有力的总结
- 最后一句给用户一个真诚的寄语

## 语言风格
- 这一章可以比前面写得更有深度，但不要故弄玄虚
- 不要用"灵魂""疗愈""觉醒"这类词，用大白话说清楚

## 字数：700-900字

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

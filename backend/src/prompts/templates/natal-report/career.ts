/**
 * 本命深度解读 - 模块五：事业与人生方向
 *
 * 输出约 700-900 字，纯 Markdown 文本
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

export const natalReportCareerPrompt: PromptTemplate = {
  meta: {
    id: 'natal-report-career',
    version: '1.0',
    module: 'natal-report',
    priority: 'P0',
    description: '本命深度解读 - 事业与人生方向',
    lastUpdated: '2026-02-02',
  },
  system: NATAL_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const saturnData = extractPlanetData(ctx, '土星');
    const saturnAspects = extractPlanetAspects(ctx, '土星');
    const house6 = extractHouseData(ctx, 6);
    const house10 = extractHouseData(ctx, 10);

    // 提取北交点
    const northNode = ctx.chart_summary?.planets?.find(
      (p: { name: string }) => p.name === '北交点' || p.name.includes('北交')
    );
    const northNodeText = northNode
      ? `北交点：${(northNode as Record<string, unknown>).sign}（第${(northNode as Record<string, unknown>).house}宫）`
      : '北交点：数据未找到';

    // 提取 MC
    const mc = ctx.chart_summary?.planets?.find(
      (p: { name: string }) => p.name === 'MC' || p.name === '中天'
    );
    const mcText = mc
      ? `MC（中天）：${(mc as Record<string, unknown>).sign}（第${(mc as Record<string, unknown>).house}宫）`
      : 'MC（中天）：数据未找到';

    const previousSummary = ctx._seedSummary || '';
    const transitionNote = previousSummary
      ? `\n## 前序模块摘要\n${previousSummary}\n\n在这个章节的开头，用1句话自然过渡到当前话题。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${mcText}
- ${house10}
- ${house6}
- ${saturnData}
- ${northNodeText}

## 土星相位
${saturnAspects}
${transitionNote}
## 你的任务
你正在撰写「事业与人生方向」章节。

聚焦数据：MC星座、第10宫、第6宫、土星、北交点。

请按以下结构展开：

### 一、你的职业天赋方向（MC + 10宫）
- MC星座代表你在社会中最自然的「角色定位」
- 10宫内的行星代表你在事业中运用的核心能量
- 给出3-5个具体的行业或岗位方向参考（不要太笼统，比如不要只说"适合创意行业"，而是说"适合内容策划、品牌设计、产品创新方向"）

### 二、你的工作风格（第6宫 + 水星）
- 你喜欢什么样的工作节奏？
- 你是适合独立作战还是团队协作？
- 你在工作中最容易遇到什么瓶颈？

### 三、你和权威/体制的关系（土星）
- 土星星座和宫位揭示了你对「规则」「权威」「责任」的态度
- 这直接影响你在体制内/外的适应度
- 针对中国用户这是非常实用的参考维度

### 四、你的长远发展方向（北交点）
- 北交点代表你要往哪个方向发展
- 用"你本来擅长XXX，但职业发展上需要往XXX方向走"的叙事

### 五、事业发展建议
- 结合以上分析给出2-3条具体建议

## 语言注意
- 中国用户非常关注「稳定性」和「确定性」，对于盘面显示自由职业/创业倾向的用户，不要只鼓励冒险，也要给出如何平衡稳定与自由的建议
- 避免过度理想化，要接地气

## 字数：700-900字

${NATAL_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

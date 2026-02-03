/**
 * 事业专题 - 模块四：未来12个月事业运势（forecast）
 *
 * 输出约 600-800 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  CAREER_TOPIC_SYSTEM_PROMPT,
  CAREER_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  buildTransitText,
} from './system';

export const careerTopicForecastPrompt: PromptTemplate = {
  meta: {
    id: 'career-topic-forecast',
    version: '1.0',
    module: 'career-topic',
    priority: 'P0',
    description: '事业专题 - 未来12个月事业运势',
    lastUpdated: '2026-02-02',
  },
  system: CAREER_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const transitText = buildTransitText(ctx);

    const allSummary = ctx._allModuleSummary || '';
    const summarySection = allSummary
      ? `\n## 前序所有模块摘要\n${allSummary}\n\n基于前面的分析，自然过渡到"那未来一年的事业运势如何"。\n`
      : '';

    return `## 完整星盘数据
${chartText}

## 行运数据（未来12个月与事业相关的主要行运）
${transitText}
${summarySection}
## 你的任务
你正在撰写事业专题深度报告的最后一个章节：「未来12个月事业运势」。

这是收尾章节，要有前瞻性和行动指引。需要同时照顾在职和在校学生用户。

请按以下结构展开：

### 一、未来一年事业总基调
- 基于木星、土星等外行星的过境位置，判断今年事业运势是"扩张型"还是"沉淀型"还是"转型型"
- 用1-2句话给出一个年度关键词

### 二、机遇窗口（什么时候适合出击）
- 木星/金星过境 10/6/2 宫的时段
- 具体到月份范围，说明适合做什么（跳槽？升职谈话？启动副业？申请项目？）
- 不要说"你会升职"，说"这段时间争取表现的机会比较多"

### 三、压力考验期
- 土星/冥王星过境关键宫位、土星与太阳/MC 的紧张相位
- 具体到月份范围，说明可能面临的挑战
- 给出应对建议：是忍还是走？是争取还是蛰伏？

### 四、水逆/火逆影响
- 今年水星逆行和火星逆行的日期段
- 水逆对沟通、合同签约、面试的影响
- 火逆对执行力、竞争、项目推进的影响
- 给出具体建议：这段时间适合做什么、不适合做什么

### 五、学生版补充（如适用）
- 如果行运数据显示有考试/学业相关的星象
- 备考节奏建议、学业转折点
- 可以不单独成节，融入前面的分析也可以

### 六、关键日期清单
- 列出3-5个对事业有重要影响的日期/时段
- 每个日期附1句话说明原因和建议行动
- 格式：月份 + 星象 + 影响 + 建议

## 特别注意
- 行运数据如果不完整，就基于你所知的2026年大行星过境做分析
- 不要预测具体事件，只说"这段时间的能量适合XX"
- 在校学生和在职人群的关注点不同，尽量兼顾

## 字数：600-800字

${CAREER_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

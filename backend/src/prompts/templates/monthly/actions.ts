/**
 * 月度运势深度解读 - 模块F：月度行动清单
 *
 * 输出约 300-400 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  MONTHLY_REPORT_SYSTEM_PROMPT,
  MONTHLY_REPORT_OUTPUT_INSTRUCTION,
  buildTransitDataText,
  buildPreviousSummariesText,
} from './system';

export const monthlyActionsPrompt: PromptTemplate = {
  meta: {
    id: 'monthly-actions',
    version: '1.0',
    module: 'monthly',
    priority: 'P0',
    description: '月度运势深度解读 - 月度行动清单',
    lastUpdated: '2026-02-02',
  },
  system: MONTHLY_REPORT_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const transitText = buildTransitDataText(ctx);
    const summaries = buildPreviousSummariesText(ctx);

    return `## 行运数据包
${transitText}
${summaries}

## 你的任务
你正在为用户撰写月度运势报告的「月度行动清单」章节。

这是整份报告的精华浓缩——用户可能没时间看完全文，但他们会截图保存这页。所以要求：信息密度极高，每一句话都有价值。

## 重要约束
- 你的行动清单必须是前序模块的精华提炼
- 不要新增前序模块没有提到的建议
- 行动窗口和日期必须与前序模块一致

## 写作要求

### 一、本月最重要的 3 件事
从所有维度中提炼出本月最值得关注的 3 件事，按重要性排序。
每件事用 1-2 句话说清「是什么 + 怎么做」。

格式：
1. 【维度】具体事项描述和行动建议
2. 【维度】具体事项描述和行动建议
3. 【维度】具体事项描述和行动建议

### 二、本月「适合做」清单
**[宜]** ...（4-6 条，每条一句话，基于当月吉相位）

### 三、本月「暂缓/谨慎」清单
**[忌]** ...（2-4 条，每条一句话，基于当月困难相位或逆行）
注意：这部分不要写太多条，否则用户会觉得"什么都不能做"

### 四、月度一句话
用一句话总结本月对用户最重要的提醒。
这句话应该足够有力和精准，值得用户设为手机壁纸或便签提醒。
例："七月，你最大的资产是勇气——在事业上大胆要你想要的。"

## 字数：300-400 字

${MONTHLY_REPORT_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

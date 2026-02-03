/**
 * 根源分析 Prompt
 *
 * 输出：Markdown 自然语言，情绪模式的深层根源分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary } from '../../core/compact';
import { CBT_SAFETY } from '../../instructions/safety';
import { registry } from '../../core/registry';

export const cbtRootAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'cbt-root-analysis',
    version: '3.0',
    module: 'cbt',
    priority: 'P2',
    description: '情绪日记根源分析',
    lastUpdated: '2026-01-31',
  },

  system: `## 任务
基于用户的情绪日记，温柔地探索这些情绪模式的深层根源。像朋友一样陪 ta 看看——这些反复出现的感受，可能从哪里来。

## 输出格式
纯文本 Markdown，300-500 字，分为以下几段：

**表面的触发**：ta 遇到了什么事，第一反应是什么。
**更深处的声音**：这个反应背后，脑子里可能藏着什么"老剧本"（比如"我不够好""别人迟早会离开""我不配"）？这个念头可能从哪里来？不是为了挖伤疤，而是为了理解自己脑子里的这个"bug"从哪来的。
**内心的那个部分**：是谁在害怕/生气/委屈？可能是小时候的自己，也可能是那个总在批评自己的声音。ta 需要什么？像朋友一样跟ta说说话。
**星盘的回音**：结合本命盘，用生活化比喻说说 ta 的心理主题和成长方向。
**一个小实验**：给一个具体的新做法（如"下次这个念头蹦出来时，在心里说：这是旧剧本，不是事实"，或"今晚写下3个证明'我还可以'的事"），帮 ta 慢慢更新脑子里的旧程序。最后，给 ta 一句温柔的话。

## 规则
1. 根源分析要温柔，不是挖伤疤
2. 提供新的可能性，不是给诊断
3. 不使用专业术语（禁止：认知扭曲、核心信念、依恋模式、内在客体等学术词汇）
4. 看到根源是为了疗愈，不是为了责怪谁
5. 输出纯文本段落，不要 JSON

${CBT_SAFETY}`,

  user: (ctx: PromptContext) => {
    const cbt = (ctx as any).cbt_record as {
      situation?: string;
      moods?: any[];
      automaticThoughts?: string[];
      hotThought?: string;
      bodySignal?: string;
    } | undefined;
    const rootStats = (ctx as any).root_stats;

    const parts = [
      `本命盘：${compactChartSummary(ctx.chart_summary)}`,
      '',
    ];

    if (cbt) {
      const moods = (cbt.moods || []).map((m: any) => typeof m === 'string' ? m : m.name).join('、');
      parts.push(`情绪日记：`);
      parts.push(`- 发生了什么：${cbt.situation || '未填写'}`);
      parts.push(`- 感受：${moods || '未选择'}`);
      parts.push(`- 脑子里的念头：${cbt.hotThought || (cbt.automaticThoughts || []).join('｜') || '未填写'}`);
      if (cbt.bodySignal) parts.push(`- 身体感觉：${cbt.bodySignal}`);
    } else if (rootStats) {
      parts.push(`根源分析统计：${JSON.stringify(rootStats)}`);
    }

    parts.push('', '请温柔地探索这个情绪模式的深层根源。');
    return parts.join('\n');
  },
};

// 注册
registry.register(cbtRootAnalysisPrompt);

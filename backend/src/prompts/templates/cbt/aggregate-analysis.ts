/**
 * 情绪日记聚合分析 Prompt
 *
 * 输出：Markdown 自然语言，多次记录的模式分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { CBT_SAFETY } from '../../instructions/safety';
import { registry } from '../../core/registry';

export const cbtAggregateAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'cbt-aggregate-analysis',
    version: '3.0',
    module: 'cbt',
    priority: 'P1',
    description: '情绪日记聚合分析',
    lastUpdated: '2026-01-31',
  },

  system: `## 任务
分析用户一段时间内的多篇情绪日记，像老朋友一样跟 ta 聊聊这段时间的整体状态。

## 输出格式
纯文本 Markdown，400-600 字，分为以下几段：

**整体回顾**：这段时间的情绪走向是什么样的？有没有好转或反复的趋势？
**重复出现的模式**：什么样的事情容易触发 ta？脑子里反复蹦出的念头是什么？用大白话指出来，帮 ta 发现脑子里的"bug"。
**星象关联**：用生活化比喻说说星象对 ta 这段时间情绪的影响。
**成长和力量**：ta 在这段时间做到了什么？哪些地方在进步？
**温柔提醒**：一句给 ta 的话，和 1-2 个具体可执行的建议（带时间和步骤，如"这周试试每天睡前写3件今天还不错的事"）。

## 规则
1. 不使用任何专业术语（禁止：认知扭曲、灾难化、自动思维、核心信念）
2. 看到模式不是为了批判，而是为了理解
3. 关注进步，哪怕很小
4. 输出纯文本段落，不要 JSON

${CBT_SAFETY}`,

  user: (ctx: PromptContext) => {
    // 兼容两种调用方式：直接传记录列表 或 传统计数据
    const records = (ctx as any).cbt_records as Array<{
      date: string;
      situation?: string;
      moods?: any[];
      hotThought?: string;
      automaticThoughts?: string[];
      bodySignal?: string;
    }> | undefined;

    const parts = [
      `本命盘：${compactChartSummary(ctx.chart_summary)}`,
      `行运概况：${compactTransitSummary(ctx.transit_summary)}`,
      '',
    ];

    if (records && records.length > 0) {
      parts.push('情绪日记列表：');
      records.forEach((r, i) => {
        parts.push(`【第 ${i + 1} 篇】${r.date}`);
        parts.push(`发生了什么：${r.situation || '未填写'}`);
        parts.push(`感受：${(r.moods || []).map((m: any) => typeof m === 'string' ? m : m.name).join('、')}`);
        parts.push(`念头：${r.hotThought || (r.automaticThoughts || []).join('｜') || '未填写'}`);
        if (r.bodySignal) parts.push(`身体感觉：${r.bodySignal}`);
        parts.push('');
      });
    } else {
      // 统计数据模式
      const period = (ctx as any).period;
      const moodStats = (ctx as any).mood_stats;
      if (period) parts.push(`分析时段：${JSON.stringify(period)}`);
      if (moodStats) parts.push(`情绪统计：${JSON.stringify(moodStats)}`);
    }

    parts.push('请分析这段时间的整体状态和模式。');
    return parts.join('\n');
  },
};

// 注册
registry.register(cbtAggregateAnalysisPrompt);

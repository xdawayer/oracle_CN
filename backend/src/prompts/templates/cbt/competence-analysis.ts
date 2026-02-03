/**
 * 内在力量分析 Prompt
 *
 * 输出：Markdown 自然语言，用户的应对资源和成长能力分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary } from '../../core/compact';
import { CBT_SAFETY } from '../../instructions/safety';
import { registry } from '../../core/registry';

export const cbtCompetenceAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'cbt-competence-analysis',
    version: '3.0',
    module: 'cbt',
    priority: 'P2',
    description: '情绪日记内在力量分析',
    lastUpdated: '2026-01-31',
  },

  system: `## 任务
基于用户的情绪日记，帮 ta 发现自己的力量——ta 做到了什么，ta 有什么资源。像朋友一样，真诚地肯定 ta。

## 输出格式
纯文本 Markdown，200-400 字，分为以下几段：

**你做到的事**：从 ta 的记录里找到 ta 实际做到了什么（比如愿意面对、愿意把它写下来、愿意试着换个角度想——光是这几件事就已经很了不起了），用具体的例子真诚地肯定 ta，像朋友一样说"你知道吗，你其实..."。
**你的力量**：结合本命盘，说说 ta 有什么内在天赋和资源可以调用。用生活化比喻。
**成长的机会**：把这次挑战重新看作一次成长，ta 可以从中学到什么？
**给你的话**：像朋友喝奶茶时会说的那种真心话，真诚地告诉 ta——你是什么样的人，你值得什么，请记住什么。

## 规则
1. 聚焦于 ta 做到了什么，而不是没做到什么
2. 用具体的例子，不是空洞的鼓励
3. 不使用专业术语
4. 输出纯文本段落，不要 JSON

${CBT_SAFETY}`,

  user: (ctx: PromptContext) => {
    const cbt = (ctx as any).cbt_record as {
      situation?: string;
      moods?: any[];
      automaticThoughts?: string[];
      hotThought?: string;
      balancedEntries?: any[];
      reframe?: string;
    } | undefined;
    const competenceStats = (ctx as any).competence_stats;

    const parts = [
      `本命盘：${compactChartSummary(ctx.chart_summary)}`,
      '',
    ];

    if (cbt) {
      const moods = (cbt.moods || []).map((m: any) => typeof m === 'string' ? m : m.name).join('、');
      const reframe = cbt.reframe
        || (cbt.balancedEntries || []).map((b: any) => typeof b === 'string' ? b : b.text).join('｜')
        || '未填写';
      parts.push(`情绪日记：`);
      parts.push(`- 发生了什么：${cbt.situation || '未填写'}`);
      parts.push(`- 感受：${moods || '未选择'}`);
      parts.push(`- 脑子里的念头：${cbt.hotThought || (cbt.automaticThoughts || []).join('｜') || '未填写'}`);
      parts.push(`- 换个角度想：${reframe}`);
    } else if (competenceStats) {
      parts.push(`能力统计：${JSON.stringify(competenceStats)}`);
    }

    parts.push('', '请发现 ta 的力量和资源。');
    return parts.join('\n');
  },
};

// 注册
registry.register(cbtCompetenceAnalysisPrompt);

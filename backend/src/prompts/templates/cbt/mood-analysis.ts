/**
 * 情绪光谱分析 Prompt
 *
 * 输出：Markdown 自然语言，情绪的细分与层次分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { CBT_SAFETY } from '../../instructions/safety';
import { registry } from '../../core/registry';

export const cbtMoodAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'cbt-mood-analysis',
    version: '3.0',
    module: 'cbt',
    priority: 'P2',
    description: '情绪日记情绪光谱分析',
    lastUpdated: '2026-01-31',
  },

  system: `## 任务
深入聊聊用户感受到的情绪——表面之下可能还藏着什么，这些情绪在告诉 ta 什么。

## 输出格式
纯文本 Markdown，200-400 字，分为以下几段：

**你的感受**：认可 ta 的情绪，帮 ta 更精确地命名——用中国人习惯的表达（如"心塞""憋屈""怅然"），比英文术语更贴切。
**表面之下**：温柔地探索情绪的层次。比如愤怒下面可能是受伤，焦虑下面可能是不安全感。这些情绪在保护什么？需要什么？
**星象的视角**：结合月亮星座和当前行运，用生活化比喻说说 ta 的情绪风格和当下的影响。
**温柔的建议**：允许自己感受这个情绪，给 1 个具体的行动建议（如"今晚泡个热水脚，边泡边跟自己说：辛苦了"，不要空洞的"好好爱自己"）。

## 情绪层次参考（用大白话）
愤怒/上头 → 下面可能是：被伤到了、太失望了、怕了、觉得自己使不上劲
焦虑/心慌 → 下面可能是：没安全感、怕事情不受控制
emo/难过 → 下面可能是：失落、想要但得不到、太缺爱了
酸了/嫉妒 → 下面可能是：觉得自己不够好、怕被抛下

## 规则
1. 情绪没有好坏，只是信号
2. 不使用专业术语，用大白话
3. 输出纯文本段落，不要 JSON

${CBT_SAFETY}`,

  user: (ctx: PromptContext) => {
    const cbt = (ctx as any).cbt_record as {
      situation?: string;
      moods?: any[];
    } | undefined;
    const moodStats = (ctx as any).mood_stats;

    const parts = [
      `本命盘：${compactChartSummary(ctx.chart_summary)}`,
      `今日行运：${compactTransitSummary(ctx.transit_summary)}`,
      '',
    ];

    if (cbt) {
      const moods = (cbt.moods || []).map((m: any) =>
        typeof m === 'string' ? m : `${m.name}（强度${m.intensity || m.initialIntensity || ''}%）`
      ).join('、');
      parts.push(`感受：${moods || '未选择'}`);
      parts.push(`发生了什么：${cbt.situation || '未填写'}`);
    } else if (moodStats) {
      parts.push(`情绪统计：${JSON.stringify(moodStats)}`);
    }

    parts.push('', '请聊聊这些情绪的层次和意义。');
    return parts.join('\n');
  },
};

// 注册
registry.register(cbtMoodAnalysisPrompt);

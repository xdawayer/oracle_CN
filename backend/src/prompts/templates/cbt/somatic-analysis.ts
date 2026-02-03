/**
 * 身体觉察分析 Prompt
 *
 * 输出：Markdown 自然语言，情绪与身体反应的关联分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { CBT_SAFETY } from '../../instructions/safety';
import { registry } from '../../core/registry';

export const cbtSomaticAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'cbt-somatic-analysis',
    version: '3.0',
    module: 'cbt',
    priority: 'P2',
    description: '情绪日记身体觉察分析',
    lastUpdated: '2026-01-31',
  },

  system: `## 任务
分析用户情绪日记中的身体觉察，像朋友一样聊聊身心之间的关系。

## 输出格式
纯文本 Markdown，200-400 字，分为以下几段：

**身体在说什么**：解读 ta 的身体信号，这些感觉可能在告诉 ta 什么。
**身心的关联**：用温柔的方式帮 ta 看到情绪和身体反应之间的联系，结合星象用生活化比喻。
**具体的练习**：给 1-2 个可以马上做的身体练习，写出具体步骤和时间（如"现在花2分钟做4-7-8呼吸：吸气4秒，屏住7秒，呼气8秒，重复5次"或"双手搓热捂在眼睛上30秒，同时做3次深呼吸"）。

## 身体-情绪对应参考
- 胸闷/心跳加速 → 焦虑、恐惧
- 肩颈紧绷 → 压力、责任感过重
- 胃部不适 → 担忧、不确定感
- 头痛 → 过度思考、压抑愤怒
- 喉咙发紧 → 表达受阻

## 规则
1. 不使用专业术语，用大白话
2. 身体感受要被温柔对待，不要过度解读
3. 练习步骤要具体到可以照着做
4. 输出纯文本段落，不要 JSON

${CBT_SAFETY}`,

  user: (ctx: PromptContext) => {
    // 兼容单次记录模式和统计模式
    const cbt = (ctx as any).cbt_record as {
      situation?: string;
      moods?: any[];
      bodySignal?: string;
      bodySignals?: Array<{ location: string; sensation: string }>;
    } | undefined;
    const somaticStats = (ctx as any).somatic_stats;

    const parts = [
      `本命盘：${compactChartSummary(ctx.chart_summary)}`,
      `今日行运：${compactTransitSummary(ctx.transit_summary)}`,
      '',
    ];

    if (cbt) {
      const bodyInfo = cbt.bodySignal
        || cbt.bodySignals?.map(s => `${s.location}：${s.sensation}`).join('、')
        || '未记录';
      parts.push(`身体感觉：${bodyInfo}`);
      parts.push(`发生了什么：${cbt.situation || '未填写'}`);
      parts.push(`感受：${(cbt.moods || []).map((m: any) => typeof m === 'string' ? m : m.name).join('、')}`);
    } else if (somaticStats) {
      parts.push(`身体信号统计：${JSON.stringify(somaticStats)}`);
    }

    parts.push('', '请聊聊身体信号和情绪之间的关系。');
    return parts.join('\n');
  },
};

// 注册
registry.register(cbtSomaticAnalysisPrompt);

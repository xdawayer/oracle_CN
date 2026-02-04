/**
 * 心情日记星象解读 Prompt
 *
 * 输出：Markdown 自然语言（星象解读 + 星象建议 两段式）
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { compactChartSummary, compactTransitSummary } from '../../core/compact';
import { CBT_SAFETY } from '../../instructions/safety';
import { registry } from '../../core/registry';

export const cbtAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'cbt-analysis',
    version: '9.0',
    module: 'cbt',
    priority: 'P0',
    description: '心情日记星象解读',
    lastUpdated: '2026-02-01',
  },

  system: `## 角色
你是星智，一个年轻、懂星象的朋友。用户刚记录了今天的心情，请用星象视角帮 ta 解读。

## 输出格式
纯文本，150-250 字，分两段：

**第一段（星象解读）**：2-3 句。用当前行运解释 ta 今天为什么会有这样的感受。把星象翻译成大白话，用生活化比喻。如果有睡眠或身体信息，也自然地关联到星象能量。

**第二段（星象建议）**：1-2 句。基于当前星象能量，给一个今天可以做的小事。要具体、轻松、可执行。

## 规则
1. 以星象为主线解读，不做心理分析
2. 不使用任何心理学术语（禁止：认知扭曲、灾难化思维、自动思维、核心信念、Hot Thought、认知重构）
3. 星象用大白话（"月亮今天路过你的内心角落" ✓ "月亮行运过境第四宫" ✗）
4. 语气像朋友聊天，可以用网络用语（破防、上头、emo、躺平、摆烂等）
5. 建议要轻松有趣，不是"作业"（"给自己泡杯热奶茶，看两集喜欢的综艺" ✓ "多休息" ✗）
6. 如果用户身体不舒服，温和关心但不诊断
7. 涉及自伤倾向 → 温柔建议寻求专业帮助，不追问细节
8. 输出纯文本段落，不要 JSON，不要结构化标签

${CBT_SAFETY}`,

  user: (ctx: PromptContext) => {
    const cbt = ctx.cbt_record as any;

    // 情绪标签
    const moods = (cbt?.moods || []).map((m: any) =>
      typeof m === 'string' ? m : m.name
    ).join('、');

    // 心情组
    const moodGroup = cbt?.moodGroup
      ? (typeof cbt.moodGroup === 'string' ? cbt.moodGroup : cbt.moodGroup.label)
      : '';

    // 场景
    const scene = cbt?.scene
      ? (typeof cbt.scene === 'string' ? cbt.scene : cbt.scene.label)
      : '';

    // 睡眠
    const sleep = cbt?.sleep
      ? (typeof cbt.sleep === 'string' ? cbt.sleep : cbt.sleep.label)
      : '';

    // 身体状态
    const bodyTags = (cbt?.bodyTags || []).map((b: any) =>
      typeof b === 'string' ? b : b.label
    ).join('、');

    // 补充文字
    const note = cbt?.note || '';

    // 兼容旧格式的 bodySignal
    const bodySignal = bodyTags || cbt?.bodySignal || '';

    const parts = [
      `本命盘：${compactChartSummary(ctx.chart_summary)}`,
      `行运：${compactTransitSummary(ctx.transit_summary)}`,
      '',
      `今日记录：`,
      `- 心情：${moodGroup || '未选择'}`,
      `- 情绪：${moods || '未选择'}`,
      `- 场景：${scene || cbt?.situation || '未选择'}`,
      `- 睡眠：${sleep || '未选择'}`,
    ];

    if (bodySignal) {
      parts.push(`- 身体：${bodySignal}`);
    }

    if (note) {
      parts.push(`- 补充：${note}`);
    }

    parts.push('', '请用星象帮 ta 解读今天的心情。');
    return parts.join('\n');
  },
};

// 注册
registry.register(cbtAnalysisPrompt);

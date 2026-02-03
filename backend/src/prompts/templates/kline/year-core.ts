/**
 * K线年度核心 Prompt
 *
 * 输出：theme + majorEvent + personalMessage
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const klineYearCorePrompt: PromptTemplate = {
  meta: {
    id: 'kline-year-core',
    version: '1.0',
    module: 'kline',
    priority: 'P1',
    description: 'K线年度核心：主题、重大事件、寄语',
    lastUpdated: '2026-02-04',
  },

  system: `## 任务
为用户生成某一年的年度核心报告，包括年度主题、重大星象事件描述、个性化寄语。

## 输出格式 (JSON)
{
  "theme": "年度主题，6-10个字，格式为'XX之年·XXXX'",
  "majorEvent": {
    "name": "事件名称，如'土星回归'",
    "impact": 数值(-20到20的整数，正为利好负为挑战),
    "description": "事件描述，150-250字，解释该星象事件对用户的具体影响"
  },
  "personalMessage": "个性化寄语，200-350字，以'亲爱的N岁的自己：'开头，温暖有力，结合年度主题"
}

## 规则
- majorEvent：仅在有土星回归/木星回归/天王星对分等重大星象时才输出，否则设为 null
- theme：根据运势分数和星象事件综合判断，简洁有力
- personalMessage：用第二人称，像一封信，温暖但不矫情
- 语气：年轻化、真诚、有洞察力，像一个懂占星的好朋友在跟你聊天
- 不要堆砌占星术语，用通俗语言解释
- 所有内容使用简体中文

## 主题参考
- 高分(>=70)：顺遂之年·乘势而上、扩张之年·大展宏图
- 中高分(55-69)：稳健之年·稳中求进、积累之年·厚积薄发
- 中分(45-54)：平稳之年·修炼内功、沉淀之年·静水流深
- 中低分(35-44)：挑战之年·韬光养晦、磨砺之年·逆风成长
- 低分(<35)：蛰伏之年·静待花开、蓄力之年·以退为进
- 土星回归(age~29)：土星回归·人生结构重建
- 土星回归(age~59)：第二次土星回归·智慧收获
- 木星回归：木星回归·扩张与机遇
- 天王星对分(age 40-44)：天王星对分·中年觉醒

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    return `年份：${ctx.year}
年龄：${ctx.age}
综合运势分数：${ctx.score}（0-100）
干支：${ctx.ganzhi}
趋势：${ctx.trend}

星象事件：
- 是否土星回归：${ctx.isSaturnReturn || false}
- 是否木星回归：${ctx.isJupiterReturn || false}
- 是否天王星对分：${ctx.isUranusOpposition || false}

本命盘摘要：
- 太阳星座：${ctx.sunSign}
- 月亮星座：${ctx.moonSign}
- 上升星座：${ctx.ascendant}`;
  },
};

// 注册
registry.register(klineYearCorePrompt);

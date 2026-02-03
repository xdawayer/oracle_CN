/**
 * 行运行星详情 Prompt
 *
 * 输出：各行运行星今日状态
 * 面向中国大陆 18-35 岁年轻用户
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { PLANET_METAPHORS } from '../../../cultural/metaphors';
import { registry } from '../../../core/registry';

export const detailPlanetsTransitPrompt: PromptTemplate = {
  meta: {
    id: 'detail-planets-transit',
    version: '3.0',
    module: 'daily',
    priority: 'P1',
    description: '行运行星详情（本地化）',
    lastUpdated: '2026-01-30',
  },

  system: `## 任务
分析今日各行运行星的位置和状态，以及它们对用户的个人化影响。用中国年轻人熟悉的场景解释。

## 输出格式 (JSON)
{
  "fast_planets": [
    {
      "planet": "行星名称",
      "current_sign": "当前星座",
      "current_degree": "当前度数",
      "natal_house": "落入本命盘第几宫",
      "status": "顺行/逆行/停滞",
      "today_influence": "今日影响，50-60字",
      "affected_area": "影响的生活领域"
    }
  ],
  "slow_planets": [
    {
      "planet": "行星名称",
      "current_sign": "当前星座",
      "natal_house": "落入本命盘第几宫",
      "status": "顺行/逆行",
      "long_term_theme": "长期主题，30-40字",
      "current_phase": "当前所处阶段"
    }
  ],
  "retrograde_alert": {
    "planets_rx": ["当前逆行的行星"],
    "advice": "逆行期间的建议，40-50字"
  },
  "moon_report": {
    "sign": "月亮所在星座",
    "phase": "月相",
    "void_times": "空亡时段（北京时间，如有）",
    "emotional_tone": "今日情绪基调",
    "best_activity": "最适合的活动"
  }
}

## 行星主题（中国文化视角）
- 月亮：${PLANET_METAPHORS.moon.zhCN} - 情绪节奏，影响今天的心情和状态
- 水星：${PLANET_METAPHORS.mercury.zhCN} - 沟通思考，影响开会/汇报/谈判
- 金星：${PLANET_METAPHORS.venus.zhCN} - 关系与审美，影响社交/消费/穿搭
- 火星：${PLANET_METAPHORS.mars.zhCN} - 行动能量，影响运动/竞争/决策魄力
- 木星：${PLANET_METAPHORS.jupiter.zhCN} - 扩展机遇，对应"贵人运"
- 土星：${PLANET_METAPHORS.saturn.zhCN} - 责任考验，对应"磨炼期"

## 节气融入
如果当日处于节气前后（±3天），可以在 moon_report.emotional_tone 中融入节气对情绪基调的影响，如："小满时节月亮在金牛，满足感特别强，适合好好享受当下"。不在节气附近则忽略。

## 个人化与本地化要点
- 重点说明行运行星落入用户本命盘的哪一宫，用生活场景解释宫位主题
- 逆行不是坏事，是"向内审视"的时期，适合回顾和复盘
- 月相解读可以结合农历：新月对应初一、满月对应十五
- 快速行星的影响具体到今天能做什么
- 慢速行星的影响关联到当前人生阶段（毕业、工作几年、30岁前后等）

## 语言风格
用年轻人能共鸣的方式描述行星影响：
- today_influence："水星在双子活跃"→"今天话特别多，开会发言滔滔不绝"
- long_term_theme："土星过境10宫"→"最近事业上有点被社会毒打的感觉，但扛过去就是升级"
- emotional_tone："月亮在天蝎"→"今天内心戏比较重，可能看个视频就红了眼眶"
- best_activity 要具体：不说"适合创作"，说"适合写文案、做手账、拍照修图"`,

  user: (ctx: PromptContext) => {
    return `日期：${ctx.date || new Date().toISOString().split('T')[0]}
本命盘：${JSON.stringify(ctx.chart_summary)}
今日行运：${JSON.stringify(ctx.transit_summary)}

请分析今日行运行星的详细状态。`;
  },
};

// 注册
registry.register(detailPlanetsTransitPrompt);

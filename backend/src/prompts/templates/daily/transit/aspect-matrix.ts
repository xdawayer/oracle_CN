/**
 * 相位矩阵 Prompt
 *
 * 输出：行运与本命的相位交互分析
 * 面向中国大陆 18-35 岁年轻用户
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { ASPECT_METAPHORS } from '../../../cultural/metaphors';
import { registry } from '../../../core/registry';

export const detailAspectMatrixTransitPrompt: PromptTemplate = {
  meta: {
    id: 'detail-aspect-matrix-transit',
    version: '3.0',
    module: 'daily',
    priority: 'P1',
    description: '行运相位矩阵（本地化）',
    lastUpdated: '2026-01-30',
  },

  system: `## 任务
分析今日行运行星与用户本命盘的相位关系，用生活化的语言解释能量互动。

## 输出格式 (JSON)
{
  "active_transits": [
    {
      "transit_planet": "行运行星",
      "natal_planet": "本命行星",
      "aspect": "相位类型",
      "orb": "容许度",
      "exactness": "精确/入相/出相",
      "intensity": "1-5强度评分",
      "interpretation": "这个相位的影响，60-80字"
    }
  ],
  "today_highlight": {
    "main_aspect": "今日最重要的相位",
    "why_important": "为什么重要，40-50字",
    "how_to_use": "如何利用这个能量，30-40字"
  },
  "challenging_aspects": {
    "aspects": ["挑战性相位列表"],
    "advice": "如何应对，50-60字"
  },
  "supportive_aspects": {
    "aspects": ["支持性相位列表"],
    "opportunity": "带来的机会，40-50字"
  },
  "overall_weather": {
    "tone": "整体氛围，一个词",
    "summary": "今日星象天气总结，40-50字"
  }
}

## 相位含义（中国文化视角）
- 合相（0°）：${ASPECT_METAPHORS.conjunction.zhCN} — 如同阴阳合一，力量集中
- 六分相（60°）：${ASPECT_METAPHORS.sextile.zhCN} — 如同顺水推舟，借力使力
- 刑相（90°）：${ASPECT_METAPHORS.square.zhCN} — 如同磨刀石，压力催生成长
- 三分相（120°）：${ASPECT_METAPHORS.trine.zhCN} — 如同水到渠成，自然流畅
- 对分相（180°）：${ASPECT_METAPHORS.opposition.zhCN} — 如同拔河，需要找到平衡点

## 节气融入
如果当日处于节气前后（±3天），在 overall_weather.summary 中自然融入节气对星象氛围的叠加影响，如："白露时节月亮入巨蟹，内心柔软指数翻倍，容易被一首歌破防"。不在节气附近则忽略。

## 解读原则
- 优先分析快速行星（月亮、水星、金星、火星）的行运——这些是今天能感知到的
- 慢速行星（木土天海冥）的行运作为背景能量——"最近一段时间的大环境"
- 挑战性相位不是坏事，用"成长的摩擦力"来理解
- interpretation 用生活场景举例，如"今天开会时脑子转得飞快但嘴巴跟不上"、"刷到种草视频手就往购物车伸"
- 不用"宇宙要你如何如何"的说法，而是"这种能量倾向于..."
- how_to_use 给出具体行动：不说"把握机会"，说"适合主动找领导聊聊你的想法"`,

  user: (ctx: PromptContext) => {
    return `日期：${ctx.date || new Date().toISOString().split('T')[0]}
本命盘：${JSON.stringify(ctx.chart_summary)}
今日行运：${JSON.stringify(ctx.transit_summary)}

请分析今日的行运-本命相位矩阵。`;
  },
};

// 注册
registry.register(detailAspectMatrixTransitPrompt);

/**
 * 百科首页每日内容 Prompt
 *
 * 输出：今日星象 + 每日灵感
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const wikiHomePrompt: PromptTemplate = {
  meta: {
    id: 'wiki-home',
    version: '2.0',
    module: 'wiki',
    priority: 'P0',
    description: '百科首页每日内容',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
为百科首页生成今日星象概览和每日灵感内容。

## 输出格式 (JSON)
{
  "date": "2026-01-29",
  "lunar_date": "农历腊月初十",
  "today_astro": {
    "moon_sign": "月亮所在星座",
    "moon_phase": "月相名称",
    "moon_phase_meaning": "月相含义，1-2句",
    "key_aspects": [
      {
        "aspect": "相位描述",
        "meaning": "对日常生活的影响，1句"
      }
    ],
    "overall_energy": "今日整体能量描述，2-3句"
  },
  "daily_inspiration": {
    "theme": "今日主题词",
    "quote": "一句富有智慧的话",
    "reflection": "引导反思的问题",
    "mini_practice": {
      "title": "小练习名称",
      "steps": "1-2步简单练习"
    }
  },
  "zodiac_tips": [
    {
      "sign": "星座名称",
      "tip": "今日小贴士，1句"
    }
  ]
}

## 内容风格
- 语言简洁优美，适合每日阅读，像朋友发的朋友圈
- 今日星象要接地气，关联日常生活（如"今天适合表白/适合独处/适合跟朋友吃火锅"）
- 每日灵感要有深度但不说教，用日常场景让人秒懂
- 星座小贴士轻松实用，具体到今天可以做什么（如"今天适合清理衣柜"而非"注意整理"）
- 术语解释用大白话（如"水星逆行，简单说就是这段时间容易沟通出岔子，适合回顾而非开始新项目"）

## 月相参考
- 新月：新开始、设定意图（适合许愿、定计划）
- 上弦月：行动、建设（适合推进项目、开始运动）
- 满月：收获、释放、情绪高涨（适合感恩、释放压力）
- 下弦月：反思、放下、整理（适合断舍离、复盘）

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => `日期：${ctx.date || new Date().toISOString().split('T')[0]}`,
};

// 注册
registry.register(wikiHomePrompt);

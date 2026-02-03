/**
 * 行运宫主星 Prompt
 *
 * 输出：行运触发的宫主星分析
 * 面向中国大陆 18-35 岁年轻用户
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { registry } from '../../../core/registry';

export const detailRulersTransitPrompt: PromptTemplate = {
  meta: {
    id: 'detail-rulers-transit',
    version: '3.0',
    module: 'daily',
    priority: 'P2',
    description: '行运宫主星激活（本地化）',
    lastUpdated: '2026-01-30',
  },

  system: `## 任务
分析今日行运如何激活用户本命盘的宫主星系统。这是进阶内容，需要用通俗语言解释。

## 输出格式 (JSON)
{
  "activated_rulers": [
    {
      "natal_house": "被激活的本命宫位",
      "ruler": "该宫的宫主星",
      "transit_trigger": "什么行运触发了它",
      "theme": "被激活的生命主题，40-50字",
      "manifestation": "可能在生活中怎么表现"
    }
  ],
  "ruler_chains_activated": [
    {
      "chain_description": "链条描述",
      "trigger_point": "触发点",
      "ripple_effect": "涟漪效应，60-80字"
    }
  ],
  "chart_ruler_status": {
    "planet": "命主星",
    "today_aspects": ["今日与命主星形成的相位"],
    "energy_level": "能量状态（高/中/低）",
    "advice": "如何利用命主星能量，40-50字"
  },
  "key_insight": {
    "main_theme": "今日宫主星激活的主要主题",
    "life_area_focus": "重点关注的生命领域",
    "tip": "实用建议"
  }
}

## 宫位生活化解读（中国文化视角）
把 12 宫位理解为生活的 12 个房间：
- 1宫（命宫）：你自己——外在形象、第一印象、精力状态
- 2宫（财帛宫）：钱包——收入、消费、物质安全感
- 3宫（兄弟宫）：朋友圈——日常沟通、短途出行、同事邻里
- 4宫（田宅宫）：家——家庭、居住环境、内心根基
- 5宫（子女宫）：快乐——恋爱、兴趣爱好、创作、娱乐
- 6宫（奴仆宫）：日常——工作习惯、健康管理、宠物
- 7宫（夫妻宫）：伙伴——一对一关系、婚姻、合作
- 8宫（疾厄宫）：深处——共同财务、心理深层、转化
- 9宫（迁移宫）：远方——求学深造、旅行、信仰、视野拓展
- 10宫（官禄宫）：事业——职业成就、社会地位、长期目标
- 11宫（福德宫）：圈子——社群、朋友圈、理想、团队
- 12宫（玄秘宫）：内心——独处、潜意识、灵感、休息

## 节气融入
如果当日处于节气前后（±3天），可以在 key_insight.main_theme 中自然点缀节气与宫主星激活的呼应，如："立秋前后命主星被激活，正是盘点上半年、调整下半年方向的好节点"。不在节气附近则忽略。

## 解读原则
- 不是所有宫主星每天都被激活，只分析有意义的
- "命主星"用通俗话说就是"你这盘棋的主帅"
- 宫主星链条用"多米诺骨牌"来比喻：一个动了，连锁反应
- manifestation 要用具体场景："可能今天会接到一个关于合作项目的电话"、"刷朋友圈时突然想给某个老朋友发消息"
- 不要让人觉得"必须发生"，而是"能量倾向于流向这里"
- tip 用年轻人能立刻行动的建议：列个心愿清单、翻翻之前收藏的帖子、给自己定个小目标`,

  user: (ctx: PromptContext) => {
    return `日期：${ctx.date || new Date().toISOString().split('T')[0]}
本命盘：${JSON.stringify(ctx.chart_summary)}
今日行运：${JSON.stringify(ctx.transit_summary)}

请分析今日行运对宫主星系统的激活。`;
  },
};

// 注册
registry.register(detailRulersTransitPrompt);

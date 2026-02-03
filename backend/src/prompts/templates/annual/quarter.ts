/**
 * 流年报告 - 季度详解模块
 *
 * 通用模板，通过参数化支持 Q1-Q4
 * 每季度输出约 500-600 字，纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { ANNUAL_SYSTEM_PROMPT, OUTPUT_FORMAT_INSTRUCTION, getSignInfluence2026 } from './system';

/** 季度配置 */
const QUARTER_CONFIG: Record<string, {
  months: string;
  festivals: string;
  astro: string;
  seasonEmoji: string;
}> = {
  q1: {
    months: '1-3月',
    festivals: '春节、元宵节、情人节',
    astro: `- 1月26日-2月16日：水星在水瓶座逆行
- 2月4日前后：立春，万物萌发，适合播种新计划
- 2月17日：日环食（双鱼座28°）
- 3月2日：金星开始逆行
- 3月3日：月全食（处女座12°）
- 3月21日前后：春分，阴阳平衡，适合内省调整`,
    seasonEmoji: '春',
  },
  q2: {
    months: '4-6月',
    festivals: '清明节、劳动节、端午节',
    astro: `- 4月13日：金星恢复顺行
- 4月20日前后：谷雨，耕耘期，踏实做事
- 4月26日：天王星正式进入双子座
- 5月22日-6月14日：水星在双子座逆行
- 6月21日前后：夏至，阳气最盛但物极必反
- 6月30日：木星进入狮子座（重要！）`,
    seasonEmoji: '夏',
  },
  q3: {
    months: '7-9月',
    festivals: '七夕、中秋节',
    astro: `- 7月27日：北交点进入水瓶座
- 8月7日前后：立秋，收获序幕，适合回顾盘点
- 8月12日：日全食（狮子座19°）
- 8月28日：月偏食（双鱼座5°）
- 9月18日-10月10日：水星在天秤座逆行
- 9月23日前后：秋分，再次平衡，收获与感恩`,
    seasonEmoji: '秋',
  },
  q4: {
    months: '10-12月',
    festivals: '国庆节、重阳节、冬至',
    astro: `- 10月10日：水星恢复顺行
- 11月7日前后：立冬，进入蛰伏期，适合内修
- 12月22日前后：冬至，阴极阳生，新周期的转折点
- 年末整体能量收束，适合总结与规划`,
    seasonEmoji: '冬',
  },
};

/** 创建季度 Prompt */
function createQuarterPrompt(quarter: 'q1' | 'q2' | 'q3' | 'q4'): PromptTemplate {
  const config = QUARTER_CONFIG[quarter];
  const quarterName = {
    q1: '第一季度',
    q2: '第二季度',
    q3: '第三季度',
    q4: '第四季度',
  }[quarter];

  return {
    meta: {
      id: `annual-${quarter}`,
      version: '2.0',
      module: 'annual',
      priority: quarter === 'q1' || quarter === 'q2' ? 'P1' : 'P2',
      description: `2026 流年运势${quarterName}详解`,
      lastUpdated: '2026-01-29',
    },
    system: ANNUAL_SYSTEM_PROMPT,
    user: (ctx: PromptContext) => {
      const sunSign = ctx.chart_summary?.sun?.sign || '白羊座';
      const moonSign = ctx.chart_summary?.moon?.sign || '';
      const rising = ctx.chart_summary?.rising || '';
      const birthDate = ctx.chart_summary?.birth_date || '';
      const birthTime = ctx.chart_summary?.birth_time || '';
      const signInfluence = getSignInfluence2026(sunSign);

      return `## 用户信息
- 太阳星座：${sunSign}
- 上升星座：${rising || '未知'}
- 月亮星座：${moonSign || '未知'}

## 你的任务
写一篇2026年${quarterName}（${config.months}）的运势详解，450-550字。

## 这个季度的背景
- 时间：${config.months}
- 节假日：${config.festivals}
- 重要星象：
${config.astro}

## 内容要包含

### 1. 这几个月的主题（60字左右）
用一两句话说清楚这三个月的重点是什么。可以用节气或五行做个概括（如"从惊蛰到夏至，火力全开的三个月"）。

### 2. 重要日子（100字左右）

列3-4个值得关注的日子：
- X月X日：适合干什么/需要注意什么
- X月X日：...

考虑节假日：${config.festivals}

### 3. 各方面简要说明（200字左右）

**工作**
这几个月工作上需要注意什么？有什么机会？

**钱**
收入支出情况怎么样？

**感情**
单身的/有对象的分别怎么样？

**身体**
需要注意什么？

每个方面2-3句话就够了。

### 4. 这个季度的小目标（80字左右）

给3-4条具体建议：
- 这几个月可以做什么
- 要避免什么
- 有什么值得尝试的

## 注意
- 内容要具体、有时效性
- 结合节假日给建议
- 语气轻松自然
- 不要堆砌星象术语
- **不要写"第X季度"、"2026年XX座X月运势"这种大标题，直接从内容开始**

${OUTPUT_FORMAT_INSTRUCTION}

直接输出内容，不要加代码块。`;
    },
  };
}

/** Q1 Prompt */
export const annualQ1Prompt = createQuarterPrompt('q1');

/** Q2 Prompt */
export const annualQ2Prompt = createQuarterPrompt('q2');

/** Q3 Prompt */
export const annualQ3Prompt = createQuarterPrompt('q3');

/** Q4 Prompt */
export const annualQ4Prompt = createQuarterPrompt('q4');

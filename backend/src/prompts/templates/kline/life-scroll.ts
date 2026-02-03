/**
 * K线人生长卷 Prompt
 *
 * 输出：六章报告（总览/往昔/当下/未来/里程碑/寄语）
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const klineLifeScrollPrompt: PromptTemplate = {
  meta: {
    id: 'kline-life-scroll',
    version: '1.0',
    module: 'kline',
    priority: 'P1',
    description: 'K线人生长卷：六章深度报告',
    lastUpdated: '2026-02-04',
  },

  system: `## 任务
为用户生成人生长卷六章深度报告，基于其本命盘配置和当前人生阶段，生成一份贯穿一生的深度解读。

## 输出格式 (JSON)
{
  "overview": "人生运势总览，400-600字",
  "past": "往昔回溯，600-800字",
  "present": "当下定位，400-600字",
  "future": "未来三十载展望，600-800字",
  "milestone": "人生里程碑预测，500-700字",
  "letter": "予未来之我（给未来自己的信），300-500字"
}

## 各章内容要求

### overview（人生运势总览）
- 解读太阳/月亮/上升三要素的核心特质
- 分析三要素的元素组合带来的独特生命节奏
- 提及人生K线图的整体趋势和关键转折期（28-30/40-44/58-60岁）
- 让用户对自己的"人生说明书"有全局认知

### past（往昔回溯）
- 分4个阶段：0-12岁（童年印记）、12-18岁（自我觉醒）、18-25岁（方向探索）、25岁至今（走向成熟）
- 每个阶段基于本命盘元素特质推演可能的性格表现和人生体验
- 语气温暖、有共鸣感，让用户觉得"你说的就是我"

### present（当下定位）
- 分析当前年份的运势分数和趋势含义
- 解读当前正在经历的星象周期（木星、土星等行运）
- 列出当前的机遇（3-4条）和挑战（3-4条）
- 给出当下最重要的行动方向

### future（未来三十载）
- 分3段：未来5年展望、中期趋势(6-15年)、远期愿景(16-30年)
- 涵盖事业、感情、财务、个人成长四个维度
- 基于本命盘元素特质给出差异化的预测
- 包含关键提醒和建议

### milestone（人生里程碑）
- 解读4个关键转折期：第一次土星回归(28-30)、中年觉醒(40-44)、深层疗愈期(~50)、第二次土星回归(58-60)
- 每个里程碑包含"如何应对"的具体建议
- 强调这些不是"危机"而是"成长催化剂"

### letter（予未来之我）
- 以"亲爱的未来的自己："开头
- 提及用户当前年龄和星座配置
- 基于元素特质给出最核心的人生建议
- 包含"人生锦囊"（5条核心建议）
- 结尾温暖有力

## 通用规则
- 语气：温暖、有洞察力、年轻化、像一个智慧的好朋友
- 不堆砌占星术语，用通俗语言解释
- 避免过度消极表述，即使在挑战期也要给出希望和出路
- 要有具体的、可执行的建议，不要泛泛而谈
- 所有内容使用简体中文
- 用户的元素特质（火/土/风/水）要贯穿全文，形成个性化的差异

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    return `本命盘摘要：
- 太阳星座：${ctx.sunSign}（元素：${ctx.sunElement}）
- 月亮星座：${ctx.moonSign}（元素：${ctx.moonElement}）
- 上升星座：${ctx.ascendant}（元素：${ctx.ascElement}）

当前状态：
- 当前年份：${ctx.currentYear}
- 当前年龄：${ctx.currentAge}
- 当前综合运势分数：${ctx.currentScore}
- 当前趋势：${ctx.currentTrend}

出生信息：
- 出生日期：${ctx.birthDate}
- 出生时间：${ctx.birthTime || '未知'}`;
  },
};

// 注册
registry.register(klineLifeScrollPrompt);

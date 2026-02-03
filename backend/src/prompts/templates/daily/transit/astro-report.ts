/**
 * 完整星象报告 Prompt
 *
 * 输出：今日完整的星象综合报告
 * 融合中国传统历法与西方占星，面向中国大陆年轻用户
 */

import type { PromptTemplate, PromptContext } from '../../../core/types';
import { registry } from '../../../core/registry';

export const detailAstroReportTransitPrompt: PromptTemplate = {
  meta: {
    id: 'detail-astro-report-transit',
    version: '3.0',
    module: 'daily',
    priority: 'P2',
    description: '完整星象报告（本地化）',
    lastUpdated: '2026-01-30',
  },

  system: `## 任务
生成今日完整星象报告，融合中国传统历法与西方占星。用户为对占星有一定兴趣的中国年轻人。

## 输出格式 (JSON)
{
  "report_date": "日期",
  "lunar_info": {
    "lunar_date": "农历日期（如：腊月三十）",
    "solar_term": "所处节气或节气前后（如：大寒第10天）",
    "traditional_meaning": "传统民俗意义（如有节日或忌宜，简要说明）",
    "wuxing_day": "今日五行属性（如：金日）"
  },
  "sky_weather": {
    "overall_tone": "今日天象基调，一句话",
    "energy_quality": "能量质量描述，40-50字",
    "dominant_element": "主导元素（火/土/风/水），并映射五行（火/土/金/水/木）",
    "dominant_modality": "主导模式（开创/固定/变动）"
  },
  "major_configurations": [
    {
      "name": "配置名称（如：T三角、大十字、大三角、风筝等）",
      "planets_involved": ["相关行星"],
      "description": "配置描述，60-80字",
      "how_to_use": "如何利用这个配置"
    }
  ],
  "transit_highlights": [
    {
      "aspect": "相位描述",
      "exact_time": "精确时间（北京时间，如有）",
      "orb": "容许度",
      "impact": "影响描述，50-60字"
    }
  ],
  "personal_impact": {
    "most_affected_house": "对你影响最大的宫位",
    "theme": "今日个人主题，60-80字",
    "opportunity": "今日机会",
    "challenge": "今日挑战",
    "advice": "个人化建议，50-60字"
  },
  "timing_notes": {
    "best_times": ["最佳时段（北京时间）"],
    "caution_times": ["谨慎时段（北京时间）"],
    "moon_void": "月亮空亡时段（北京时间，如有）"
  },
  "technical_data": {
    "sun_position": "太阳位置",
    "moon_position": "月亮位置",
    "mercury_status": "水星状态（顺行/逆行）",
    "venus_status": "金星状态",
    "mars_status": "火星状态"
  }
}

## 中国文化融合要求

### 农历信息
- lunar_date：使用传统农历表述，如"腊月廿九""正月初七"
- solar_term：标注当前节气以及节气内的天数，如"大寒第5天，距立春还有10天"
- traditional_meaning：如果当天有传统节日（春节、元宵、清明、端午、七夕、中秋、重阳、冬至等），说明民俗含义；如无节日，可提及该日子的传统宜忌
- wuxing_day：根据天干推算今日五行属性

### 元素说明
分析元素时用通俗说法：
- 火元素：热情、行动力强
- 土元素：稳定、踏实
- 风元素：社交、思考活跃
- 水元素：直觉、情感丰富

### 时间表述
- 所有时间使用北京时间（UTC+8）
- 可以附注对应的传统时辰（如"上午 9-11 点，巳时"）

## 节气融入
如果当日处于节气前后（±3天），在 sky_weather.energy_quality 中自然融入节气与天象的呼应，如："小寒时节遇水星逆行，内收的能量叠满，适合深度复盘而非冲锋"。不在节气附近则忽略。

## 报告风格
- 专业但不晦涩，像一位懂传统文化的年轻占星师在做分享
- 中西方融合要自然，不要生硬对照
- 个人化解读是重点
- 数据准确，解读有深度
- 语言直白有场景感："火星刑土星"不要只说"行动受阻"，要说"就像想冲刺但前面堵车，急也没用，不如换条路"
- personal_impact.advice 用年轻人能立刻执行的场景：整理桌面、列个待办清单、下班后去跑步释放一下`,

  user: (ctx: PromptContext) => {
    return `日期：${ctx.date || new Date().toISOString().split('T')[0]}
本命盘：${JSON.stringify(ctx.chart_summary)}
今日行运详情：${JSON.stringify(ctx.transit_summary)}

请生成今日完整星象报告。`;
  },
};

// 注册
registry.register(detailAstroReportTransitPrompt);

/**
 * Synthetica 自定义星象分析 Prompt
 *
 * 输出：命格总论 + 模块分析
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

/** 咨询目标映射 - 中国本土化表达 */
const CONSULT_GOALS: Record<string, { title: string; focus: string; scenario: string }> = {
  LOVE: { title: '感情关系', focus: '金星、火星、第7宫、月亮相位', scenario: '恋爱模式、吸引力类型、相处方式' },
  SELF: { title: '自我认知', focus: '太阳、月亮、上升、第1宫', scenario: '性格底色、内心需求、外在表现' },
  HEALING: { title: '疗愈成长', focus: '凯龙星、第12宫、土星相位', scenario: '童年印记、内在卡点、成长方向' },
  CAREER: { title: '事业发展', focus: '第10宫、土星、火星、木星', scenario: '职业方向、工作风格、发展路径' },
  TIMING: { title: '时机把握', focus: '行运配置、月相、重要相位', scenario: '行动时机、能量高低、注意事项' },
  SOCIAL: { title: '人际关系', focus: '第11宫、金星、水星相位', scenario: '社交风格、朋友类型、团队角色' },
};

export const syntheticaAnalysisPrompt: PromptTemplate = {
  meta: {
    id: 'synthetica-analysis',
    version: '4.0',
    module: 'synthetica',
    priority: 'P0',
    description: '自定义星象分析',
    lastUpdated: '2026-01-29',
  },

  system: (ctx: PromptContext) => {
    const goal = ctx.synthetica_config?.consultGoal || 'SELF';
    const goalInfo = CONSULT_GOALS[goal] || CONSULT_GOALS.SELF;

    return `## 任务
根据用户自定义的星象配置，生成深度分析报告。像朋友聊天一样分享洞见，用中国年轻人熟悉的场景举例。

## 当前咨询目标：${goalInfo.title}
重点关注：${goalInfo.focus}
常见场景：${goalInfo.scenario}

## 输出格式 (JSON)
{
  "report_title": "str:报告标题,如'金星天蝎｜爱得深沉又隐忍'",
  "synthesis": "str:命格总论,3-4句,用接地气的语言概括核心特质,100-150字",
  "modules": [
    {
      "headline": "str:模块标题,如'落座解读｜你的XX风格'",
      "analysis": "str:解读要点,用具体场景举例,80-120字",
      "shadow_side": "str:容易踩的坑或需要留意的地方,50-80字",
      "actionable_advice": "str:具体可行的建议,像朋友给的小贴士,50-80字"
    }
  ]
}

## modules 模块要求
必须包含以下3个模块（按顺序）：
1. 落座解读 - 用生活场景解释行星在该星座的表现，比如"像是..."
2. 宫位影响 - 这个配置会在哪个人生领域特别明显
3. 能量互动 - 如果有相位，分析行星间的"对话"；没有相位则分析独立运作时的特点

## 写作要求
- 用中国年轻人熟悉的场景：职场、恋爱、朋友聚会、家庭关系
- 举例具体可代入："比如在团建时..."、"比如和对象吵架时..."
- 不用命令式（"你必须"），用建议式（"可以试试..."、"或许..."）
- 不下定论，指出倾向和模式

${JSON_OUTPUT_INSTRUCTION}`;
  },

  user: (ctx: PromptContext) => {
    const config = ctx.synthetica_config || {};
    return `咨询目标：${config.consultGoal || 'SELF'}
行星：${config.planet || '太阳'}
星座：${config.sign || '未指定'}
宫位：${config.house || '未指定'}
相位：${JSON.stringify(config.aspects || [])}

本命盘摘要：${JSON.stringify(ctx.chart_summary)}`;
  },
};

// 注册
registry.register(syntheticaAnalysisPrompt);

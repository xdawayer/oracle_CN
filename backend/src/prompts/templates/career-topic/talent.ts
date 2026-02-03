/**
 * 事业专题 - 模块一：天赋与职业方向（talent）
 *
 * 输出约 900-1200 字（最核心模块），纯 Markdown 文本
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import {
  CAREER_TOPIC_SYSTEM_PROMPT,
  CAREER_TOPIC_OUTPUT_INSTRUCTION,
  buildChartSummaryText,
  extractPlanetData,
  extractPlanetAspects,
  extractHouseData,
} from './system';

export const careerTopicTalentPrompt: PromptTemplate = {
  meta: {
    id: 'career-topic-talent',
    version: '1.0',
    module: 'career-topic',
    priority: 'P0',
    description: '事业专题 - 天赋与职业方向',
    lastUpdated: '2026-02-02',
  },
  system: CAREER_TOPIC_SYSTEM_PROMPT,
  user: (ctx: PromptContext) => {
    const chartText = buildChartSummaryText(ctx);
    const sunData = extractPlanetData(ctx, '太阳');
    const saturnData = extractPlanetData(ctx, '土星');
    const jupiterData = extractPlanetData(ctx, '木星');
    const marsData = extractPlanetData(ctx, '火星');
    const mercuryData = extractPlanetData(ctx, '水星');
    const house10 = extractHouseData(ctx, 10);
    const house6 = extractHouseData(ctx, 6);
    const house2 = extractHouseData(ctx, 2);
    const northNodeData = extractPlanetData(ctx, '北交点');
    const southNodeData = extractPlanetData(ctx, '南交点');
    const saturnAspects = extractPlanetAspects(ctx, '土星');
    const sunAspects = extractPlanetAspects(ctx, '太阳');

    return `## 完整星盘数据
${chartText}

## 聚焦数据
- ${sunData}
- ${saturnData}
- ${jupiterData}
- ${marsData}
- ${mercuryData}
- ${house10}（事业宫/天顶）
- ${house6}（工作宫）
- ${house2}（财帛宫/自我价值宫）
- ${northNodeData}
- ${southNodeData}

## 土星相位
${saturnAspects}

## 太阳相位
${sunAspects}

## 你的任务
你正在撰写事业专题深度报告的第一个章节：「天赋与职业方向」。

这是整篇报告最核心的模块，字数最长，用户最关注"我适合做什么"。要有判断，不能太泛。

请按以下结构展开：

### 一、你的社会角色天赋（MC/天顶 + 10宫）
- 天顶星座代表你在社会中自然呈现的形象和被需要的方式
- 10宫内的行星加强或修正这个方向
- 具体说：你适合面对公众还是幕后？你适合管人还是做专业？
- 要给出明确判断，不要"你既可以A也可以B"

### 二、你的工作方式和节奏（6宫 + 水星 + 火星）
- 6宫代表你日常工作的风格：你适合朝九晚五还是弹性时间？你是流程型还是创意型？
- 水星决定你的思维和沟通方式在工作中的表现
- 火星决定你的执行力和干劲：你是一鼓作气型还是持久战型？

### 三、职业方向参考（给出3-4个方向集群）
- 基于MC星座、10宫行星、6宫配置、木星位置，给出3-4个职业方向集群
- 每个集群列出2-3个具体职业例子
- 包含体制内/外的考量：这个盘面适合考公/考编吗？
- 副业/自媒体/斜杠方向也可以提，如果盘面支持
- 如果用户可能是学生：提一句"如果你还在读书，建议关注XX方向的实习"

### 四、你跟"体制"的关系（土星 + 10宫）
- 土星的位置和相位揭示你跟权威体系、规则、制度的关系
- 你适合在大组织里按规矩来，还是自己干？
- 这不是说"体制好不好"，而是说你的盘面跟哪种工作环境更匹配

## 特别注意
- 要接地气：说"你适合做数据分析"比"你在分析领域有天赋"具体得多
- 不要回避判断：如果盘面明显不适合某方向，可以婉转说
- 考研/留学也是中国年轻人很关注的话题，如果盘面有暗示可以提
- 这是最长的模块（900-1200字），内容要充实

## 字数：900-1200字

${CAREER_TOPIC_OUTPUT_INSTRUCTION}

直接输出内容，不要加代码块。`;
  },
};

/**
 * 合盘氛围标签 Prompt
 *
 * 输出：关系的氛围标签和特质描述
 */

import type { PromptTemplate, PromptContext } from '../../core/types';
import { JSON_OUTPUT_INSTRUCTION } from '../../instructions/output-format';
import { registry } from '../../core/registry';

export const synastryVibeTagsPrompt: PromptTemplate = {
  meta: {
    id: 'synastry-vibe-tags',
    version: '2.0',
    module: 'synastry',
    priority: 'P1',
    description: '合盘氛围标签',
    lastUpdated: '2026-01-29',
  },

  system: `## 任务
为两人的关系生成直观的氛围标签，帮助快速了解关系特质。

## 输出格式 (JSON)
{
  "primary_vibe": {
    "tag": "主要氛围标签，2-4字",
    "emoji": "一个代表性emoji",
    "description": "这个氛围的含义，40-50字"
  },
  "secondary_vibes": [
    {
      "tag": "次要标签",
      "emoji": "emoji",
      "intensity": 1-5强度
    }
  ],
  "relationship_flavor": {
    "sweet": 1-5甜蜜度,
    "passion": 1-5激情度,
    "stability": 1-5稳定度,
    "growth": 1-5成长度,
    "challenge": 1-5挑战度
  },
  "vibe_sentence": "一句话描述这段关系的氛围，15-20字",
  "metaphor": {
    "image": "用一个日常场景描述这段关系的感觉（如：周末一起赖床到中午）",
    "why": "为什么用这个场景，30-40字"
  },
  "song_mood": {
    "genre": "如果这段关系是一首歌，是什么风格",
    "example": "举例一首歌或一种曲风"
  }
}

## 氛围标签库参考
- 灵魂搭子、欢喜冤家、知己、成长搭档、情绪搭子
- 细水长流、轰轰烈烈、相敬如宾、棋逢对手、谁也不服谁
- 温暖港湾、冒险搭档、心灵树洞、生活伙伴、甜到齁

## 评分说明
- 5分：非常突出
- 4分：明显
- 3分：适中
- 2分：较弱
- 1分：几乎没有

## 写作要求
- 标签要直观易懂，年轻人能共鸣，可用搭子文化/CP文化表达
- 意象用日常场景让人秒懂（如：一起点外卖的默契、窝沙发上各刷各的手机但很安心），不要用文学性比喻
- 不做绝对判断，氛围只是"倾向"
- song_mood 优先用中国年轻人熟悉的歌曲风格和歌手举例

${JSON_OUTPUT_INSTRUCTION}`,

  user: (ctx: PromptContext) => {
    return `A 的本命盘：${JSON.stringify(ctx.chart_a)}
B 的本命盘：${JSON.stringify(ctx.chart_b)}
合盘相位：${JSON.stringify(ctx.synastry_aspects)}

请为这段关系生成氛围标签。`;
  },
};

// 注册
registry.register(synastryVibeTagsPrompt);

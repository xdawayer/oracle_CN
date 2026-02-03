/**
 * 年轻化表达替换表
 *
 * 提供正式表达到年轻化表达的映射
 * AI 在生成内容时可参考使用
 */

/** 正式→年轻化 表达映射 */
export const EXPRESSION_MAP: Array<{ formal: string; casual: string; context: string }> = [
  // 性格特质
  { formal: '具有较强的事业驱动力', casual: '搞钱能力拉满', context: '事业' },
  { formal: '在社交方面可能较为内向', casual: '社恐星人实锤', context: '社交' },
  { formal: '倾向于关怀他人', casual: '内心住了个老母亲', context: '关系' },
  { formal: '性格较为内向', casual: 'i人本i', context: '性格' },
  { formal: '性格较为外向', casual: 'e人无疑了', context: '性格' },
  { formal: '非常优秀', casual: '满级人类', context: '通用' },
  { formal: '经历情绪困扰', casual: '精神内耗严重', context: '情绪' },
  { formal: '天性被激活', casual: 'DNA动了', context: '通用' },

  // 星象描述
  { formal: '重要的成长阶段', casual: '社会毒打期', context: '行运' },
  { formal: '能量非常强', casual: '能量拉满', context: '行运' },
  { formal: '需要注意情绪管理', casual: '容易emo', context: '情绪' },
  { formal: '过度投入工作', casual: '工作上头', context: '事业' },
  { formal: '容易冲动行事', casual: '容易上头', context: '通用' },
  { formal: '失去兴趣', casual: '直接下头', context: '通用' },
  { formal: '感到非常疲惫', casual: '累到想摆烂', context: '通用' },
  { formal: '竞争压力大', casual: '被内卷到', context: '事业' },
  { formal: '深受感动', casual: '直接破防', context: '情绪' },
  { formal: '感到焦虑不安', casual: '焦虑拉满', context: '情绪' },

  // 关系描述
  { formal: '两人性格互补', casual: '天生搭档', context: '关系' },
  { formal: '容易产生冲突', casual: '互相踩雷', context: '关系' },
  { formal: '有强烈的吸引力', casual: '来电感拉满', context: '关系' },
  { formal: '沟通存在障碍', casual: '说话不在一个频道', context: '关系' },
  { formal: '价值观相合', casual: '三观超合', context: '关系' },
  { formal: '关系较为稳定', casual: '稳得一批', context: '关系' },

  // 日运描述
  { formal: '运势较好', casual: '今日状态在线', context: '日运' },
  { formal: '运势一般', casual: '今天佛系一点', context: '日运' },
  { formal: '适合社交活动', casual: '适合出去浪', context: '日运' },
  { formal: '适合独处反思', casual: '适合一个人待着', context: '日运' },
  { formal: '财运较好', casual: '搞钱运在线', context: '日运' },
  { formal: '感情运势上升', casual: '桃花运来了', context: '日运' },
];

/** 获取指定场景的表达示例 */
export function getExpressionExamples(context: string, count: number = 3): Array<{ formal: string; casual: string }> {
  const filtered = EXPRESSION_MAP.filter(e => e.context === context || e.context === '通用');
  return filtered.slice(0, count).map(({ formal, casual }) => ({ formal, casual }));
}

/** 获取所有表达映射的紧凑版（用于注入 prompt） */
export function getCompactExpressionGuide(): string {
  const samples = EXPRESSION_MAP.slice(0, 8).map(e => `${e.casual}←${e.formal}`).join('｜');
  return `表达风格参考：${samples}`;
}

/**
 * 追问引导规范
 *
 * 定义 follow_up_questions 字段的生成规则，提高对话深度和用户粘性
 */

/**
 * 追问引导规则
 *
 * 适用于所有包含 follow_up_questions 字段的 Prompt
 */
export const FOLLOWUP_GUIDE = `## follow_up_questions 生成规则

每次生成 2 条追问，分别服务不同目的：

1. **第一条：深入自我探索**
   - 引导用户回顾具体经历
   - 帮助用户建立星盘与生活的连接
   - 格式："关于XX，你有过什么样的体验？"
   - 示例：
     - "你还记得上次特别想掌控局面是什么时候吗？"
     - "在亲密关系里，你最害怕的是什么？"
     - "最近有没有哪个时刻让你觉得'这就是我'？"

2. **第二条：实用性问题**
   - 引导用户思考具体场景的应对
   - 提供可操作的思考方向
   - 格式："如果遇到XX情况，你会..."
   - 示例：
     - "如果下次又忍不住想帮别人，你会怎么提醒自己？"
     - "遇到类似的情绪波动，有什么方法能让你快速冷静？"
     - "如果TA又这样对你，你打算怎么回应？"

## 禁止的追问类型

❌ 太泛泛的问题
   - "你觉得呢？"
   - "还有问题吗？"
   - "你怎么看？"

❌ 是非题（无法展开对话）
   - "你同意吗？"
   - "是不是这样？"
   - "你觉得准吗？"

❌ 重复前文的问题
   - 用户已经问过的问题
   - 已经在回复中解答的问题`;

/**
 * 不同模块的追问风格
 */
export const FOLLOWUP_STYLE_BY_MODULE: Record<string, { explore: string; practical: string }> = {
  natal: {
    explore: '探索核心特质的形成经历',
    practical: '如何在日常中发挥天赋/规避陷阱',
  },
  daily: {
    explore: '当日能量与过往类似时刻的连接',
    practical: '今日具体场景的应对策略',
  },
  synastry: {
    explore: '关系模式在具体事件中的体现',
    practical: '下次类似情况如何处理',
  },
  cbt: {
    explore: '情绪背后的需求和过往经历',
    practical: '具体的情绪调节方法',
  },
  ask: {
    explore: '问题背后更深层的关切',
    practical: '可以立即尝试的小行动',
  },
};

/**
 * 获取模块特定的追问风格提示
 */
export function getFollowupStyleHint(module: string): { explore: string; practical: string } {
  return FOLLOWUP_STYLE_BY_MODULE[module] || {
    explore: '探索更深层的自我认知',
    practical: '可以立即行动的建议',
  };
}

/**
 * 追问质量检查规则
 */
export const FOLLOWUP_QUALITY_RULES = [
  '问题必须开放（不能用是/否回答）',
  '问题必须具体（避免"你怎么看"这类泛问）',
  '问题必须与当前话题相关',
  '两条问题不能太相似',
  '问题长度适中（15-40字）',
];

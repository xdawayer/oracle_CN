/**
 * 合盘输出格式规范
 *
 * 定义合盘分析的输出格式、评分标准和语言风格
 */

/**
 * 合盘评分标准（中国本土化版本）
 */
export const SYNASTRY_SCORE_STANDARD = `评分标准：
- 85-100：很合适，天生一对，好好珍惜
- 70-84：挺合适的，小问题不影响大局
- 55-69：一般般，需要用心经营
- 40-54：有点难，挑战不少，要做好心理准备
- 40以下：差距较大，三思

评分应基于相位的数量、紧密度、性质综合判断。给分要实在，不要虚高。`;

/**
 * 合盘字数范围规范
 */
export const SYNASTRY_WORD_COUNT = `字数范围：
- 关键词：15-25字
- 简短段落：50-80字
- 标准段落：80-120字
- 详细段落：100-150字
- 完整分析：150-200字`;

/**
 * 合盘语言风格规范（中国本土化版本）
 */
export const SYNASTRY_LANGUAGE_RULES = `语言风格：
- 说人话，不要用"能量共振"、"灵魂连接"、"投射"、"阴影面"这种
- 避免绝对化表达如"一定会"、"必然"、"命中注定"
- 用"倾向于"、"可能"、"容易"替代断言
- 多使用"你们"、"两人"等称呼，增强代入感
- 场景要接地气：过年回谁家、婆媳、彩礼、消费观、家务分工
- 可以用网络流行语，但不要太油腻
- 不要吓人，问题说清楚但也要给希望`;

/**
 * 合盘输出格式规范（完整版）
 */
export const SYNASTRY_OUTPUT_INSTRUCTION = `${SYNASTRY_SCORE_STANDARD}

${SYNASTRY_LANGUAGE_RULES}

输出规范：
- 严格按照指定的 JSON 格式输出
- 每个分析段落控制在指定字数范围内
- 不要输出 JSON 以外的任何内容`;

/**
 * 本命盘维度分析字数范围（中国本土化版本）
 */
export const NATAL_DIMENSION_WORD_COUNT = {
  love_persona: '80-100字',        // 恋爱人设
  needs_and_gives: '80-100字',     // 想要的和能给的
  fight_mode: '60-80字',           // 吵架模式
  lifestyle: '80-100字',           // 过日子风格
  family_view: '80-100字',         // 家庭观念
  warning: '60-80字',              // 雷区提醒
  one_sentence: '15-25字',         // 一句话总结
};

/**
 * 比较盘维度分析字数范围（中国本土化版本）
 */
export const SYNASTRY_DIMENSION_WORD_COUNT = {
  chemistry: '80-120字',           // 来电指数
  communication: '80-120字',       // 聊得来指数
  money_view: '80-100字',          // 消费观匹配
  daily_life: '100-150字',         // 过日子合拍度
  conflict_mode: '80-120字',       // 吵架和好模式
  family_merge: '100-150字',       // 家庭融合难度
  longevity: '80-120字',           // 长久指数
  warnings: '80-120字',            // 踩坑预警
};

/**
 * 组合盘维度分析字数范围（中国本土化版本）
 */
export const COMPOSITE_DIMENSION_WORD_COUNT = {
  cp_type: '100-150字',            // CP 人设
  together_vibe: '80-120字',       // 在一起的感觉
  show_love_style: '80-120字',     // 撒狗粮方式
  work_together: '80-100字',       // 一起搞事业
  crisis_mode: '100-150字',        // 熬过难关的能力
  relationship_test: '80-120字',   // 这段关系的考验
};

/**
 * 获取合盘输出规范
 */
export function getSynastryOutputInstruction(): string {
  return SYNASTRY_OUTPUT_INSTRUCTION;
}

/**
 * 获取评分标准
 */
export function getSynastryScoreStandard(): string {
  return SYNASTRY_SCORE_STANDARD;
}

/**
 * 获取语言风格规范
 */
export function getSynastryLanguageRules(): string {
  return SYNASTRY_LANGUAGE_RULES;
}

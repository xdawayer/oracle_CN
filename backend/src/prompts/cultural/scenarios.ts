/**
 * 场景库
 *
 * 中国年轻人（18-35 岁）熟悉的生活场景
 */

export const SCENARIOS = {
  /** 关系场景 */
  relationships: {
    romantic: [
      '和对象因为小事吵架后，各自沉默玩手机',
      '过年回家被父母催婚时',
      '在约会软件上不知道怎么开场白',
      '对象加班太多，觉得被忽视',
      '见家长前的焦虑',
      '异地恋时的不安全感',
      '吵架后谁先道歉的博弈',
      '发现对象和异性聊天时的不安',
      '纪念日对方忘记了',
      '对方手机从不让你碰',
    ],

    family: [
      '和父母意见不合时忍住不顶嘴',
      '被亲戚问工资和感情状况',
      '父母干涉自己的生活决定',
      '家族聚餐时的社交压力',
      '和父母的消费观念冲突',
      "被比较'别人家的孩子'",
      '想搬出去住但怕父母伤心',
      '父母催着考公/考研/结婚',
      '节假日要不要回家的纠结',
      '帮父母解决智能手机问题时的不耐烦',
    ],

    friendship: [
      '朋友聚会后感到社交疲惫',
      '不知道该不该借钱给朋友',
      '发现朋友在背后说自己',
      '从前的好友渐渐疏远',
      '不想参加但不好意思拒绝的聚会',
      '朋友圈发什么要想半天',
      '被拉进不想待的群聊',
      '朋友总是让你帮忙但从不回报',
    ],

    workplace: [
      '领导当众批评后的尴尬',
      '同事抢功劳时的愤怒',
      '开会时被点名发言的紧张',
      '周末被工作消息打扰',
      '办公室政治中的站队压力',
      '996 和生活平衡的挣扎',
      '团建时的社交表演',
      '年底绩效评估前的焦虑',
      '被安排不想做的任务',
      '新来的同事比你工资高',
    ],
  },

  /** 情绪触发场景 */
  emotional: {
    anxiety: [
      '周日晚上想到明天要上班',
      '等待面试结果时',
      '体检报告还没出来',
      '重要消息发出去对方没回',
      '月底看银行卡余额',
      'deadline 快到了还没开始做',
      '手机快没电又找不到充电器',
      '等外卖超时越等越急',
      '突然被老板叫进办公室',
      '发现自己可能说错话了',
    ],

    anger: [
      '被插队或被加塞',
      '解释了很多次对方还是不理解',
      '自己的边界被反复侵犯',
      '被误解又没机会解释',
      '付出没有被看见',
      '规则只约束自己不约束别人',
      '明明是对方的错却要自己道歉',
      '被当众指责',
    ],

    sadness: [
      '深夜一个人刷手机',
      '看到别人秀恩爱时',
      '想起以前的好时光',
      '努力了很久还是没有结果',
      '感觉不被理解',
      '朋友圈里只有自己过得不好',
      '突然想起已经不联系的人',
      '发现自己不再年轻了',
    ],

    overwhelm: [
      '待办事项越积越多',
      '同时被很多人需要',
      '不知道从哪件事开始做',
      '信息太多处理不过来',
      '每件事都很重要但时间不够',
      '休息时也在想工作的事',
      '感觉生活失控',
    ],
  },

  /** 大陆特有压力场景 */
  mainland_pressure: {
    work_culture: [
      '996加班到崩溃，但不敢辞职因为还有房贷',
      '35岁简历被筛掉，连面试机会都没有',
      '互联网裁员潮，每天上班都怕被约谈',
      '考公上岸后发现基层工作和想象的完全不同',
      '研究生毕业发现学历在贬值，和本科生竞争同一个岗位',
    ],
    life_pressure: [
      '房贷月供占了工资的一半，不敢生病不敢辞职',
      '城市户口办不下来，孩子上学成了大问题',
      '父母催着回老家发展，但老家没有对口工作',
      '相亲被当简历筛选，收入房车缺一不可',
      '小红书上人均年薪百万，打开工资条只想关掉手机',
    ],
  },

  /** 成长场景 */
  growth: {
    career: [
      '不知道该不该跳槽',
      '感觉工作没有成就感',
      '想转行但怕风险',
      '职场瓶颈期，不知道下一步',
      '35 岁焦虑',
      '被年轻同事卷到',
      '做的事和专业不对口',
      '想创业但没勇气',
    ],

    self: [
      '不知道自己真正想要什么',
      '总是在意别人的看法',
      '很难拒绝别人',
      '拖延症严重',
      '对自己要求太高',
      '明知道该做什么却做不到',
      '想改变但不知从何开始',
      '羡慕别人的生活',
    ],

    life: [
      '租房还是买房的纠结',
      '要不要考研/读博',
      '回老家还是留在大城市',
      '存钱和享受当下的平衡',
      '什么时候要孩子',
      '兴趣爱好和赚钱的取舍',
    ],
  },
};

/**
 * 获取随机场景
 *
 * @param category 场景大类
 * @param subcategory 场景子类
 * @param count 返回数量
 * @returns 随机场景数组
 */
export function getRandomScenarios(
  category: keyof typeof SCENARIOS,
  subcategory: string,
  count: number = 2
): string[] {
  const pool = SCENARIOS[category]?.[subcategory as keyof (typeof SCENARIOS)[typeof category]];
  if (!pool || !Array.isArray(pool)) return [];

  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * 获取所有场景分类
 */
export function getScenarioCategories(): string[] {
  return Object.keys(SCENARIOS);
}

/**
 * 获取某分类下的所有子类
 */
export function getScenarioSubcategories(category: keyof typeof SCENARIOS): string[] {
  return Object.keys(SCENARIOS[category] || {});
}

/**
 * 场景关键词映射
 */
const SCENARIO_KEYWORDS: Record<string, { category: string; subcategory: string }[]> = {
  // 关系关键词
  '对象': [{ category: 'relationships', subcategory: 'romantic' }],
  '男朋友': [{ category: 'relationships', subcategory: 'romantic' }],
  '女朋友': [{ category: 'relationships', subcategory: 'romantic' }],
  '吵架': [{ category: 'relationships', subcategory: 'romantic' }],
  '分手': [{ category: 'relationships', subcategory: 'romantic' }],
  '恋爱': [{ category: 'relationships', subcategory: 'romantic' }],
  '异地': [{ category: 'relationships', subcategory: 'romantic' }],
  '父母': [{ category: 'relationships', subcategory: 'family' }],
  '家人': [{ category: 'relationships', subcategory: 'family' }],
  '催婚': [{ category: 'relationships', subcategory: 'family' }],
  '朋友': [{ category: 'relationships', subcategory: 'friendship' }],
  '同事': [{ category: 'relationships', subcategory: 'workplace' }],
  '领导': [{ category: 'relationships', subcategory: 'workplace' }],
  '老板': [{ category: 'relationships', subcategory: 'workplace' }],
  '工作': [{ category: 'relationships', subcategory: 'workplace' }, { category: 'growth', subcategory: 'career' }],
  // 情绪关键词
  '焦虑': [{ category: 'emotional', subcategory: 'anxiety' }],
  '紧张': [{ category: 'emotional', subcategory: 'anxiety' }],
  '担心': [{ category: 'emotional', subcategory: 'anxiety' }],
  '生气': [{ category: 'emotional', subcategory: 'anger' }],
  '愤怒': [{ category: 'emotional', subcategory: 'anger' }],
  '难过': [{ category: 'emotional', subcategory: 'sadness' }],
  '伤心': [{ category: 'emotional', subcategory: 'sadness' }],
  '累': [{ category: 'emotional', subcategory: 'overwhelm' }],
  '压力': [{ category: 'emotional', subcategory: 'overwhelm' }],
  // 成长关键词
  '跳槽': [{ category: 'growth', subcategory: 'career' }],
  '转行': [{ category: 'growth', subcategory: 'career' }],
  '迷茫': [{ category: 'growth', subcategory: 'self' }],
  '不知道': [{ category: 'growth', subcategory: 'self' }],
  '拖延': [{ category: 'growth', subcategory: 'self' }],
  // 大陆压力关键词
  '996': [{ category: 'mainland_pressure', subcategory: 'work_culture' }],
  '加班': [{ category: 'mainland_pressure', subcategory: 'work_culture' }],
  '裁员': [{ category: 'mainland_pressure', subcategory: 'work_culture' }],
  '考公': [{ category: 'mainland_pressure', subcategory: 'work_culture' }],
  '房贷': [{ category: 'mainland_pressure', subcategory: 'life_pressure' }],
  '户口': [{ category: 'mainland_pressure', subcategory: 'life_pressure' }],
  '相亲': [{ category: 'mainland_pressure', subcategory: 'life_pressure' }],
  '内卷': [{ category: 'mainland_pressure', subcategory: 'work_culture' }],
  '35岁': [{ category: 'mainland_pressure', subcategory: 'work_culture' }],
};

/**
 * 根据问题匹配相关场景
 *
 * @param question 用户问题
 * @param maxScenarios 最大返回场景数
 * @returns 匹配的场景字符串，用于注入 prompt
 */
export function matchScenarios(question: string, maxScenarios: number = 3): string {
  if (!question) return '';

  const matchedCategories = new Set<string>();
  const matchedScenarios: string[] = [];

  // 根据关键词匹配场景类别
  for (const [keyword, categories] of Object.entries(SCENARIO_KEYWORDS)) {
    if (question.includes(keyword)) {
      for (const { category, subcategory } of categories) {
        const key = `${category}.${subcategory}`;
        if (!matchedCategories.has(key)) {
          matchedCategories.add(key);
          const scenarios = getRandomScenarios(category as keyof typeof SCENARIOS, subcategory, 1);
          matchedScenarios.push(...scenarios);
        }
      }
    }
  }

  // 如果没有匹配到，返回空
  if (matchedScenarios.length === 0) return '';

  // 返回格式化的场景参考
  return matchedScenarios.slice(0, maxScenarios).map(s => `「${s}」`).join(' ');
}

/**
 * 获取指定类型的场景示例
 *
 * @param type 场景类型：relationship/emotion/growth
 * @param count 返回数量
 * @returns 场景示例数组
 */
export function getScenarioExamples(type: 'relationship' | 'emotion' | 'growth', count: number = 3): string[] {
  const categoryMap = {
    relationship: 'relationships',
    emotion: 'emotional',
    growth: 'growth',
  };
  const category = categoryMap[type] as keyof typeof SCENARIOS;
  const subcategories = getScenarioSubcategories(category);

  const allScenarios: string[] = [];
  for (const sub of subcategories) {
    const categoryObj = SCENARIOS[category] as Record<string, string[]>;
    const scenarios = categoryObj?.[sub];
    if (Array.isArray(scenarios)) {
      allScenarios.push(...scenarios);
    }
  }

  // 随机打乱并返回
  return allScenarios.sort(() => 0.5 - Math.random()).slice(0, count);
}

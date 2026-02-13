/**
 * 心理学概念本土化
 *
 * 将西方心理学概念转化为中国用户易懂的表达
 */

/** 荣格心理学概念 */
export const JUNGIAN_CONCEPTS = {
  shadow: {
    original: 'Shadow',
    zhCN: "内心的'暗面'",
    explanation:
      "那些你不太想承认、但确实是你一部分的特质。比如你讨厌别人'太爱表现'，可能是因为你内心也有想被看见的渴望，只是不敢表达。",
    actionable:
      "下次当你对某个人的某个特质特别'看不惯'时，问问自己：我是不是也有一点点这样？",
  },

  persona: {
    original: 'Persona',
    zhCN: '社交面具',
    explanation:
      "在不同场合，你会'戴上'不同的面具——工作时的专业形象、朋友面前的轻松样子、长辈面前的乖巧模样。这不是虚伪，是正常的社交调适。",
    actionable:
      "觉察一下：有没有哪个'面具'戴太久了，让你感觉很累？",
  },

  anima_animus: {
    original: 'Anima/Animus',
    zhCN: '内在的另一面',
    explanation:
      "每个人内心都有'阴'和'阳'两种能量。一个很'刚'的人，内心可能住着一个渴望被呵护的小孩；一个很'柔'的人，内心可能有强大的力量感。",
    actionable:
      '你在伴侣身上最欣赏的品质，很可能是你内心也有、但还没发展出来的部分。',
  },

  individuation: {
    original: 'Individuation',
    zhCN: '活成自己',
    explanation:
      "不是变得'与众不同'，而是活出真正的你——不再只是'某某的孩子'、'某某公司的员工'、'某某的伴侣'，而是知道'我是谁、我要什么'的完整的人。",
    actionable:
      '问问自己：如果不用考虑任何人的期待，我想过什么样的生活？',
  },

  collective_unconscious: {
    original: 'Collective Unconscious',
    zhCN: '人类共享的心理底层',
    explanation:
      '有些故事、符号、梦境，全世界的人都能懂——比如英雄之旅、智慧老人、大母神。这些是人类几十万年积累下来的心理遗产。',
    actionable:
      '注意那些反复出现在你梦里或特别打动你的意象，它们可能在告诉你一些重要的事。',
  },

  inner_child: {
    original: 'Inner Child',
    zhCN: '内在小孩',
    explanation:
      '每个人心里都住着一个小孩，ta 保留着童年时的感受、需求和反应模式。当你突然变得特别敏感、委屈或任性时，可能就是这个"内在小孩"被激活了。',
    actionable:
      '下次当你有强烈情绪时，试着问自己：这是成年的我在反应，还是小时候的我在害怕？',
  },

  inner_critic: {
    original: 'Inner Critic',
    zhCN: '内在批评家',
    explanation:
      '脑子里那个总是批评你、说你"不够好"、"做得不对"的声音。它可能来自小时候的严厉管教，现在变成了你对自己的苛刻。',
    actionable:
      '注意那个声音什么时候出现，然后温柔地告诉它："谢谢你想保护我，但我已经长大了。"',
  },
};

/** 依恋理论 */
export const ATTACHMENT_STYLES = {
  secure: {
    original: 'Secure Attachment',
    zhCN: '安全型',
    description:
      '在关系里比较放松，相信对方会在，也不怕一个人待着。吵架后能主动和好，不会翻旧账。',
    origin:
      "小时候的需求大多能被回应，形成了'我是值得被爱的'的底层信念。",
    inRelationship: '能表达需求，也能接受对方的不完美。',
  },

  anxious: {
    original: 'Anxious Attachment',
    zhCN: '焦虑型',
    description:
      '很在意对方的回应，消息没回就会胡思乱想。喜欢黏在一起，分开会不安。',
    origin:
      "小时候被照顾的体验不稳定——有时很好，有时被忽视——所以长大后总在确认'你还爱我吗'。",
    inRelationship: '容易过度付出，也容易感到被忽视。',
    growth:
      "练习'自己给自己安全感'，比如等消息时做点别的事，而不是一直盯着手机。",
  },

  avoidant: {
    original: 'Avoidant Attachment',
    zhCN: '回避型',
    description:
      "不太喜欢太亲密，觉得'腻在一起'很窒息。伴侣靠近时会本能后退。",
    origin:
      "小时候学会了'不要有太多期待，靠自己最安全'。可能是被忽视，也可能是被要求'懂事独立'。",
    inRelationship: '看起来很独立，其实是害怕失望。',
    growth:
      '练习在安全的关系里慢慢打开，从分享小事开始，不用一下子交出全部。',
  },

  disorganized: {
    original: 'Disorganized Attachment',
    zhCN: '混乱型',
    description:
      '既想靠近又想逃开，关系里常常又推又拉。有时很黏人，有时突然冷淡。',
    origin:
      '小时候照顾者既是安全来源，又是恐惧来源，所以形成了矛盾的模式。',
    inRelationship: '关系容易大起大落，自己也很累。',
    growth:
      "最重要的是找到一个稳定的、可预期的关系，慢慢建立'关系可以是安全的'的体验。",
  },
};

/** CBT 认知扭曲 */
export const COGNITIVE_DISTORTIONS = {
  catastrophizing: {
    original: 'Catastrophizing',
    zhCN: '灾难化思维',
    example:
      "老板说'来我办公室一下'，脑子里已经开始演'是不是要被开除了'",
    reframe:
      '深呼吸，问自己：有没有其他可能性？上次这种情况是什么结果？',
  },

  mind_reading: {
    original: 'Mind Reading',
    zhCN: '读心术',
    example: "对方没回消息，就觉得'ta 肯定在生我的气'",
    reframe: '我又不是 ta 肚子里的蛔虫，与其瞎猜不如直接问。',
  },

  black_white: {
    original: 'All-or-Nothing Thinking',
    zhCN: '非黑即白',
    example: '这次没做到 100 分，就觉得自己是彻底的失败者',
    reframe: '生活不是考试，80 分也是分。允许自己有灰色地带。',
  },

  should_statements: {
    original: 'Should Statements',
    zhCN: "'应该'绑架",
    example: '我应该更努力、我应该不生气、我应该让所有人满意',
    reframe: "把'应该'换成'可以'——我可以努力，但也可以休息。",
  },

  personalization: {
    original: 'Personalization',
    zhCN: '过度内归因',
    example: "朋友心情不好，就觉得'是不是我哪里惹 ta 了'",
    reframe: '别人的情绪是别人的，不是所有事都和我有关。',
  },

  emotional_reasoning: {
    original: 'Emotional Reasoning',
    zhCN: '情绪推理',
    example: "我感觉自己很蠢，所以我一定真的很蠢",
    reframe: '感觉不等于事实。情绪是信号，不是真相。',
  },

  filtering: {
    original: 'Mental Filter',
    zhCN: '选择性过滤',
    example: '收到 10 条好评和 1 条差评，只记得那条差评',
    reframe: '试着把好评也写下来，客观看看全貌。',
  },

  overgeneralization: {
    original: 'Overgeneralization',
    zhCN: '以偏概全',
    example: "这次面试失败了，我永远找不到好工作",
    reframe: "一次不代表永远。把'永远'、'总是'换成'这次'。",
  },

  labeling: {
    original: 'Labeling',
    zhCN: '贴标签',
    example: "我就是个失败者 / 他就是个混蛋",
    reframe: '区分行为和人格。做了一件蠢事 ≠ 蠢人。',
  },

  fortune_telling: {
    original: 'Fortune Telling',
    zhCN: '预言家陷阱',
    example: "我肯定会搞砸的，不用试了",
    reframe: '你又不是神仙，不试怎么知道？',
  },
};

/** 中国哲学与西方心理学对照 */
export const CHINESE_PHILOSOPHY_PARALLELS: Record<string, {
  western: string;
  chinese: string;
  source: string;
  explanation: string;
}> = {
  individuation: {
    western: 'Individuation（个体化）',
    chinese: '知行合一',
    source: '王阳明',
    explanation: '认识真正的自己并活出来——知道自己要什么，也有勇气去做',
  },
  shadow_integration: {
    western: 'Shadow Integration（阴影整合）',
    chinese: '阴阳互根',
    source: '道家',
    explanation: '光明与阴暗是一体两面，接纳自己的"暗面"才能完整',
  },
  balance: {
    western: 'Balance（心理平衡）',
    chinese: '中庸之道',
    source: '儒家',
    explanation: '不走极端，在各种力量之间找到动态平衡',
  },
  acceptance: {
    western: 'Acceptance（接纳）',
    chinese: '道法自然',
    source: '老子',
    explanation: '不和现实较劲，顺应自然规律，在接纳中找到力量',
  },
  resilience: {
    western: 'Resilience（心理韧性）',
    chinese: '否极泰来',
    source: '易经',
    explanation: '低谷是转折的前奏，坚持住就能迎来新的开始',
  },
  mindfulness: {
    western: 'Mindfulness（正念）',
    chinese: '活在当下',
    source: '禅宗',
    explanation: '不纠结过去，不焦虑未来，把注意力放在此刻',
  },
};

/**
 * 获取中国哲学对照
 */
export function getPhilosophyParallel(concept: string): string {
  const p = CHINESE_PHILOSOPHY_PARALLELS[concept];
  if (!p) return '';
  return `${p.chinese}（${p.source}）：${p.explanation}`;
}

/** 心理学概念映射表 */
export const PSYCHOLOGY_MAPPING = {
  jungian: JUNGIAN_CONCEPTS,
  attachment: ATTACHMENT_STYLES,
  cognitive_distortions: COGNITIVE_DISTORTIONS,
};

/**
 * 获取认知扭曲的本土化解释
 */
export function getCognitiveDistortion(key: string) {
  return COGNITIVE_DISTORTIONS[key as keyof typeof COGNITIVE_DISTORTIONS];
}

/**
 * 获取依恋类型的本土化解释
 */
export function getAttachmentStyle(key: string) {
  return ATTACHMENT_STYLES[key as keyof typeof ATTACHMENT_STYLES];
}

/**
 * 获取荣格概念的本土化解释
 */
export function getJungianConcept(key: string) {
  return JUNGIAN_CONCEPTS[key as keyof typeof JUNGIAN_CONCEPTS];
}

/**
 * 合盘相位解读知识库
 *
 * 提供比较盘中常见行星组合的相位解读
 */

/** 相位解读条目 */
export interface SynastryAspectMeaning {
  /** 含义描述 */
  meaning: string;
  /** 情感体验 */
  feeling: string;
  /** 相位性质 */
  nature: 'positive' | 'challenging' | 'neutral';
}

/** 行星组合相位集合 */
export interface PlanetPairAspects {
  conjunction?: SynastryAspectMeaning;
  trine?: SynastryAspectMeaning;
  sextile?: SynastryAspectMeaning;
  square?: SynastryAspectMeaning;
  opposition?: SynastryAspectMeaning;
}

/**
 * 合盘相位解读知识库
 */
export const SYNASTRY_ASPECT_KNOWLEDGE: Record<string, PlanetPairAspects> = {
  // === 日月相位 ===
  sunMoon: {
    conjunction: {
      meaning: '深层认同感，A 自然给予 B 安全感，有「注定相遇」的感觉',
      feeling: '仿佛找到了懂自己的人',
      nature: 'positive',
    },
    trine: {
      meaning: '和谐流动，相互支持，轻松自在的相处',
      feeling: '在一起不需要刻意维护',
      nature: 'positive',
    },
    sextile: {
      meaning: '有良好的沟通基础，愿意相互配合',
      feeling: '合作起来很顺畅',
      nature: 'positive',
    },
    square: {
      meaning: '需求与表达的摩擦，需要学习理解差异',
      feeling: '有时会觉得对方不太懂自己',
      nature: 'challenging',
    },
    opposition: {
      meaning: '强烈吸引与张力并存，需要平衡自我与照顾对方',
      feeling: '既被吸引又时有拉扯',
      nature: 'challenging',
    },
  },

  // === 金火相位 ===
  venusMars: {
    conjunction: {
      meaning: '强烈的浪漫吸引，自然的化学反应',
      feeling: '有难以抗拒的吸引力',
      nature: 'positive',
    },
    trine: {
      meaning: '愉悦的互动，审美和欲望的和谐',
      feeling: '相处起来很舒服、很享受',
      nature: 'positive',
    },
    sextile: {
      meaning: '有浪漫的火花，抓住时机就能升温',
      feeling: '互动中有恰到好处的心动',
      nature: 'positive',
    },
    square: {
      meaning: '激烈的吸引但可能有节奏差异',
      feeling: '想要的时机不总是同步',
      nature: 'challenging',
    },
    opposition: {
      meaning: '极致的吸引力，磁铁般的拉扯',
      feeling: '既想靠近又怕被吞没',
      nature: 'challenging',
    },
  },

  // === 月亮相位 ===
  moonMoon: {
    conjunction: {
      meaning: '情感需求高度共鸣，能自然理解对方的感受',
      feeling: '心意相通，不用解释太多',
      nature: 'positive',
    },
    trine: {
      meaning: '情感上的和谐与支持',
      feeling: '在一起感到安心',
      nature: 'positive',
    },
    sextile: {
      meaning: '愿意互相照顾和关心',
      feeling: '彼此都想让对方开心',
      nature: 'positive',
    },
    square: {
      meaning: '情感需求可能存在差异',
      feeling: '有时觉得需求得不到满足',
      nature: 'challenging',
    },
    opposition: {
      meaning: '情感模式互补但需要调和',
      feeling: '各有各的安全感需求',
      nature: 'challenging',
    },
  },

  // === 土星相位 ===
  saturnSun: {
    conjunction: {
      meaning: '土星方对太阳方有责任感或权威感，可能压抑但也稳定',
      feeling: '关系中有份量和责任',
      nature: 'neutral',
    },
    trine: {
      meaning: '土星方能帮助太阳方落地和成长',
      feeling: '有一种被支持成熟的感觉',
      nature: 'positive',
    },
    square: {
      meaning: '可能感到被限制或被批评',
      feeling: '有时会觉得压力大',
      nature: 'challenging',
    },
    opposition: {
      meaning: '需要在自由和责任间找平衡',
      feeling: '既想独立又需要依靠',
      nature: 'challenging',
    },
  },

  saturnMoon: {
    conjunction: {
      meaning: '情感上的限制感，但也可能带来安全感',
      feeling: '爱得深沉但不轻松',
      nature: 'neutral',
    },
    trine: {
      meaning: '情感上的稳定和可靠',
      feeling: '知道对方不会轻易离开',
      nature: 'positive',
    },
    square: {
      meaning: '情感表达可能受阻',
      feeling: '想亲近却有些拘谨',
      nature: 'challenging',
    },
    opposition: {
      meaning: '情感安全和独立的拉扯',
      feeling: '既想被照顾又怕被控制',
      nature: 'challenging',
    },
  },

  saturnVenus: {
    conjunction: {
      meaning: '认真对待关系，但可能感到爱的表达被限制',
      feeling: '爱得很认真但不够浪漫',
      nature: 'neutral',
    },
    trine: {
      meaning: '爱情能够经受时间考验',
      feeling: '细水长流的感情',
      nature: 'positive',
    },
    square: {
      meaning: '爱与责任可能产生冲突',
      feeling: '有时觉得爱不够自由',
      nature: 'challenging',
    },
    opposition: {
      meaning: '需要在浪漫和现实间平衡',
      feeling: '现实与理想的碰撞',
      nature: 'challenging',
    },
  },

  // === 冥王星相位 ===
  plutoSun: {
    conjunction: {
      meaning: '深层的权力动态，冥王方对太阳方有变革性的影响',
      feeling: '被深深触动，难以忘怀',
      nature: 'neutral',
    },
    trine: {
      meaning: '能够帮助彼此深层转化',
      feeling: '在一起变得更强大',
      nature: 'positive',
    },
    square: {
      meaning: '可能有权力斗争或控制议题',
      feeling: '有时会感到被操控',
      nature: 'challenging',
    },
    opposition: {
      meaning: '强烈的吸引伴随深层角力',
      feeling: '爱恨交织',
      nature: 'challenging',
    },
  },

  plutoMoon: {
    conjunction: {
      meaning: '强烈的情感纽带，可能触发深层创伤',
      feeling: '情感上被彻底穿透',
      nature: 'neutral',
    },
    trine: {
      meaning: '情感层面的深度疗愈',
      feeling: '能触碰内心最深处',
      nature: 'positive',
    },
    square: {
      meaning: '情感上可能有操控或依赖',
      feeling: '爱得很深但不轻松',
      nature: 'challenging',
    },
    opposition: {
      meaning: '情感的深度连接与拉扯',
      feeling: '难以割舍又难以完全敞开',
      nature: 'challenging',
    },
  },

  plutoVenus: {
    conjunction: {
      meaning: '极致的吸引，可能有执念或占有欲',
      feeling: '爱到无法自拔',
      nature: 'neutral',
    },
    trine: {
      meaning: '深度的爱情转化',
      feeling: '因爱而蜕变',
      nature: 'positive',
    },
    square: {
      meaning: '爱中有占有和嫉妒',
      feeling: '爱得太深怕失去',
      nature: 'challenging',
    },
    opposition: {
      meaning: '爱与执念的角力',
      feeling: '既迷恋又挣扎',
      nature: 'challenging',
    },
  },

  // === 北交点相位 ===
  northNodePlanets: {
    conjunction: {
      meaning: '对方的行星促进你的成长方向，有缘分感',
      feeling: '仿佛命中注定要相遇',
      nature: 'positive',
    },
    trine: {
      meaning: '彼此能自然支持对方的成长',
      feeling: '一起走向更好的方向',
      nature: 'positive',
    },
    sextile: {
      meaning: '有机会互相促进成长',
      feeling: '抓住机会就能一起进步',
      nature: 'positive',
    },
    square: {
      meaning: '成长方向可能有摩擦',
      feeling: '各自的路可能不太一致',
      nature: 'challenging',
    },
    opposition: {
      meaning: '熟悉感，可能有前世连接感，但需注意不要停留在舒适区',
      feeling: '莫名地熟悉和亲切',
      nature: 'neutral',
    },
  },

  // === 水星相位 ===
  mercuryMercury: {
    conjunction: {
      meaning: '思维方式高度一致，沟通顺畅',
      feeling: '说什么对方都能秒懂',
      nature: 'positive',
    },
    trine: {
      meaning: '交流顺畅，思维合拍',
      feeling: '聊天很舒服',
      nature: 'positive',
    },
    sextile: {
      meaning: '愿意倾听和交流',
      feeling: '有话想跟对方说',
      nature: 'positive',
    },
    square: {
      meaning: '思维方式可能有差异',
      feeling: '有时候鸡同鸭讲',
      nature: 'challenging',
    },
    opposition: {
      meaning: '思维互补但需要调和',
      feeling: '视角不同但能互补',
      nature: 'neutral',
    },
  },
};

/** 相位类型映射 */
const ASPECT_ALIASES: Record<string, string> = {
  合: 'conjunction',
  合相: 'conjunction',
  conjunction: 'conjunction',
  拱: 'trine',
  三合: 'trine',
  trine: 'trine',
  六合: 'sextile',
  sextile: 'sextile',
  刑: 'square',
  刑相: 'square',
  square: 'square',
  冲: 'opposition',
  对冲: 'opposition',
  opposition: 'opposition',
};

/** 行星组合映射 */
const PLANET_PAIR_ALIASES: Record<string, string> = {
  // 日月
  sunmoon: 'sunMoon',
  moonsun: 'sunMoon',
  太阳月亮: 'sunMoon',
  月亮太阳: 'sunMoon',
  // 金火
  venusmars: 'venusMars',
  marsvenus: 'venusMars',
  金星火星: 'venusMars',
  火星金星: 'venusMars',
  // 月月
  moonmoon: 'moonMoon',
  月亮月亮: 'moonMoon',
  // 土日
  saturnsun: 'saturnSun',
  sunsaturn: 'saturnSun',
  土星太阳: 'saturnSun',
  太阳土星: 'saturnSun',
  // 土月
  saturnmoon: 'saturnMoon',
  moonsaturn: 'saturnMoon',
  土星月亮: 'saturnMoon',
  月亮土星: 'saturnMoon',
  // 土金
  saturnvenus: 'saturnVenus',
  venussaturn: 'saturnVenus',
  土星金星: 'saturnVenus',
  金星土星: 'saturnVenus',
  // 冥日
  plutosun: 'plutoSun',
  sunpluto: 'plutoSun',
  冥王太阳: 'plutoSun',
  太阳冥王: 'plutoSun',
  // 冥月
  plutomoon: 'plutoMoon',
  moonpluto: 'plutoMoon',
  冥王月亮: 'plutoMoon',
  月亮冥王: 'plutoMoon',
  // 冥金
  plutovenus: 'plutoVenus',
  venuspluto: 'plutoVenus',
  冥王金星: 'plutoVenus',
  金星冥王: 'plutoVenus',
  // 北交
  northnode: 'northNodePlanets',
  北交点: 'northNodePlanets',
  // 水水
  mercurymercury: 'mercuryMercury',
  水星水星: 'mercuryMercury',
};

/**
 * 获取合盘相位含义
 *
 * @param planet1 行星1（英文或中文）
 * @param planet2 行星2（英文或中文）
 * @param aspect 相位类型（英文或中文）
 * @returns 相位含义，未找到返回 undefined
 */
export function getSynastryAspectMeaning(
  planet1: string,
  planet2: string,
  aspect: string
): SynastryAspectMeaning | undefined {
  // 标准化相位
  const normalizedAspect = ASPECT_ALIASES[aspect.toLowerCase()] || aspect.toLowerCase();

  // 标准化行星组合
  const pairKey = `${planet1.toLowerCase()}${planet2.toLowerCase()}`;
  const normalizedPair = PLANET_PAIR_ALIASES[pairKey] || pairKey;

  // 查找解读
  const pairAspects = SYNASTRY_ASPECT_KNOWLEDGE[normalizedPair];
  if (!pairAspects) return undefined;

  return pairAspects[normalizedAspect as keyof PlanetPairAspects];
}

/**
 * 获取所有合盘相位知识
 */
export function getAllSynastryAspectKnowledge(): Record<string, PlanetPairAspects> {
  return SYNASTRY_ASPECT_KNOWLEDGE;
}

/**
 * 判断相位是否为挑战性相位
 */
export function isChallenging(planet1: string, planet2: string, aspect: string): boolean {
  const meaning = getSynastryAspectMeaning(planet1, planet2, aspect);
  return meaning?.nature === 'challenging';
}

/**
 * 判断相位是否为正面相位
 */
export function isPositive(planet1: string, planet2: string, aspect: string): boolean {
  const meaning = getSynastryAspectMeaning(planet1, planet2, aspect);
  return meaning?.nature === 'positive';
}

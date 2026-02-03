/**
 * 五行映射
 *
 * 行星与五行的对应关系，用于融合中国传统文化视角
 * 原则：以西方占星为主体，五行为补充视角（点缀而非主导）
 */

/** 五行类型 */
export type WuxingElement = '金' | '木' | '水' | '火' | '土';

/** 行星五行映射 */
export const PLANET_WUXING: Record<string, { element: WuxingElement; description: string }> = {
  sun: { element: '火', description: '太阳属火，代表生命力和自我表达的热情' },
  moon: { element: '水', description: '月亮属水，代表情绪流动和直觉感知' },
  mercury: { element: '木', description: '水星属木，代表思维的生发和沟通的活力' },
  venus: { element: '金', description: '金星属金，代表对美和爱的敏锐感知' },
  mars: { element: '火', description: '火星属火，代表行动力和竞争的热量' },
  jupiter: { element: '土', description: '木星属土，厚德载物，代表扩展和包容' },
  saturn: { element: '土', description: '土星属土，代表踏实积累和规则' },
  uranus: { element: '金', description: '天王星属金，代表破旧立新的锐利' },
  neptune: { element: '水', description: '海王星属水，代表直觉、梦境和灵感' },
  pluto: { element: '水', description: '冥王星属水，代表深层转化和重生' },
};

/** 星座五行映射 */
export const SIGN_WUXING: Record<string, { element: WuxingElement; description: string }> = {
  aries: { element: '火', description: '白羊火象，先行动再思考' },
  taurus: { element: '土', description: '金牛土象，稳扎稳打' },
  gemini: { element: '木', description: '双子风象配木，思维活跃善变' },
  cancer: { element: '水', description: '巨蟹水象，情感丰富重家庭' },
  leo: { element: '火', description: '狮子火象，热情外放有领导力' },
  virgo: { element: '土', description: '处女土象，细致务实重分析' },
  libra: { element: '金', description: '天秤风象配金，审美敏锐重和谐' },
  scorpio: { element: '水', description: '天蝎水象，深沉内敛有洞察力' },
  sagittarius: { element: '火', description: '射手火象，热情探索追求自由' },
  capricorn: { element: '土', description: '摩羯土象，务实进取有野心' },
  aquarius: { element: '金', description: '水瓶风象配金，独立创新反传统' },
  pisces: { element: '水', description: '双鱼水象，直觉敏锐富同情心' },
};

/**
 * 计算五行平衡
 *
 * 基于星盘中行星的星座分布计算五行强弱
 * @param planets 行星星座映射，如 { sun: 'aries', moon: 'cancer', ... }
 * @returns 五行平衡描述
 */
export function calculateWuxingBalance(planets: Record<string, string>): {
  balance: Record<WuxingElement, number>;
  summary: string;
  dominant: WuxingElement;
  weak: WuxingElement;
} {
  const balance: Record<WuxingElement, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

  // 权重：日月升权重高，其他行星权重低
  const weights: Record<string, number> = {
    sun: 3, moon: 3, mercury: 1, venus: 1, mars: 2,
    jupiter: 1, saturn: 1, uranus: 0.5, neptune: 0.5, pluto: 0.5,
  };

  for (const [planet, sign] of Object.entries(planets)) {
    const signLower = sign.toLowerCase();
    const signWuxing = SIGN_WUXING[signLower];
    const planetWuxing = PLANET_WUXING[planet.toLowerCase()];
    const weight = weights[planet.toLowerCase()] || 1;

    if (signWuxing) balance[signWuxing.element] += weight;
    if (planetWuxing) balance[planetWuxing.element] += weight * 0.5;
  }

  // 找出最强和最弱
  const sorted = Object.entries(balance).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0] as WuxingElement;
  const weak = sorted[sorted.length - 1][0] as WuxingElement;

  // 生成摘要
  const WUXING_TRAITS: Record<WuxingElement, { strong: string; weak: string }> = {
    '金': { strong: '逻辑清晰、决断力强', weak: '可能缺少灵活变通' },
    '木': { strong: '思维活跃、善于沟通', weak: '可能缺少深入思考' },
    '水': { strong: '直觉敏锐、情感丰富', weak: '可能缺少理性决断' },
    '火': { strong: '行动力强、热情外放', weak: '可能缺少耐心沉淀' },
    '土': { strong: '踏实可靠、务实稳重', weak: '可能缺少冒险精神' },
  };

  const summary = `${dominant}旺${weak}弱：${WUXING_TRAITS[dominant].strong}，但${WUXING_TRAITS[weak].weak}`;

  return { balance, summary, dominant, weak };
}

/**
 * 获取行星+星座的五行融合描述
 *
 * @param planet 行星名（英文小写）
 * @param sign 星座名（英文小写）
 * @returns 五行融合描述
 */
export function getWuxingMapping(planet: string, sign: string): string {
  const planetWuxing = PLANET_WUXING[planet.toLowerCase()];
  const signWuxing = SIGN_WUXING[sign.toLowerCase()];

  if (!planetWuxing || !signWuxing) return '';

  if (planetWuxing.element === signWuxing.element) {
    return `${planetWuxing.element}上加${planetWuxing.element}，能量加倍`;
  }

  // 五行相生：木生火、火生土、土生金、金生水、水生木
  const SHENG: Record<WuxingElement, WuxingElement> = {
    '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
  };

  if (SHENG[planetWuxing.element] === signWuxing.element) {
    return `${planetWuxing.element}生${signWuxing.element}，能量顺畅流动`;
  }
  if (SHENG[signWuxing.element] === planetWuxing.element) {
    return `${signWuxing.element}生${planetWuxing.element}，有底层支撑`;
  }

  // 五行相克：木克土、土克水、水克火、火克金、金克木
  const KE: Record<WuxingElement, WuxingElement> = {
    '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
  };

  if (KE[planetWuxing.element] === signWuxing.element) {
    return `${planetWuxing.element}克${signWuxing.element}，有内在张力但也催生成长`;
  }
  if (KE[signWuxing.element] === planetWuxing.element) {
    return `${signWuxing.element}克${planetWuxing.element}，需要额外调和`;
  }

  return `${planetWuxing.element}配${signWuxing.element}，互相调和`;
}

/** 获取紧凑的五行摘要（用于注入 prompt） */
export function getCompactWuxingSummary(planets: Record<string, string>): string {
  const { summary } = calculateWuxingBalance(planets);
  return `五行：${summary}`;
}

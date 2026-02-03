/**
 * K线数据生成服务
 * 基于占星周期生成人生100年的K线数据
 */

// 星座数据（使用 PNG 图片路径，避免 Unicode 符号在微信小程序中显示为彩色 emoji）
const ZODIAC_SIGNS = [
  { name: '白羊座', icon: '/images/astro-symbols/aries.png', element: 'fire' },
  { name: '金牛座', icon: '/images/astro-symbols/taurus.png', element: 'earth' },
  { name: '双子座', icon: '/images/astro-symbols/gemini.png', element: 'air' },
  { name: '巨蟹座', icon: '/images/astro-symbols/cancer.png', element: 'water' },
  { name: '狮子座', icon: '/images/astro-symbols/leo.png', element: 'fire' },
  { name: '处女座', icon: '/images/astro-symbols/virgo.png', element: 'earth' },
  { name: '天秤座', icon: '/images/astro-symbols/libra.png', element: 'air' },
  { name: '天蝎座', icon: '/images/astro-symbols/scorpio.png', element: 'water' },
  { name: '射手座', icon: '/images/astro-symbols/sagittarius.png', element: 'fire' },
  { name: '摩羯座', icon: '/images/astro-symbols/capricorn.png', element: 'earth' },
  { name: '水瓶座', icon: '/images/astro-symbols/aquarius.png', element: 'air' },
  { name: '双鱼座', icon: '/images/astro-symbols/pisces.png', element: 'water' },
];

// 天干地支
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 类型定义
export interface ZodiacSign {
  name: string;
  icon: string;
  element: string;
}

export interface GanZhi {
  stem: string;
  branch: string;
  full: string;
}

export interface KLineData {
  year: number;
  age: number;
  ganzhi: GanZhi;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  trend: 'bull' | 'bear';
  isCurrentYear: boolean;
  isSaturnReturn: boolean;
  isJupiterReturn: boolean;
  isUranusOpposition: boolean;
}

export interface NatalChart {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  ascendant: ZodiacSign;
}

export interface KLineGenerateResult {
  klineData: KLineData[];
  natalChart: NatalChart;
}

/**
 * 根据月日获取太阳星座
 */
function getSunSign(month: number, day: number): ZodiacSign {
  const dates = [
    [20, 19], // 1月：20日前是摩羯，20日后是水瓶
    [19, 18], // 2月
    [21, 20], // 3月
    [20, 20], // 4月
    [21, 21], // 5月
    [21, 22], // 6月
    [23, 22], // 7月
    [23, 22], // 8月
    [23, 22], // 9月
    [23, 21], // 10月
    [22, 21], // 11月
    [22, 19], // 12月
  ];
  let idx = month - 1;
  if (day < dates[idx][0]) {
    idx = (idx + 11) % 12;
  }
  return ZODIAC_SIGNS[idx];
}

/**
 * 简化的月亮星座计算（基于出生信息的哈希）
 */
function getMoonSign(year: number, month: number, day: number): ZodiacSign {
  // 简化算法：基于出生日期的组合
  const idx = (year * 7 + month * 3 + day) % 12;
  return ZODIAC_SIGNS[idx];
}

/**
 * 根据出生时辰获取上升星座
 */
function getAscendant(hour: number): ZodiacSign {
  // 简化算法：每2小时对应一个星座
  const idx = Math.floor(hour / 2) % 12;
  return ZODIAC_SIGNS[idx];
}

/**
 * 计算本命盘关键信息
 */
export function calculateNatalSigns(
  year: number,
  month: number,
  day: number,
  hour: number = 12
): NatalChart {
  return {
    sunSign: getSunSign(month, day),
    moonSign: getMoonSign(year, month, day),
    ascendant: getAscendant(hour),
  };
}

/**
 * 获取年份的干支
 */
function getYearGanZhi(year: number): GanZhi {
  const stemIdx = (year - 4) % 10;
  const branchIdx = (year - 4) % 12;
  return {
    stem: STEMS[stemIdx],
    branch: BRANCHES[branchIdx],
    full: STEMS[stemIdx] + BRANCHES[branchIdx],
  };
}

/**
 * 伪随机数生成器（基于种子，保证同一用户每次结果一致）
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * 生成K线数据
 * @param birthYear 出生年份
 * @param birthMonth 出生月份
 * @param birthDay 出生日期
 */
export function generateKLineData(
  birthYear: number,
  birthMonth: number,
  birthDay: number
): KLineData[] {
  const currentYear = new Date().getFullYear();
  const data: KLineData[] = [];
  let prevClose = 50;

  // 生成一个基于出生日期的基础种子
  const baseSeed = birthYear * 10000 + birthMonth * 100 + birthDay;

  for (let age = 1; age <= 100; age++) {
    const year = birthYear + age - 1;

    // 计算基础分
    let score = 50;

    // 土星周期 (29.5年) - 挑战期
    const saturnPhase = (age % 29.5) / 29.5;
    if (Math.abs(saturnPhase) < 0.05 || Math.abs(saturnPhase - 1) < 0.05) {
      score -= 12; // 土星回归
    } else if (Math.abs(saturnPhase - 0.5) < 0.05) {
      score -= 8; // 土星对分
    }

    // 木星周期 (12年) - 机遇期
    const jupiterPhase = (age % 12) / 12;
    if (Math.abs(jupiterPhase) < 0.08 || Math.abs(jupiterPhase - 1) < 0.08) {
      score += 15; // 木星回归
    }

    // 天王星对分 (42岁左右) - 中年觉醒
    if (age >= 40 && age <= 44) {
      score -= 8;
    }

    // 年龄相关的确定性波动（使用种子保证一致性）
    const seed = baseSeed + year * 7 + age * 13;
    const randomFactor = seededRandom(seed);
    score += (randomFactor - 0.5) * 25;

    // 限制分数范围
    score = Math.max(15, Math.min(90, score));

    // K线数据计算
    const volatilitySeed = seededRandom(seed + 1000);
    const volatility = 8 + volatilitySeed * 10;

    const open = prevClose;
    const closeSeed = seededRandom(seed + 2000);
    const close = score + (closeSeed - 0.5) * 10;

    const highSeed = seededRandom(seed + 3000);
    const high = Math.max(score, open, close) + highSeed * volatility;

    const lowSeed = seededRandom(seed + 4000);
    const low = Math.min(score, open, close) - lowSeed * volatility;

    // 标记重要节点
    const isSaturnReturn = Math.abs(age - 29) <= 1 || Math.abs(age - 59) <= 1;
    const isJupiterReturn = age % 12 <= 1 || age % 12 >= 11;
    const isUranusOpposition = age >= 40 && age <= 44;

    data.push({
      year,
      age,
      ganzhi: getYearGanZhi(year),
      open: Math.round(Math.max(10, Math.min(95, open))),
      close: Math.round(Math.max(10, Math.min(95, close))),
      high: Math.round(Math.max(15, Math.min(100, high))),
      low: Math.round(Math.max(5, Math.min(90, low))),
      score: Math.round(score),
      trend: close >= open ? 'bull' : 'bear',
      isCurrentYear: year === currentYear,
      isSaturnReturn,
      isJupiterReturn,
      isUranusOpposition,
    });

    prevClose = close;
  }

  return data;
}

/**
 * 生成年度主题
 */
export function generateYearTheme(yearData: KLineData): string {
  const { age, score, isSaturnReturn, isJupiterReturn, isUranusOpposition } = yearData;

  if (isSaturnReturn) {
    return age < 35 ? '土星回归·人生结构重建' : '第二次土星回归·智慧收获';
  }
  if (isJupiterReturn) {
    return '木星回归·扩张与机遇';
  }
  if (isUranusOpposition) {
    return '天王星对分·中年觉醒';
  }

  if (score >= 70) return '顺遂之年·乘势而上';
  if (score >= 55) return '稳健之年·稳中求进';
  if (score >= 45) return '平稳之年·修炼内功';
  if (score >= 35) return '挑战之年·韬光养晦';
  return '蛰伏之年·静待花开';
}

/**
 * 生成重要事件描述
 */
export function generateMajorEvent(
  yearData: KLineData
): { name: string; impact: number; description: string } | null {
  const { age, isSaturnReturn, isJupiterReturn, isUranusOpposition } = yearData;

  if (isSaturnReturn) {
    return {
      name: '土星回归',
      impact: -15,
      description:
        age < 35
          ? '这是人生最重要的转折点之一。你将经历从"青年"到"真正成年人"的蜕变。曾经的幻想、不切实际的期待都将面临现实的检验。这不是惩罚，而是宇宙送给你的成人礼——通过考验，你将建立起真正稳固的人生结构。'
          : '第二次土星回归标志着人生进入"收获与传承"的阶段。此时你应当回顾一生的建树，思考想要留下怎样的人生印记。这也是重新定义人生下半场的关键时期。',
    };
  }

  if (isJupiterReturn) {
    return {
      name: '木星回归',
      impact: 15,
      description:
        '每12年一次的木星回归是你的"幸运年"！木星带来扩张、乐观、机遇的能量。这一年适合开拓新领域、学习新技能、扩展人脉、远行等。但要注意避免过度乐观导致的承诺过多。',
    };
  }

  if (isUranusOpposition) {
    return {
      name: '天王星对分相',
      impact: -10,
      description:
        '这就是常说的"中年危机"的占星根源，但更准确地说是"中年觉醒"。内心深处那个"真正的自己"开始敲门，要求被看见、被表达。你可能突然感到不满足，渴望自由与改变。不要压抑这种感觉，而是找到健康的方式去探索"我是谁"。',
    };
  }

  return null;
}

/**
 * 生成行动建议
 */
export function generateActionAdvice(
  yearData: KLineData
): { mustDo: string[]; mustNot: string[] } {
  const { score, isSaturnReturn, isJupiterReturn, isUranusOpposition } = yearData;
  const mustDo: string[] = [];
  const mustNot: string[] = [];

  if (isSaturnReturn) {
    mustDo.push(
      '认真审视人生方向——花时间想清楚未来3-5年最想实现的目标，然后制定切实可行的计划',
      '放下不切实际的期待——把那些"总有一天"的幻想换成"今天就开始"的行动',
      '建立稳定的生活结构——固定的作息、规律的运动、持续的学习，这些"无聊"的习惯恰恰是成功的基石'
    );
    mustNot.push(
      '不要逃避责任——现在逃开的问题，以后会以更大的代价回来找你',
      '不要固守旧模式——如果一件事已经不适合你了，及时止损比硬撑更有智慧'
    );
  } else if (isJupiterReturn) {
    mustDo.push(
      '大胆追求想做的事——你心里那个一直想做但没敢开始的事情，今年就是最好的时机',
      '扩展人脉和社交圈——多参加聚会、行业活动或兴趣社群，贵人可能就在其中',
      '学习新技能、拓展视野——报个课、读本书、去个没去过的地方，打开你的世界'
    );
    mustNot.push(
      '不要承诺过多——运势好不等于精力无限，学会对不重要的事说"不"',
      '不要过度乐观而忽视风险——做重要决定前先想想最坏的情况你能不能承受'
    );
  } else if (isUranusOpposition) {
    mustDo.push(
      '给自己充分的探索空间——尝试一个新爱好、去一个新地方、认识一些不同圈子的人',
      '和亲近的人坦诚沟通——把内心的不安和渴望说出来，而不是一个人默默消化',
      '做一些打破常规的事——换个发型、调整职业方向、重新规划生活节奏都可以'
    );
    mustNot.push(
      '不要在冲动下做不可逆的决定——想离职、分手、搬家都行，但给自己至少一个月的冷静期',
      '不要压抑内心的渴望——想改变是正常的，关键是找到健康的方式去回应它'
    );
  } else if (score >= 65) {
    mustDo.push(
      '抓住机遇、积极行动——好运来了就要接住，犹豫太久机会就溜走了',
      '扩展人脉、建立合作——多认识优秀的人，一个好的合作可能改变你的轨迹',
      '投资自己、学习成长——把赚到的钱和时间拿一部分出来提升自己，这是回报率最高的投资'
    );
    mustNot.push(
      '不要骄傲自满——越是顺利越要保持谦逊，你今天的好运明天也可能属于别人',
      '不要冒不必要的风险——运势好不代表做什么都能成功，大额投资和重大决定仍需谨慎'
    );
  } else if (score >= 45) {
    mustDo.push(
      '稳扎稳打、巩固基础——现在不是冒险的时候，把手头的事情做好比什么都重要',
      '提升核心技能——利用这段平稳期学习和充电，为未来的机遇做好准备',
      '维护重要关系——和家人、朋友、同事保持良好的连接，困难时他们是你最大的支撑'
    );
    mustNot.push(
      '不要急于求成——欲速则不达，按照自己的节奏来就好',
      '不要做重大冒险——大额投资、跨行创业等高风险动作建议推迟到运势更好的时候'
    );
  } else {
    mustDo.push(
      '保持耐心、蛰伏等待——低谷期最重要的能力就是"忍耐"，咬牙坚持就是胜利',
      '关注身心健康——压力大的时候更要好好吃饭、好好睡觉、好好运动，身体是革命的本钱',
      '反思和调整方向——利用这段时间想清楚什么是自己真正想要的，为下一次起飞做准备'
    );
    mustNot.push(
      '不要自暴自弃——低谷是暂时的，你的价值不会因为一段时间的不顺就消失',
      '不要在情绪低落时做重大决定——冲动辞职、结束关系等大事请先冷静再说'
    );
  }

  return { mustDo, mustNot };
}

/**
 * 生成月度运势
 */
export function generateMonthlyFortune(
  year: number,
  baseScore: number
): Array<{ month: number; score: number; keyword: string; note: string }> {
  const keywords = [
    '开局', '社交', '机遇', '突破', '财运', '调整',
    '反思', '挑战', '务实', '稳定', '冲刺', '收尾',
  ];
  const notes = [
    '制定计划', '扩展人脉', '把握机会', '大胆行动', '理财投资', '休息调整',
    '避免决策', '谨慎应对', '专注执行', '稳扎稳打', '全力以赴', '总结反思',
  ];

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const seed = year * 13 + m * 7;
    const seedValue = seededRandom(seed);
    const monthScore = Math.max(1, Math.min(5, Math.round(baseScore / 20 + (seedValue - 0.5) * 2)));

    return {
      month: m,
      score: monthScore,
      keyword: keywords[i],
      note: notes[i],
    };
  });
}

/**
 * 生成个性化寄语
 */
export function generatePersonalMessage(score: number, age: number, theme: string): string {
  if (score >= 70) {
    return `亲爱的${age}岁的自己：\n\n这是属于你的高光时刻！宇宙为你准备了丰盛的礼物，但记住，机遇只青睐有准备的人。\n\n"${theme}"——这四个字就是你今年的主旋律。在享受顺风的同时，也要为未来的挑战储备能量。顺境中最容易犯的错误就是以为好运会一直持续，聪明人会在春天为冬天存粮。\n\n去大胆追梦吧，但别忘了脚下的路。这一年你值得所有的美好，也有能力创造更多的可能。\n\n愿你乘风破浪，也不忘初心。`;
  } else if (score >= 55) {
    return `亲爱的${age}岁的自己：\n\n"${theme}"——这个主题词已经暗示了这一年的基调。运势不错，虽然不是那种一飞冲天的年份，但绝对是稳步向前的好时光。\n\n不是所有的年份都需要狂飙突进，有时候稳稳地走，反而能到达更远的地方。你现在做的每一个小决定，都在为未来的自己铺路。不要小看日复一日的坚持，量变终将引发质变。\n\n享受当下的节奏，不攀比、不焦虑。你的时区刚刚好。\n\n相信自己，一步一个脚印。`;
  } else if (score >= 40) {
    return `亲爱的${age}岁的自己：\n\n"${theme}"——或许这不是最闪耀的一年，但绝对是最有价值的一年之一。\n\n平淡的日子其实是最好的"修炼场"。没有大起大落，你才有机会静下心来，看看自己这些年走过的路，想想接下来真正想去的方向。很多了不起的人，都是在这样的"安静期"里完成了最重要的转变。\n\n不要因为平凡而焦虑，也不要因为普通而自我否定。你的光芒不需要每时每刻都绽放，有时候收敛锋芒，是为了下一次更耀眼的登场。\n\n沉住气，好戏还在后头。`;
  } else {
    return `亲爱的${age}岁的自己：\n\n如果这一年感到艰难，请记住：你不是一个人在扛，而且这段日子一定会过去。\n\n"${theme}"——听起来可能有些沉重，但每一段低谷期都有它的意义。就像肌肉在撕裂后才会变得更强壮，你现在经历的一切都在为未来的自己"加buff"。回头看那些曾经觉得过不去的坎，哪一个不是后来的你轻描淡写？\n\n不要在低谷期做人生大决定，不要在深夜看那些让你焦虑的东西。多出门走走，多和让你舒服的人待在一起，多做能让你开心的小事。\n\n坚持住，美好即将到来。你比自己以为的要强大得多。`;
  }
}

/**
 * 生成占星摘要
 */
export function generateAstroSummary(year: number, age: number): string {
  const houses = ['命宫', '财帛宫', '兄弟宫', '田宅宫', '子女宫', '奴仆宫', '夫妻宫', '疾厄宫', '迁移宫', '事业宫', '福德宫', '玄秘宫'];
  const houseThemes = [
    '自我认同与个人形象的重塑',
    '财务收入与物质价值观的调整',
    '沟通学习与近距离关系的活跃',
    '家庭根基与内在安全感的建设',
    '创造力与爱的表达的绽放',
    '日常工作与身心调养的优化',
    '亲密关系与合作模式的深化',
    '深层转化与共同资源的整合',
    '远行求学与视野拓展的机遇',
    '事业声望与社会地位的提升',
    '理想愿景与社群连接的扩展',
    '灵性成长与潜意识整合的深化',
  ];
  const houseAdvices = [
    '这是重新定义"我是谁"的好时机，适合改变形象、调整生活方式或开启新的个人项目。建议大胆展现真实的自己。',
    '这股能量会帮助你发现新的收入来源或改善财务状况。建议重新审视自己的消费观和理财方式。',
    '这一年你的表达能力和学习能力都会提升，适合学新东西、写作或拓展社交圈。建议多和身边的人交流想法。',
    '家庭关系和居住环境是这一年的重要课题。适合搬家、装修或改善和家人的相处方式。',
    '创造力和表达欲会特别旺盛，适合发展兴趣爱好、参与艺术活动或享受恋爱的甜蜜。',
    '这一年适合调整生活节奏，优化日常的工作方式和健康习惯。小的改变会带来大的不同。',
    '亲密关系和合作伙伴关系会成为焦点，适合深化感情或建立重要的合作。',
    '这是一个适合"断舍离"的时期——无论是旧物、旧习惯还是不再适合的关系。',
    '远方在召唤你！这一年适合旅行、留学、学习新文化或参加远程的项目。',
    '事业上可能迎来重要的认可或晋升，你的社会声望在提升。',
    '你会更加关注友谊、社群和自己的理想。适合加入新的圈子、参与公益活动或为未来设定大胆的目标。',
    '内心世界会变得更加丰富，直觉力增强。这一年适合静修、冥想、写日记或进行心理咨询。',
  ];
  const houseIdx = (year + age) % 12;

  return `这一年，过境木星行经你的${houses[houseIdx]}（也就是掌管${houseThemes[houseIdx]}的领域），这意味着宇宙正在为你这个方向注入扩张和成长的能量。${houseAdvices[houseIdx]}`;
}

/**
 * 生成八字摘要
 */
export function generateBaziSummary(ganzhi: GanZhi, score: number = 50): string {
  const stemElements: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  const stemTraits: Record<string, string> = {
    '木': '生发向上',
    '火': '热情奔放',
    '土': '厚重沉稳',
    '金': '锐利果决',
    '水': '灵活变通',
  };
  const branchSeasons: Record<string, string> = { '子': '冬藏', '丑': '冬末蓄力', '寅': '春生', '卯': '春盛', '辰': '春转夏', '巳': '夏旺', '午': '夏盛', '未': '夏转秋', '申': '秋收', '酉': '秋实', '戌': '秋转冬', '亥': '冬蓄' };
  const stemEl = stemElements[ganzhi.stem] || '土';
  const elementAdvices: Record<string, Record<string, string>> = {
    '木': { high: '木气旺盛的年份，你的创造力和行动力都会增强，就像春天的树木一样充满生机。适合启动新项目、学习新技能或开始新的人际关系。', medium: '木气平和，成长的速度虽然不快，但根基在不断扎实。就像一棵正在扎根的树，表面看不出变化，但地下已经伸展得很远。建议保持耐心，专注于"扎根"的事情。', low: '木气受阻，可能会感觉做什么都不太顺畅，好像遇到了一堵看不见的墙。这其实是在提醒你暂停一下、反思一下方向对不对。建议减少盲目的行动，多思考再出发。' },
    '火': { high: '火的能量让你热情洋溢、充满感染力，走到哪里都是人群的焦点。适合做需要展示、演讲、社交的事情，你的表现会让人眼前一亮。', medium: '火气适中，热情还在但更加内敛。这种"温火慢炖"的状态其实最适合处理需要耐心的事情。建议把热情用在刀刃上，不要四处撒网。', low: '火气偏弱，可能会感觉缺乏激情和动力，做什么都提不起劲。这不是你"懒"了，而是身体在告诉你需要休息和充电。建议多做能让你重新燃起热情的事情。' },
    '土': { high: '土的能量带来踏实和稳定，这一年你做事会特别靠谱、特别有执行力。适合处理房产、签合同、建立长期合作等需要"落地"的事情。', medium: '土气平稳，虽然不够exciting，但却是最安全的状态。就像走在平坦的大路上，不会有惊喜但也不会有意外。建议利用这种稳定感来完成一些之前一直拖着没做的事。', low: '土气不足，可能会感觉做什么都不太踏实，缺乏安全感。这种时候容易焦虑或者做出冲动的决定。建议给自己找一个"锚点"——一个能让你感到安心的人、事或环境。' },
    '金': { high: '金的能量让你的判断力和决断力特别强，适合做重要的取舍和决定。该断则断，不要犹豫。同时你的审美和品味也在提升。', medium: '金气平和，理性与感性比较平衡。这一年不宜做太激进的决策，但可以慢慢收拾和整理——无论是生活空间、人际关系还是财务状况。', low: '金气偏弱，可能会在做决定时犹豫不决，或者容易心软而错过最佳时机。建议遇到重要决定时给自己设一个截止日期，到了就执行，不要一直拖。' },
    '水': { high: '水的能量增强了你的直觉和洞察力，你会比平时更能看透事物的本质。适合做需要创意、策划和深度思考的事情。同时人际关系也会更加圆融。', medium: '水气适中，思维灵活但不会过于飘忽。这一年适合学习、阅读和提升认知水平，你吸收新知识的能力比往常更强。建议多读书、多上课、多和聪明人交流。', low: '水气不足，思维可能会有些僵化，不太容易接受新观点或新方法。建议主动让自己接触不同的信息和观点，打破思维定式。多出去走走，换个环境换个心情。' }
  };
  const elLevel = score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';

  const summaries = [
    `${ganzhi.full}年，天干${ganzhi.stem}属${stemEl}——用通俗的话说，就是"${stemTraits[stemEl]}"的能量在主导这一年。地支${ganzhi.branch}对应${branchSeasons[ganzhi.branch]}的节律，意味着这一年的整体节奏是${score >= 50 ? '向前推进' : '沉淀积累'}的。${elementAdvices[stemEl][elLevel]}`,
    `流年${ganzhi.full}，${stemEl}的能量是今年的主旋律。简单来说，${stemEl}代表${stemTraits[stemEl]}，这种特质会在你今年的生活中频繁出现。地支${ganzhi.branch}值年，对应的是${branchSeasons[ganzhi.branch]}的时间节奏——${score >= 50 ? '正是积极行动的好时候' : '提醒你要学会等待合适的时机'}。${elementAdvices[stemEl][elLevel]}`,
    `${ganzhi.full}年的能量组合中，天干${ganzhi.stem}和地支${ganzhi.branch}搭配，形成了${stemEl}气${score >= 60 ? '旺盛' : score >= 40 ? '平稳' : '偏弱'}的格局。翻译成日常语言就是：今年适合${score >= 60 ? '大胆出击、把握每一个看得到的机会' : score >= 40 ? '稳步推进、不急不躁地做好手头的事' : '养精蓄锐、把精力留给真正重要的事情'}。${elementAdvices[stemEl][elLevel]}`,
    `从传统命理的视角来看，${ganzhi.full}年天干${ganzhi.stem}带来${stemTraits[stemEl]}的特质，地支${ganzhi.branch}蕴含${branchSeasons[ganzhi.branch]}的意象。这两股力量交汇在一起，对你今年的运势${score >= 55 ? '形成支持——像是顺风而行' : '形成考验——像是逆风前行但能锻炼你的韧性'}。${elementAdvices[stemEl][elLevel]}`,
    `${ganzhi.full}年，五行中的${stemEl}是今年的核心能量。${ganzhi.stem}在天代表外在的趋势，${ganzhi.branch}在地代表内在的节奏，两者共同作用影响着你这一年的状态。${branchSeasons[ganzhi.branch]}的时令特征也在提示你${score >= 50 ? '顺势而为，该出手时就出手' : '顺其自然，该休息时就好好休息'}。${elementAdvices[stemEl][elLevel]}`,
    `流年${ganzhi.full}，以${stemEl}为主导。通俗地说，${stemEl}的"${stemTraits[stemEl]}"特质会成为你今年生活的一个关键词。本年的核心功课是${score >= 60 ? '在顺境中保持清醒——越是顺利越要稳住心态' : score >= 40 ? '在平淡中发现价值——很多重要的成长都发生在不知不觉中' : '在困境中积蓄力量——今天忍过的苦，都是明天成功的养分'}。${elementAdvices[stemEl][elLevel]}`,
  ];

  const idx =
    (ganzhi.stem.charCodeAt(0) + ganzhi.branch.charCodeAt(0)) % summaries.length;
  return summaries[idx];
}

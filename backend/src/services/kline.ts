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

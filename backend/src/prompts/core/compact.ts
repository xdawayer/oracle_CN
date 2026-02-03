/**
 * 紧凑序列化工具
 *
 * 将星盘数据压缩为简洁的字符串格式，减少 user prompt 的 token 消耗
 *
 * 优化效果：
 * - 星盘摘要：从 ~500 字符 → ~80 字符（减少 84%）
 * - 行运摘要：从 ~400 字符 → ~60 字符（减少 85%）
 * - 合盘信号：从 ~600 字符 → ~100 字符（减少 83%）
 */

/** 星座中文简称映射 */
const SIGN_SHORT: Record<string, string> = {
  Aries: '白羊', Taurus: '金牛', Gemini: '双子', Cancer: '巨蟹',
  Leo: '狮子', Virgo: '处女', Libra: '天秤', Scorpio: '天蝎',
  Sagittarius: '射手', Capricorn: '摩羯', Aquarius: '水瓶', Pisces: '双鱼',
  // 中文直接返回
  白羊座: '白羊', 金牛座: '金牛', 双子座: '双子', 巨蟹座: '巨蟹',
  狮子座: '狮子', 处女座: '处女', 天秤座: '天秤', 天蝎座: '天蝎',
  射手座: '射手', 摩羯座: '摩羯', 水瓶座: '水瓶', 双鱼座: '双鱼',
};

/** 行星中文简称映射 */
const PLANET_SHORT: Record<string, string> = {
  Sun: '日', Moon: '月', Mercury: '水', Venus: '金', Mars: '火',
  Jupiter: '木', Saturn: '土', Uranus: '天', Neptune: '海', Pluto: '冥',
  NorthNode: '北交', SouthNode: '南交', Chiron: '凯龙', Lilith: '莉莉丝',
  // 中文直接返回
  太阳: '日', 月亮: '月', 水星: '水', 金星: '金', 火星: '火',
  木星: '木', 土星: '土', 天王星: '天', 海王星: '海', 冥王星: '冥',
};

/** 相位符号映射 */
const ASPECT_SYMBOL: Record<string, string> = {
  conjunction: '合', opposition: '冲', square: '刑', trine: '拱', sextile: '六合',
  quincunx: '梅花', semisquare: '半刑', sesquiquadrate: '补八分',
  Conjunction: '合', Opposition: '冲', Square: '刑', Trine: '拱', Sextile: '六合',
  // 符号
  '☌': '合', '☍': '冲', '□': '刑', '△': '拱', '⚹': '六合',
};

/** 获取星座简称 */
function getSignShort(sign: string): string {
  return SIGN_SHORT[sign] || sign.replace('座', '');
}

/** 获取行星简称 */
function getPlanetShort(planet: string): string {
  return PLANET_SHORT[planet] || planet;
}

/** 获取相位符号 */
function getAspectSymbol(aspect: string): string {
  return ASPECT_SYMBOL[aspect] || aspect;
}

/**
 * 压缩星盘摘要
 *
 * @example
 * 输入: { sun: { sign: 'Leo', house: 5 }, moon: { sign: 'Virgo', house: 6 }, ... }
 * 输出: "日狮子5宫｜月处女6宫｜升天秤｜相位:日合月,金拱木,火刑土"
 */
export function compactChartSummary(summary: any): string {
  if (!summary) return '无星盘数据';

  const parts: string[] = [];

  // 日月升
  if (summary.sun) {
    const sign = getSignShort(summary.sun.sign || summary.sun.星座 || '');
    const house = summary.sun.house || summary.sun.宫位 || '';
    parts.push(`日${sign}${house ? house + '宫' : ''}`);
  }

  if (summary.moon) {
    const sign = getSignShort(summary.moon.sign || summary.moon.星座 || '');
    const house = summary.moon.house || summary.moon.宫位 || '';
    parts.push(`月${sign}${house ? house + '宫' : ''}`);
  }

  if (summary.rising || summary.ascendant) {
    const rising = summary.rising || summary.ascendant;
    const sign = getSignShort(rising.sign || rising.星座 || rising || '');
    parts.push(`升${sign}`);
  }

  // 主要相位（最多5个）
  const aspects = summary.aspects || summary.相位 || [];
  if (aspects.length > 0) {
    const aspectStrs = aspects.slice(0, 5).map((a: any) => {
      const p1 = getPlanetShort(a.planet1 || a.行星1 || a.from || '');
      const p2 = getPlanetShort(a.planet2 || a.行星2 || a.to || '');
      const asp = getAspectSymbol(a.aspect || a.相位 || a.type || '');
      return `${p1}${asp}${p2}`;
    });
    parts.push(`相位:${aspectStrs.join(',')}`);
  }

  return parts.join('｜') || JSON.stringify(summary);
}

/**
 * 压缩行运摘要
 *
 * @example
 * 输出: "行运木星拱本命日｜行运土星刑本命月｜月相:上弦"
 */
export function compactTransitSummary(transit: any): string {
  if (!transit) return '无行运数据';

  const parts: string[] = [];

  // 主要行运相位（最多5个）
  const aspects = transit.aspects || transit.相位 || transit.transitAspects || [];
  if (aspects.length > 0) {
    const aspectStrs = aspects.slice(0, 5).map((a: any) => {
      const tp = getPlanetShort(a.transitPlanet || a.行运行星 || a.planet || '');
      const np = getPlanetShort(a.natalPlanet || a.本命行星 || a.to || '');
      const asp = getAspectSymbol(a.aspect || a.相位 || a.type || '');
      return `运${tp}${asp}命${np}`;
    });
    parts.push(aspectStrs.join('｜'));
  }

  // 月相
  if (transit.moonPhase || transit.月相) {
    parts.push(`月相:${transit.moonPhase || transit.月相}`);
  }

  // 逆行行星
  if (transit.retrograde || transit.逆行) {
    const retro = transit.retrograde || transit.逆行;
    if (Array.isArray(retro) && retro.length > 0) {
      parts.push(`逆行:${retro.map(getPlanetShort).join('')}`);
    }
  }

  return parts.join('｜') || JSON.stringify(transit);
}

/**
 * 压缩合盘信号
 *
 * @example
 * 输出: "甲金合乙火(吸引)｜甲月刑乙土(挑战)｜叠加:甲日落乙7宫"
 */
export function compactSynastrySignals(signals: any): string {
  if (!signals) return '无合盘数据';

  const parts: string[] = [];

  // 主要相位（最多5个）
  const aspects = signals.aspects || signals.相位 || signals.interAspects || [];
  if (aspects.length > 0) {
    const aspectStrs = aspects.slice(0, 5).map((a: any) => {
      const p1 = getPlanetShort(a.planetA || a.甲方行星 || a.from || '');
      const p2 = getPlanetShort(a.planetB || a.乙方行星 || a.to || '');
      const asp = getAspectSymbol(a.aspect || a.相位 || a.type || '');
      const nature = a.nature || a.性质 || '';
      return `甲${p1}${asp}乙${p2}${nature ? '(' + nature + ')' : ''}`;
    });
    parts.push(aspectStrs.join('｜'));
  }

  // 宫位叠加（最多3个）
  const overlays = signals.houseOverlays || signals.宫位叠加 || [];
  if (overlays.length > 0) {
    const overlayStrs = overlays.slice(0, 3).map((o: any) => {
      const planet = getPlanetShort(o.planet || o.行星 || '');
      const house = o.house || o.宫位 || '';
      const whose = o.whose || o.谁的 || '';
      return `${whose === 'A' ? '甲' : '乙'}${planet}落${whose === 'A' ? '乙' : '甲'}${house}宫`;
    });
    parts.push(`叠加:${overlayStrs.join(',')}`);
  }

  return parts.join('｜') || JSON.stringify(signals);
}

/**
 * 压缩 CBT 情绪记录
 *
 * @example
 * 输出: "情境:和同事吵架｜情绪:愤怒80,委屈60｜热点想法:他根本不尊重我"
 */
export function compactCBTRecord(record: any): string {
  if (!record) return '无情绪记录';

  const parts: string[] = [];

  // 情境
  if (record.situation || record.情境) {
    const situation = (record.situation || record.情境).slice(0, 30);
    parts.push(`情境:${situation}`);
  }

  // 情绪
  const moods = record.moods || record.情绪 || [];
  if (moods.length > 0) {
    const moodStrs = moods.slice(0, 3).map((m: any) => {
      if (typeof m === 'string') return m;
      return `${m.name || m.名称}${m.intensity || m.强度 || ''}`;
    });
    parts.push(`情绪:${moodStrs.join(',')}`);
  }

  // 热点想法
  if (record.hotThought || record.热点想法) {
    const hot = (record.hotThought || record.热点想法).slice(0, 40);
    parts.push(`热点想法:${hot}`);
  }

  return parts.join('｜') || JSON.stringify(record);
}

/**
 * 智能压缩函数
 *
 * 根据数据类型自动选择压缩方法
 */
export function compactData(data: any, type: 'chart' | 'transit' | 'synastry' | 'cbt'): string {
  switch (type) {
    case 'chart':
      return compactChartSummary(data);
    case 'transit':
      return compactTransitSummary(data);
    case 'synastry':
      return compactSynastrySignals(data);
    case 'cbt':
      return compactCBTRecord(data);
    default:
      return JSON.stringify(data);
  }
}

/**
 * 生肖与星座桥接
 *
 * 提供生肖与星座的趣味对比，仅作为补充视角
 */

/** 十二生肖 */
export type ChineseZodiac = '鼠' | '牛' | '虎' | '兔' | '龙' | '蛇' | '马' | '羊' | '猴' | '鸡' | '狗' | '猪';

/** 生肖特质 */
const ZODIAC_TRAITS: Record<ChineseZodiac, { keywords: string[]; funFact: string }> = {
  '鼠': { keywords: ['机灵', '善交际', '精打细算'], funFact: '属鼠的人天生嗅觉灵敏，总能第一时间发现机会' },
  '牛': { keywords: ['踏实', '倔强', '有耐心'], funFact: '属牛的人一旦认定目标，十头牛都拉不回来' },
  '虎': { keywords: ['有魄力', '爱冒险', '自信'], funFact: '属虎的人天生自带气场，走到哪都很难被忽视' },
  '兔': { keywords: ['温和', '敏感', '有品味'], funFact: '属兔的人看起来人畜无害，其实内心戏很多' },
  '龙': { keywords: ['有野心', '自我', '运气好'], funFact: '属龙在中国文化里自带主角光环' },
  '蛇': { keywords: ['深沉', '有谋略', '直觉强'], funFact: '属蛇的人喜欢在暗处观察，关键时刻一击致命' },
  '马': { keywords: ['自由', '热情', '闲不住'], funFact: '属马的人最怕被束缚，一成不变的生活会让他们窒息' },
  '羊': { keywords: ['温柔', '有艺术感', '依赖感强'], funFact: '属羊的人内心敏感，一句无心的话可能记很久' },
  '猴': { keywords: ['聪明', '灵活', '不安分'], funFact: '属猴的人总能想到别人想不到的解决办法' },
  '鸡': { keywords: ['完美主义', '勤快', '爱表现'], funFact: '属鸡的人对细节的执着程度可能让周围人抓狂' },
  '狗': { keywords: ['忠诚', '正义感', '容易焦虑'], funFact: '属狗的人是最靠谱的朋友，但也最容易替别人操心' },
  '猪': { keywords: ['随和', '享受生活', '大方'], funFact: '属猪的人看起来佛系，其实该拼的时候一点不含糊' },
};

/**
 * 根据出生年份获取生肖
 */
export function getChineseZodiac(year: number): ChineseZodiac {
  const zodiacList: ChineseZodiac[] = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  // 1900 年是鼠年
  const index = (year - 1900) % 12;
  return zodiacList[index >= 0 ? index : index + 12];
}

/**
 * 获取生肖+星座的趣味桥接描述
 *
 * @param year 出生年份
 * @param sunSign 太阳星座（英文小写）
 * @returns 趣味描述
 */
export function getZodiacBridge(year: number, sunSign: string): string {
  const zodiac = getChineseZodiac(year);
  const traits = ZODIAC_TRAITS[zodiac];
  if (!traits) return '';

  const SIGN_CN: Record<string, string> = {
    aries: '白羊座', taurus: '金牛座', gemini: '双子座', cancer: '巨蟹座',
    leo: '狮子座', virgo: '处女座', libra: '天秤座', scorpio: '天蝎座',
    sagittarius: '射手座', capricorn: '摩羯座', aquarius: '水瓶座', pisces: '双鱼座',
  };

  const signName = SIGN_CN[sunSign.toLowerCase()] || sunSign;
  return `你是${signName}的${zodiac}，${traits.funFact}`;
}

/**
 * 获取紧凑的生肖信息（用于注入 prompt）
 */
export function getCompactZodiacInfo(year: number): string {
  const zodiac = getChineseZodiac(year);
  const traits = ZODIAC_TRAITS[zodiac];
  if (!traits) return '';
  return `生肖${zodiac}（${traits.keywords.join('/')}）`;
}

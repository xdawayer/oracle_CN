/**
 * 二十四节气语境
 *
 * 为 daily 等模块提供节气氛围和建议
 * 使用固定日期映射（简化版），不依赖外部库
 */

interface JieqiInfo {
  name: string;
  month: number;
  dayApprox: number;  // 大约日期
  implication: string;  // 占星/心理学意义
  advice: string;  // 行动建议
}

/** 二十四节气数据 */
export const JIEQI_DATA: JieqiInfo[] = [
  { name: '立春', month: 2, dayApprox: 4, implication: '万物萌发之际，适合开启新计划', advice: '顺势而为，播下种子' },
  { name: '雨水', month: 2, dayApprox: 19, implication: '滋润万物的时期，适合滋养关系', advice: '关注情感连接，柔软一点' },
  { name: '惊蛰', month: 3, dayApprox: 6, implication: '沉睡的能量被唤醒，适合突破', advice: '打破舒适区，尝试新事物' },
  { name: '春分', month: 3, dayApprox: 21, implication: '阴阳平衡之日，适合内省和调整', advice: '检视生活平衡，做必要调整' },
  { name: '清明', month: 4, dayApprox: 5, implication: '天清地明，适合清理和放下', advice: '断舍离，给内心腾出空间' },
  { name: '谷雨', month: 4, dayApprox: 20, implication: '雨生百谷，耕耘期', advice: '踏实做事，为下半年积累' },
  { name: '立夏', month: 5, dayApprox: 6, implication: '万物繁茂，能量外放', advice: '大胆表达，展示自己' },
  { name: '小满', month: 5, dayApprox: 21, implication: '小有所成，但还未圆满', advice: '享受过程，不急于求成' },
  { name: '芒种', month: 6, dayApprox: 6, implication: '忙碌收种的时期', advice: '抓紧行动，该做的别拖' },
  { name: '夏至', month: 6, dayApprox: 21, implication: '阳气最盛，但物极必反', advice: '在高点保持清醒，注意休息' },
  { name: '小暑', month: 7, dayApprox: 7, implication: '暑热渐盛，注意情绪', advice: '给自己降降温，别冲动' },
  { name: '大暑', month: 7, dayApprox: 23, implication: '最热的时候，也是磨练的时候', advice: '耐住性子，坚持就是胜利' },
  { name: '立秋', month: 8, dayApprox: 7, implication: '收获的序幕，适合回顾和规划', advice: '盘点上半年成果，调整方向' },
  { name: '处暑', month: 8, dayApprox: 23, implication: '暑气渐消，适合沉淀', advice: '放慢节奏，消化这段时间的经历' },
  { name: '白露', month: 9, dayApprox: 8, implication: '秋意渐浓，适合深度思考', advice: '安静下来，听听内心的声音' },
  { name: '秋分', month: 9, dayApprox: 23, implication: '再次平衡，收获与感恩', advice: '珍惜已有的，感谢帮助你的人' },
  { name: '寒露', month: 10, dayApprox: 8, implication: '深秋时节，适合收束和聚焦', advice: '减少不必要的社交，聚焦重要事项' },
  { name: '霜降', month: 10, dayApprox: 23, implication: '万物收藏前的准备期', advice: '做好年末规划，整理未完成的事' },
  { name: '立冬', month: 11, dayApprox: 7, implication: '进入蛰伏期，适合内修', advice: '养精蓄锐，为明年做准备' },
  { name: '小雪', month: 11, dayApprox: 22, implication: '内敛的时期，适合学习和积累', advice: '读书充电，提升自己' },
  { name: '大雪', month: 12, dayApprox: 7, implication: '深度蛰伏，适合深层疗愈', advice: '处理过去的情绪，和自己和解' },
  { name: '冬至', month: 12, dayApprox: 22, implication: '阴极阳生，转折点', advice: '黑暗中孕育新的开始，保持信心' },
  { name: '小寒', month: 1, dayApprox: 6, implication: '最冷的时期之一，蓄势待发', advice: '稳住，冬天总会过去' },
  { name: '大寒', month: 1, dayApprox: 20, implication: '天地收藏之际，适合内省复盘', advice: '回顾这一年，想清楚接下来要走的路' },
];

/**
 * 获取当前节气语境
 *
 * @param date 日期
 * @returns 节气语境描述，如果不在节气附近（+-3天）则返回空字符串
 */
export function getSeasonalContext(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 找到最近的节气
  let closest: JieqiInfo | null = null;
  let minDist = Infinity;

  for (const jieqi of JIEQI_DATA) {
    // 简化的距离计算（同月）
    if (jieqi.month === month) {
      const dist = Math.abs(day - jieqi.dayApprox);
      if (dist < minDist) {
        minDist = dist;
        closest = jieqi;
      }
    }
    // 跨月检查（如月底接近下月节气）
    if (jieqi.month === month + 1 && jieqi.dayApprox <= 7 && day >= 28) {
      const dist = (30 - day) + jieqi.dayApprox;
      if (dist < minDist) {
        minDist = dist;
        closest = jieqi;
      }
    }
    if (jieqi.month === month - 1 && jieqi.dayApprox >= 20 && day <= 3) {
      const dist = day + (30 - jieqi.dayApprox);
      if (dist < minDist) {
        minDist = dist;
        closest = jieqi;
      }
    }
    // 处理 12月->1月跨年
    if (month === 1 && jieqi.month === 12 && jieqi.dayApprox >= 20 && day <= 3) {
      const dist = day + (31 - jieqi.dayApprox);
      if (dist < minDist) {
        minDist = dist;
        closest = jieqi;
      }
    }
    if (month === 12 && jieqi.month === 1 && jieqi.dayApprox <= 7 && day >= 28) {
      const dist = (31 - day) + jieqi.dayApprox;
      if (dist < minDist) {
        minDist = dist;
        closest = jieqi;
      }
    }
  }

  // 仅在+-3天内返回节气语境
  if (!closest || minDist > 3) return '';

  const proximity = minDist === 0 ? '今日' : minDist <= 1 ? '临近' : '将近';
  return `节气：${proximity}${closest.name}。${closest.implication}。建议：${closest.advice}`;
}

/**
 * 获取当前季节的总体氛围
 *
 * @param date 日期
 * @returns 季节氛围描述
 */
export function getSeasonalMood(date: Date = new Date()): string {
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 5) return '春季：生发之气，适合开启和尝试';
  if (month >= 6 && month <= 8) return '夏季：阳气外放，适合表达和行动';
  if (month >= 9 && month <= 11) return '秋季：收获沉淀，适合整理和感恩';
  return '冬季：蛰伏内修，适合反思和规划';
}

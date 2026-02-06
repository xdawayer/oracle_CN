// INPUT: 图谱绘制工具函数（几何计算、行星防重叠、相位分层）
// OUTPUT: 导出图谱绘制所需的工具函数
// POS: 小程序图谱绘制工具库

import { SIGN_NAMES, MAJOR_PLANETS, ASPECT_ANGLES, ASPECT_ORDER } from '../../constants/chart-config.js';

// 外环前缀正则
const OUTER_PREFIX_RE = /^(T-|B-)/;

/**
 * 去除外环前缀（T- 或 B-）
 */
export function stripOuterPrefix(name) {
  return name.replace(OUTER_PREFIX_RE, '');
}

/**
 * 获取绝对角度（0-360度）
 * @param {string} sign - 星座名称
 * @param {number} degree - 度数
 * @param {number} minute - 分钟
 * @returns {number} 绝对角度
 */
export function getAbsoluteAngle(sign, degree, minute = 0) {
  const signIndex = SIGN_NAMES.indexOf(sign);
  if (signIndex < 0) {
    console.warn(`[getAbsoluteAngle] Unknown sign: "${sign}", returning 0`);
    return (Number(degree) || 0) + (Number(minute) || 0) / 60;
  }
  return (signIndex * 30) + (Number(degree) || 0) + (Number(minute) || 0) / 60;
}

/**
 * 获取坐标点
 * @param {number} angleDeg - 角度（度）
 * @param {number} radius - 半径
 * @param {number} cx - 中心X坐标
 * @param {number} cy - 中心Y坐标
 * @returns {{x: number, y: number}} 坐标点
 */
export function getCoords(angleDeg, radius, cx = 200, cy = 200) {
  const rad = angleDeg * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

/**
 * 计算两个角度之间的最小差值（考虑360度循环）
 */
export function angleDiff(a, b) {
  let diff = ((b - a + 180) % 360) - 180;
  return diff < -180 ? diff + 360 : diff;
}

/**
 * 规范化角度到 0-360 范围
 */
export function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

/**
 * 行星防重叠算法：角度偏移方案
 * 检测度数接近的行星簇，将它们均匀分布开
 * @param {Array} planets - 行星数组，每个行星需要有 absAngle 和 visualAngle 属性
 * @param {number} minSpacing - 最小间距（度）
 * @returns {Array} 调整后的行星数组
 */
export function spreadPlanets(planets, minSpacing = 8) {
  if (planets.length <= 1) return planets;

  // 最大偏移限制：不超过 minSpacing 的 1.5 倍
  const maxOffset = minSpacing * 1.5;

  // 复制并按角度排序
  const sorted = planets.map(p => ({ ...p }));
  sorted.sort((a, b) => a.absAngle - b.absAngle);

  // 检测并展开簇
  let iterations = 0;
  const maxIterations = 30; // 防止无限循环
  let hasOverlap = true;

  while (hasOverlap && iterations < maxIterations) {
    hasOverlap = false;
    iterations++;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[(i + 1) % sorted.length];

      // 计算当前视觉角度差
      let diff = angleDiff(current.visualAngle, next.visualAngle);
      if (i === sorted.length - 1) {
        // 最后一个和第一个之间需要考虑 360 度循环
        diff = 360 + diff;
        if (diff > 360) diff -= 360;
      }

      if (Math.abs(diff) < minSpacing && Math.abs(diff) > 0) {
        hasOverlap = true;
        // 将两个行星向相反方向推开，但限制推开量
        const pushAmount = Math.min((minSpacing - Math.abs(diff)) / 2 + 0.3, 2);

        // 检查是否超过最大偏移限制
        const currentOffset = Math.abs(angleDiff(current.absAngle, current.visualAngle));
        const nextOffset = Math.abs(angleDiff(next.absAngle, next.visualAngle));

        if (currentOffset + pushAmount <= maxOffset) {
          current.visualAngle = normalizeAngle(current.visualAngle - pushAmount);
        }
        if (nextOffset + pushAmount <= maxOffset) {
          next.visualAngle = normalizeAngle(next.visualAngle + pushAmount);
        }
      }
    }

    // 重新排序以处理可能的顺序变化
    sorted.sort((a, b) => a.visualAngle - b.visualAngle);
  }

  // 创建原始顺序的映射
  const result = [];
  for (const original of planets) {
    const spread = sorted.find(s => s.absAngle === original.absAngle);
    if (spread) {
      result.push({ ...original, visualAngle: spread.visualAngle });
    } else {
      result.push({ ...original });
    }
  }

  return result;
}

/**
 * 根据配置过滤行星
 * @param {Array} planets - 行星数组
 * @param {Object} config - 配置对象
 * @param {Object} options - 选项
 * @returns {Array} 过滤后的行星数组
 */
export function filterPlanets(planets, config, options = {}) {
  const { celestialBodies } = config;
  const { includeAllAngles = false } = options;

  return planets.filter(p => {
    // 提取基础名称（去掉外环前缀）
    const baseName = stripOuterPrefix(p.name);

    // 10大行星
    if (MAJOR_PLANETS.includes(baseName)) return celestialBodies.planets;

    // 仅显示 ASC 和 MC（IC/Desc 用于相位计算）
    if (['Ascendant', 'Rising', 'Midheaven', 'MC'].includes(baseName)) return celestialBodies.angles;
    if (['Descendant', 'IC'].includes(baseName)) return celestialBodies.angles && includeAllAngles;

    // 仅显示北交点
    if (baseName === 'North Node') return celestialBodies.nodes;

    // 默认隐藏
    if (baseName === 'Chiron') return celestialBodies.chiron;
    if (baseName === 'Lilith') return celestialBodies.lilith;
    if (['Juno', 'Vesta', 'Ceres', 'Pallas'].includes(baseName)) return celestialBodies.asteroids;

    return false; // 隐藏其他未明确列出的天体
  });
}

/**
 * 根据配置过滤相位
 * @param {Array} aspects - 相位数组
 * @param {Object} aspectConfig - 相位配置
 * @returns {Array} 过滤后的相位数组
 */
export function filterAspects(aspects, aspectConfig) {
  return aspects.filter(a => {
    const setting = aspectConfig[a.type];
    if (!setting || !setting.enabled) return false;
    return Math.abs(a.orb) <= setting.orb;
  });
}

/**
 * 从角度计算相位
 * @param {Array} positions - 行星位置数组
 * @param {Object} aspectConfig - 相位配置
 * @returns {Array} 相位数组
 */
export function calculateAspectsFromAngles(positions, aspectConfig) {
  const aspects = [];

  const getAngle = (pos) => normalizeAngle(pos.absAngle ?? getAbsoluteAngle(pos.sign, pos.degree, pos.minute));

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];
      const p1Angle = getAngle(p1);
      const p2Angle = getAngle(p2);
      const diff = Math.abs(p1Angle - p2Angle);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const type of ASPECT_ORDER) {
        const setting = aspectConfig[type];
        if (!setting?.enabled) continue;
        const aspectAngle = ASPECT_ANGLES[type];
        if (Math.abs(angle - aspectAngle) <= setting.orb) {
          aspects.push({
            planet1: p1.name,
            planet2: p2.name,
            type,
            orb: Math.round(Math.abs(angle - aspectAngle) * 100) / 100,
            isApplying: false,
          });
          break;
        }
      }
    }
  }

  return aspects;
}

/**
 * 计算跨盘相位（内环和外环之间）
 * @param {Array} innerPositions - 内环行星位置
 * @param {Array} outerPositions - 外环行星位置
 * @param {Object} aspectConfig - 相位配置
 * @returns {Array} 跨盘相位数组
 */
export function calculateCrossAspectsFromAngles(innerPositions, outerPositions, aspectConfig) {
  const aspects = [];
  if (innerPositions.length === 0 || outerPositions.length === 0) return aspects;

  const getAngle = (pos) => normalizeAngle(pos.absAngle ?? getAbsoluteAngle(pos.sign, pos.degree, pos.minute));

  for (let i = 0; i < innerPositions.length; i++) {
    for (let j = 0; j < outerPositions.length; j++) {
      const p1 = innerPositions[i];
      const p2 = outerPositions[j];
      const p1Angle = getAngle(p1);
      const p2Angle = getAngle(p2);
      const diff = Math.abs(p1Angle - p2Angle);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const type of ASPECT_ORDER) {
        const setting = aspectConfig[type];
        if (!setting?.enabled) continue;
        const aspectAngle = ASPECT_ANGLES[type];
        if (Math.abs(angle - aspectAngle) <= setting.orb) {
          aspects.push({
            planet1: p1.name,
            planet2: p2.name,
            type,
            orb: Math.round(Math.abs(angle - aspectAngle) * 100) / 100,
            isApplying: false,
          });
          break;
        }
      }
    }
  }

  return aspects;
}

/**
 * 确定相位层级（根据 orb 值）
 * @param {Object} aspect - 相位对象
 * @param {Object} config - 配置对象
 * @returns {string} 层级名称：'foreground' | 'midground' | 'background'
 */
export function getAspectLayer(aspect, config) {
  const { visualLayers } = config;
  const orb = Math.abs(aspect.orb);

  // 所有相位类型都根据 orb 值分层
  if (orb <= visualLayers.highlightThreshold) {
    return 'foreground';  // orb ≤ 2° = 前景（最亮）
  } else if (orb <= visualLayers.midgroundThreshold) {
    return 'midground';   // 2° < orb ≤ 4° = 中景
  }
  return 'background';    // orb > 4° = 背景
}

/**
 * 检查相位是否涉及发光体（太阳、月亮、上升）
 */
export function isLuminaryAspect(aspect) {
  const luminaries = ['Sun', 'Moon', 'Ascendant', 'Rising'];
  const p1 = stripOuterPrefix(aspect.planet1);
  const p2 = stripOuterPrefix(aspect.planet2);
  return luminaries.includes(p1) || luminaries.includes(p2);
}

/**
 * 检查相位是否仅在外行星之间
 */
export function isOuterPlanetOnlyAspect(aspect) {
  const outerPlanets = ['Uranus', 'Neptune', 'Pluto'];
  const p1 = stripOuterPrefix(aspect.planet1);
  const p2 = stripOuterPrefix(aspect.planet2);
  return outerPlanets.includes(p1) && outerPlanets.includes(p2);
}

/**
 * 检查相位是否涉及北交点
 */
export function isNorthNodeAspect(aspect) {
  const p1 = stripOuterPrefix(aspect.planet1);
  const p2 = stripOuterPrefix(aspect.planet2);
  return p1 === 'North Node' || p2 === 'North Node';
}

/**
 * 合并相位数组（去重）
 */
export function mergeAspectsByKey(primary, secondary) {
  const map = new Map();
  const makeKey = (aspect) => {
    const [left, right] = [aspect.planet1, aspect.planet2].sort();
    return `${left}|${right}|${aspect.type}`;
  };
  primary.forEach((aspect) => map.set(makeKey(aspect), aspect));
  secondary.forEach((aspect) => {
    const key = makeKey(aspect);
    if (!map.has(key)) map.set(key, aspect);
  });
  return Array.from(map.values());
}

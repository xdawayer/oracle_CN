// INPUT: 星盘配置常量（相位类型、容许度、视觉层样式）
// OUTPUT: 导出星盘绘制所需的配置数据
// POS: 小程序星盘配置中心

// 主要行星列表（10大行星）
export const MAJOR_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

// 角点列表
export const CHART_ANGLES = ['Ascendant', 'Midheaven', 'IC', 'Descendant'];

// 次要天体（默认隐藏）
export const MINOR_BODIES = ['Chiron', 'North Node', 'South Node', 'Lilith', 'Juno', 'Vesta', 'Ceres', 'Pallas', 'Vertex', 'Fortune'];

// 相位颜色 - 与 oracle_CN/constants.ts 同步
export const ASPECT_COLORS = {
  conjunction: '#94A3B8',  // 中性灰（合相线在星盘中不绘制）
  opposition: '#8B5CF6',   // 紫色
  square: '#EF4444',       // 红色
  trine: '#22C55E',        // 绿色
  sextile: '#3B82F6',      // 蓝色
  quincunx: '#CBD5F5',     // 浅灰紫 (默认禁用)
  semisquare: '#CBD5F5',   // 浅灰紫 (默认禁用)
  sesquiquadrate: '#CBD5F5', // 浅灰紫 (默认禁用)
};

// 视觉层样式 - 相位线样式 - 与 oracle_CN/constants.ts 同步
export const VISUAL_LAYER_STYLES = {
  foreground: { strokeWidth: 1.0, opacity: 1.0 },    // 紧密相位 (orb <= 2°)
  midground: { strokeWidth: 0.8, opacity: 0.85 },    // 中等相位 (2° < orb <= 4°)
  background: { strokeWidth: 0.6, opacity: 0.65 },   // 宽松相位 (4° < orb <= 6°)
};

// 默认相位设置
const DEFAULT_ASPECT_SETTINGS = {
  conjunction: { enabled: true, orb: 8 },
  opposition: { enabled: true, orb: 7 },
  square: { enabled: true, orb: 6 },
  trine: { enabled: true, orb: 6 },
  sextile: { enabled: true, orb: 4 },
  quincunx: { enabled: false, orb: 3 },
  semisquare: { enabled: false, orb: 2 },
  sesquiquadrate: { enabled: false, orb: 2 },
};

// 本命盘配置
// 单人盘 orb: 合相6°, 六分3°, 四分5°, 三分5°, 对分5°
export const NATAL_CONFIG = {
  chartType: 'natal',
  celestialBodies: {
    planets: true,     // 10大行星
    angles: true,      // 仅 ASC/MC
    nodes: true,       // 仅北交点
    chiron: false,     // 凯龙星隐藏
    lilith: false,     // 莉莉丝隐藏
    asteroids: false,  // 小行星隐藏
  },
  aspects: {
    conjunction: { enabled: true, orb: 6 },
    opposition: { enabled: true, orb: 5 },
    square: { enabled: true, orb: 5 },
    trine: { enabled: true, orb: 5 },
    sextile: { enabled: true, orb: 3 },
    quincunx: { enabled: false, orb: 3 },
    semisquare: { enabled: false, orb: 2 },
    sesquiquadrate: { enabled: false, orb: 2 },
  },
  visualLayers: {
    highlightThreshold: 2,   // orb <= 2° = 前景
    midgroundThreshold: 4,   // orb <= 4° = 中景
    backgroundThreshold: 6,  // orb <= 6° = 背景
  },
};

// 组合盘配置
// 组合盘 orb 与本命盘相同
export const COMPOSITE_CONFIG = {
  chartType: 'composite',
  celestialBodies: {
    planets: true,
    angles: true,      // 中点 AC/MC
    nodes: false,
    chiron: false,
    lilith: false,
    asteroids: false,
  },
  aspects: {
    conjunction: { enabled: true, orb: 6 },
    opposition: { enabled: true, orb: 5 },
    square: { enabled: true, orb: 5 },
    trine: { enabled: true, orb: 5 },
    sextile: { enabled: true, orb: 3 },
    quincunx: { enabled: false, orb: 3 },
    semisquare: { enabled: false, orb: 2 },
    sesquiquadrate: { enabled: false, orb: 2 },
  },
  visualLayers: {
    highlightThreshold: 2,
    midgroundThreshold: 4,
    backgroundThreshold: 6,
  },
};

// 对比盘配置（双轮盘：A在内，B在外）
// 对比盘 orb 与行运盘一致: 合相3°, 六分2°, 四分3°, 三分3°, 对分3°
export const SYNASTRY_CONFIG = {
  chartType: 'synastry',
  inner: { ...NATAL_CONFIG, chartType: 'natal' },
  outer: {
    celestialBodies: {
      planets: true,
      angles: true,
      nodes: true,
      chiron: false,
      lilith: false,
      asteroids: false,
    },
  },
  crossAspects: {
    conjunction: { enabled: true, orb: 3 },
    opposition: { enabled: true, orb: 3 },
    square: { enabled: true, orb: 3 },
    trine: { enabled: true, orb: 3 },
    sextile: { enabled: true, orb: 2 },
  },
};

// 行运盘配置（双轮盘：本命在内，行运在外）
// 行运盘 orb: 合相3°, 六分2°, 四分3°, 三分3°, 对分3°
export const TRANSIT_CONFIG = {
  chartType: 'transit',
  inner: { ...NATAL_CONFIG, chartType: 'natal' },
  outer: {
    celestialBodies: {
      planets: true,
      angles: false,   // 行运盘外环不显示角点
      nodes: true,
      chiron: false,
      lilith: false,
      asteroids: false,
    },
  },
  crossAspects: {
    conjunction: { enabled: true, orb: 3 },
    opposition: { enabled: true, orb: 3 },
    square: { enabled: true, orb: 3 },
    trine: { enabled: true, orb: 3 },
    sextile: { enabled: true, orb: 2 },
  },
};

// 行星元数据（符号和颜色）
// 颜色规则参考专业星盘：红色=发光体/火星，蓝色=内行星，绿色=外行星
export const PLANET_META = {
  'Sun': { glyph: '☉', color: '#8B0000' },      // 深红 - 发光体
  'Moon': { glyph: '☽', color: '#0000CD' },     // 深蓝 - 发光体
  'Mercury': { glyph: '☿', color: '#0000CD' },  // 深蓝 - 内行星
  'Venus': { glyph: '♀', color: '#0000CD' },    // 深蓝 - 内行星
  'Mars': { glyph: '♂', color: '#8B0000' },     // 深红 - 个人行星
  'Jupiter': { glyph: '♃', color: '#006400' },  // 深绿 - 社会行星
  'Saturn': { glyph: '♄', color: '#006400' },   // 深绿 - 社会行星
  'Uranus': { glyph: '♅', color: '#006400' },   // 深绿 - 外行星
  'Neptune': { glyph: '♆', color: '#006400' },  // 深绿 - 外行星
  'Pluto': { glyph: '♇', color: '#006400' },    // 深绿 - 外行星
  'Chiron': { glyph: '⚷', color: '#006400' },   // 深绿 - 小行星
  'North Node': { glyph: '☊', color: '#006400' }, // 深绿 - 交点
  'South Node': { glyph: '☋', color: '#006400' }, // 深绿 - 交点
  'Lilith': { glyph: '⚸', color: '#8B0000' },   // 深红 - 虚点
  'Juno': { glyph: '⚵', color: '#006400' },     // 深绿 - 小行星
  'Vesta': { glyph: '⚶', color: '#006400' },    // 深绿 - 小行星
  'Ceres': { glyph: '⚳', color: '#006400' },    // 深绿 - 小行星
  'Pallas': { glyph: '⚴', color: '#006400' },   // 深绿 - 小行星
  'Vertex': { glyph: 'Vx', color: '#006400' },  // 深绿 - 虚点
  'Fortune': { glyph: '⊗', color: '#006400' },  // 深绿 - 虚点
  'Ascendant': { glyph: 'Asc', color: '#000000' }, // 黑色 - 轴点
  'Rising': { glyph: 'Asc', color: '#000000' },    // 黑色 - 轴点
  'Midheaven': { glyph: 'MC', color: '#000000' },  // 黑色 - 轴点
  'MC': { glyph: 'MC', color: '#000000' },         // 黑色 - 轴点
  'Descendant': { glyph: 'Dsc', color: '#000000' }, // 黑色 - 轴点
  'IC': { glyph: 'IC', color: '#000000' },         // 黑色 - 轴点
};

// 行星 SVG 路径数据 (24x24 viewBox)
export const PLANET_SVG_PATHS = {
  'Sun': 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-2a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  'Moon': 'M12 3c.132 0 .263 0 .393.01a7.5 7.5 0 0 0 0 14.98A8 8 0 1 1 12 3z',
  'Mercury': 'M12 2a1 1 0 0 1 1 1v2.05A5.002 5.002 0 0 1 12 15a5.002 5.002 0 0 1-1-9.95V3a1 1 0 0 1 1-1zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-4 12a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h8zm-3-2a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z',
  'Venus': 'M12 2a6 6 0 0 1 1 11.91V16h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H9a1 1 0 1 1 0-2h2v-2.09A6.002 6.002 0 0 1 12 2zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  'Mars': 'M14 2h6v6h-2V5.414l-4.293 4.293a6 6 0 1 1-1.414-1.414L16.586 4H14V2zM9 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  'Jupiter': 'M4 6h7v2H6.5L11 12l-4.5 4H11v2H4v-2h3.5L4 12l3.5-4H4V6zm16 0v2h-4v4h4v2h-4v4h-2V6h6z',
  'Saturn': 'M5 3h6v2H8.236l3.528 4.704A5 5 0 1 1 7.05 15H5v-2h2.05a3 3 0 1 0 3.186-4.24L6.236 5H5V3zm14 0v18h-2V3h2z',
  'Uranus': 'M11 2v4H9V2h2zm4 0v4h-2V2h2zm-3 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  'Neptune': 'M12 2v3l3-2v3l-3-1v4.1A5.002 5.002 0 0 1 12 19a5.002 5.002 0 0 1 0-9.9V5L9 6V3l3 2V2h0zm0 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'Pluto': 'M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V22h-2v-5H10v5H8v-7.26A7 7 0 0 1 12 2zm0 2a5 5 0 0 0-2 9.58V17h4v-3.42A5 5 0 0 0 12 4zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  'Chiron': 'M12 2a8 8 0 0 1 8 8v1h-2v-1a6 6 0 0 0-12 0v1H4v-1a8 8 0 0 1 8-8zm0 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-1 8v4h2v-4h-2z',
  'North Node': 'M12 4a4 4 0 0 1 4 4v8a4 4 0 0 1-8 0V8a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v2h4V8a2 2 0 0 0-2-2zM6 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  'South Node': 'M12 4a4 4 0 0 0-4 4v8a4 4 0 0 0 8 0V8a4 4 0 0 0-4-4zm0 10a2 2 0 0 1-2-2v-2h4v2a2 2 0 1-2 2zM6 12a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm12 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  'Lilith': 'M12 2a7 7 0 0 1 7 7c0 1.5-.47 2.89-1.27 4.03l2.98 5.97-1.79.89-2.65-5.3A6.97 6.97 0 0 1 12 16a6.97 6.97 0 0 1-4.27-1.41l-2.65 5.3-1.79-.89 2.98-5.97A6.97 6.97 0 0 1 5 9a7 7 0 0 1 7-7zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  'Juno': 'M12 2l3 6h-2v4a4 4 0 0 1-8 0v-4H3l3-6 3 6h2L9 2h6zm0 10a2 2 0 1 0-4 0v6h4v-6z',
  'Vesta': 'M12 2l8 10-8 10-8-10 8-10zm0 4L8 12l4 6 4-6-4-6z',
  'Ceres': 'M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 3a5 5 0 0 1 5 5h-2a3 3 0 0 0-6 0H7a5 5 0 0 1 5-5z',
  'Pallas': 'M12 2l2 4h4l-3 4 2 5-5-2-5 2 2-5-3-4h4l2-4zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'Vertex': 'M12 2l4 8-4 8-4-8 4-8zm6 4l2 6-2 6V6zM6 6v12l-2-6 2-6z',
  'Fortune': 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-2 6h4v4h-4v-4z',
  'Ascendant': 'M4 12h16M12 4l4 8-4 8-4-8 4-8z',
  'Rising': 'M4 12h16M12 4l4 8-4 8-4-8 4-8z',
  'Midheaven': 'M12 2v8M8 6l4-4 4 4M4 14h16M4 18h16',
  'MC': 'M12 2v8M8 6l4-4 4 4M4 14h16M4 18h16',
  'Descendant': 'M4 12h16M12 4l4 8-4 8-4-8 4-8z',
  'IC': 'M12 2v8M8 6l4-4 4 4M4 14h16M4 18h16',
};

// 星座符号和颜色（按四元素分类）
export const SIGN_META = {
  // 火象星座 - 红色
  'Aries': { glyph: '羊', color: '#E74C3C' },
  'Leo': { glyph: '狮', color: '#E74C3C' },
  'Sagittarius': { glyph: '射', color: '#E74C3C' },

  // 土象星座 - 绿色
  'Taurus': { glyph: '牛', color: '#27AE60' },
  'Virgo': { glyph: '女', color: '#27AE60' },
  'Capricorn': { glyph: '摩', color: '#27AE60' },

  // 风象星座 - 蓝色
  'Gemini': { glyph: '双', color: '#3498DB' },
  'Libra': { glyph: '秤', color: '#3498DB' },
  'Aquarius': { glyph: '瓶', color: '#3498DB' },

  // 水象星座 - 深红/紫色
  'Cancer': { glyph: '蟹', color: '#8E44AD' },
  'Scorpio': { glyph: '蝎', color: '#8E44AD' },
  'Pisces': { glyph: '鱼', color: '#8E44AD' },
};

// 星座 SVG 路径数据 (24x24 viewBox)
export const SIGN_SVG_PATHS = {
  'Aries': 'M5 20c0-8 3-14 7-14s7 6 7 14M12 6V2',
  'Taurus': 'M4 8c0-3.3 3.6-6 8-6s8 2.7 8 6c0 2.5-2 4.5-4.5 5.5C13 14.5 12 17 12 20v2M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'Gemini': 'M4 4h16M4 20h16M8 4v16M16 4v16',
  'Cancer': 'M12 12a5 5 0 1 0-5-5M12 12a5 5 0 1 0 5 5',
  'Leo': 'M6 16a4 4 0 1 0 0-8M6 12h8a4 4 0 0 1 4 4v4',
  'Virgo': 'M4 4v12a4 4 0 0 0 4 4M8 4v16M12 4v12a4 4 0 0 0 4 4h2M16 4v8M20 12v8',
  'Libra': 'M4 16h16M12 16V8M6 8h12M4 4h4M16 4h4',
  'Scorpio': 'M4 4v12a4 4 0 0 0 4 4M8 4v16M12 4v12a4 4 0 0 0 4 4M16 4v16l4-4',
  'Sagittarius': 'M4 20L20 4M20 4h-8M20 4v8M8 12l4 4',
  'Capricorn': 'M4 8v8a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8M16 8a4 4 0 1 1 0 8',
  'Aquarius': 'M4 8l4 4-4 4M8 8l4 4-4 4M12 8l4 4-4 4M16 8l4 4-4 4',
  'Pisces': 'M8 4v16M16 4v16M4 12h16',
};

// 星座名称列表
export const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// 相位角度
export const ASPECT_ANGLES = {
  conjunction: 0,
  opposition: 180,
  square: 90,
  trine: 120,
  sextile: 60,
};

// 相位顺序
export const ASPECT_ORDER = ['conjunction', 'opposition', 'square', 'trine', 'sextile'];

// 相位符号映射
export const ASPECT_SYMBOLS = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '✱',
};

// ============================================
// 几何布局常量（相对值，基于 baseRadius = Math.min(cx, cy)）
// ============================================

// 单盘布局参数
export const SINGLE_CHART_LAYOUT = {
  // 外层结构
  outerRim: 0.99,              // 最外圆边框
  zodiacBandWidth: 0.105,      // 星座环宽度
  zodiacInner: 0.885,          // 星座环内径

  // 行星位置信息区域
  planetRing: 0.80,
  positionInfo: 0.65,          // 位置信息中心

  // 宫位区域
  houseRing: 0.375,            // 宫位分隔线外径
  houseNumbers: 0.33,          // 宫位数字环（调整到圆环中央）

  // 相位线区域
  aspectLine: 0.285,           // 相位线半径
  innerHub: 0.125,             // 中心点

  // 字号配置（单位：px）
  fontSize: {
    planet: 13.2,              // 行星符号 (原14，放大 1.2x)
    degree: 11,                // 度数
    sign: 9,                   // 星座符号 (原12，缩小90%)
    minute: 9,                 // 角分
    retro: 8,                  // 逆行标记
    houseNum: 9,               // 宫位数字（缩小80%）
    cuspDegree: 9,             // 宫头度数
    cuspSign: 9,               // 宫头星座符号 (原13，缩小90%)
    cuspMinute: 7,             // 宫头分钟
  },

  // 间距配置（单位：px）
  spacing: {
    planetInfo: 18,            // 行星信息元素间距
    smallInfo: 12,             // 小元素间距
    cuspLabel: 12,             // 宫头标注偏移
  },
};

// 双盘布局参数
export const DUAL_CHART_LAYOUT = {
  // 外层结构（与单盘相同）
  outerRim: 0.99,
  zodiacBandWidth: 0.105,
  zodiacInner: 0.885,

  // 外环（行运/对比盘的外环）
  outerPlanetRing: 0.84,
  
  // 分隔线
  separator: 0.625,            // 内外环分隔线

  // 内环（本命盘）
  innerPlanetRing: 0.59,       // 内环行星符号

  // 宫位区域
  houseRing: 0.36,             // 宫位分隔线外径
  houseNumbers: 0.315,         // 宫位数字环（调整到圆环中央）

  // 相位线区域
  aspectLine: 0.27,            // 相位线半径
  innerHub: 0.125,             // 中心点

  // 字号配置（缩放 80%）
  fontSize: {
    planet: 9,                 // 行星符号 (原11，缩小80%)
    degree: 8,                 // 度数
    sign: 7,                   // 星座符号 (原9，缩小80%)
    minute: 6,                 // 角分
    retro: 5,                  // 逆行标记
    houseNum: 7,               // 宫位数字（缩小80%）
    cuspDegree: 8,             // 宫头度数
    cuspSign: 9,               // 宫头星座符号 (原11，缩小80%)
    cuspMinute: 6,             // 宫头分钟
  },

  // 间距配置（缩放 90%）
  spacing: {
    planetInfo: 11,            // 行星信息元素间距
    smallInfo: 8,              // 小元素间距
    cuspLabel: 10,             // 宫头标注偏移
  },
  outerSpacing: {
    planetInfo: 11,
    smallInfo: 8,
  },
};

// 行星中文名称映射
export const PLANET_NAMES_ZH = {
  'Sun': '太阳',
  'Moon': '月亮',
  'Mercury': '水星',
  'Venus': '金星',
  'Mars': '火星',
  'Jupiter': '木星',
  'Saturn': '土星',
  'Uranus': '天王星',
  'Neptune': '海王星',
  'Pluto': '冥王星',
  'Chiron': '凯龙星',
  'North Node': '北交点',
  'South Node': '南交点',
  'Lilith': '莉莉丝',
  'Ascendant': '上升点',
  'Rising': '上升点',
  'Midheaven': '天顶',
  'MC': '天顶',
  'Descendant': '下降点',
  'IC': '天底',
  'Orient': '东方点',
  'East Point': '东方点',
};

// 星座中文名称映射
export const SIGN_NAMES_ZH = {
  'Aries': '白羊座',
  'Taurus': '金牛座',
  'Gemini': '双子座',
  'Cancer': '巨蟹座',
  'Leo': '狮子座',
  'Virgo': '处女座',
  'Libra': '天秤座',
  'Scorpio': '天蝎座',
  'Sagittarius': '射手座',
  'Capricorn': '摩羯座',
  'Aquarius': '水瓶座',
  'Pisces': '双鱼座',
};

// 行星关键词（用于详情卡片）
export const PLANET_KEYWORDS = {
  'Sun': '自我、意志、生命力',
  'Moon': '情感、本能、安全感',
  'Mercury': '思维、沟通、学习',
  'Venus': '爱情、美感、价值观',
  'Mars': '行动、欲望、勇气',
  'Jupiter': '扩展、幸运、智慧',
  'Saturn': '责任、限制、成熟',
  'Uranus': '变革、独立、创新',
  'Neptune': '梦想、灵感、幻觉',
  'Pluto': '转化、权力、重生',
  'Chiron': '伤痛、疗愈、智慧',
  'North Node': '人生方向、成长目标',
  'Ascendant': '外在形象、第一印象',
  'Midheaven': '事业、社会地位',
};

// 星座守护星映射（用于宫主星计算）
export const SIGN_RULERS = {
  'Aries': 'Mars',
  'Taurus': 'Venus',
  'Gemini': 'Mercury',
  'Cancer': 'Moon',
  'Leo': 'Sun',
  'Virgo': 'Mercury',
  'Libra': 'Venus',
  'Scorpio': 'Pluto',
  'Sagittarius': 'Jupiter',
  'Capricorn': 'Saturn',
  'Aquarius': 'Uranus',
  'Pisces': 'Neptune',
};

// 根据盘型获取配置
export function getChartConfig(chartType) {
  switch (chartType) {
    case 'natal': return NATAL_CONFIG;
    case 'composite': return COMPOSITE_CONFIG;
    case 'synastry': return SYNASTRY_CONFIG;
    case 'transit': return TRANSIT_CONFIG;
    default: return NATAL_CONFIG;
  }
}

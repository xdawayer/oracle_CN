// INPUT: 星盘配置常量（相位类型、容许度、视觉层样式）
// OUTPUT: 导出星盘绘制所需的配置数据
// POS: 小程序星盘配置中心

// 主要行星列表（10大行星）
export const MAJOR_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

// 角点列表
export const CHART_ANGLES = ['Ascendant', 'Midheaven', 'IC', 'Descendant'];

// 次要天体（默认隐藏）
export const MINOR_BODIES = ['Chiron', 'North Node', 'South Node', 'Lilith', 'Juno', 'Vesta', 'Ceres', 'Pallas', 'Vertex', 'Fortune'];

// 相位颜色 - 使用项目规范语义色
export const ASPECT_COLORS = {
  conjunction: '#7A746B',  // 纸感深灰
  opposition: '#8B4513',   // 马鞍棕 (Danger/Red alternate)
  square: '#CD5C5C',       // 印度红
  trine: '#6B8E23',        // 橄榄绿 (Success)
  sextile: '#8B7355',      // 暖棕 (Info/Blue alternate)
  quincunx: '#D8D1C5',
  semisquare: '#D8D1C5',
  sesquiquadrate: '#D8D1C5',
};

// 视觉层样式 - 相位线样式 - 增加粗细以提升清晰度
export const VISUAL_LAYER_STYLES = {
  foreground: { strokeWidth: 1.8, opacity: 1.0 },    // 紧密相位 (orb <= 2°)
  midground: { strokeWidth: 1.2, opacity: 0.8 },     // 中等相位 (2° < orb <= 4°)
  background: { strokeWidth: 0.8, opacity: 0.5 },    // 宽松相位 (4° < orb <= 6°)
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
export const PLANET_META = {
  'Sun': { glyph: '☉', color: '#FF6B6B' },
  'Moon': { glyph: '☽', color: '#74B9FF' },
  'Mercury': { glyph: '☿', color: '#FFEAA7' },
  'Venus': { glyph: '♀', color: '#55EFC4' },
  'Mars': { glyph: '♂', color: '#FF85C1' },
  'Jupiter': { glyph: '♃', color: '#FF7675' },
  'Saturn': { glyph: '♄', color: '#DFE6E9' },
  'Uranus': { glyph: '♅', color: '#00CEC9' },
  'Neptune': { glyph: '♆', color: '#74B9FF' },
  'Pluto': { glyph: '♇', color: '#A29BFE' },
  'Chiron': { glyph: '⚷', color: '#E056FD' },
  'North Node': { glyph: '☊', color: '#E056FD' },
  'South Node': { glyph: '☋', color: '#E056FD' },
  'Lilith': { glyph: '⚸', color: '#FD79A8' },
  'Juno': { glyph: '⚵', color: '#FF85C1' },
  'Vesta': { glyph: '⚶', color: '#FDCB6E' },
  'Ceres': { glyph: '⚳', color: '#55EFC4' },
  'Pallas': { glyph: '⚴', color: '#00CEC9' },
  'Vertex': { glyph: 'Vx', color: '#DFE6E9' },
  'Fortune': { glyph: '⊗', color: '#FDCB6E' },
  'Ascendant': { glyph: 'Asc', color: '#FFFFFF' },
  'Rising': { glyph: 'Asc', color: '#FFFFFF' },
  'Midheaven': { glyph: 'MC', color: '#00CEC9' },
  'MC': { glyph: 'MC', color: '#00CEC9' },
  'Descendant': { glyph: 'Dsc', color: '#FFFFFF' },
  'IC': { glyph: 'IC', color: '#00CEC9' },
};

// 星座符号和颜色
export const SIGN_META = {
  'Aries': { glyph: '♈', color: '#FF6B6B' },
  'Taurus': { glyph: '♉', color: '#FFEAA7' },
  'Gemini': { glyph: '♊', color: '#00CEC9' },
  'Cancer': { glyph: '♋', color: '#74B9FF' },
  'Leo': { glyph: '♌', color: '#FF7675' },
  'Virgo': { glyph: '♍', color: '#FFEAA7' },
  'Libra': { glyph: '♎', color: '#00CEC9' },
  'Scorpio': { glyph: '♏', color: '#74B9FF' },
  'Sagittarius': { glyph: '♐', color: '#FF6B6B' },
  'Capricorn': { glyph: '♑', color: '#FFEAA7' },
  'Aquarius': { glyph: '♒', color: '#00CEC9' },
  'Pisces': { glyph: '♓', color: '#74B9FF' },
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

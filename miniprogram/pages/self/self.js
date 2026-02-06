const { request, requestStream } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');
const {
  MAJOR_PLANETS,
  PLANET_META,
  PLANET_NAMES_ZH,
  SIGN_META,
  SIGN_NAMES,
  SIGN_NAMES_ZH,
  SIGN_RULERS,
} = require('../../constants/chart-config');

const DEFAULT_PROFILE = {
  birthDate: '1989-10-31',
  birthTime: '22:00',
  birthCity: '中国, 湖南, 娄底',
  timezone: '8',
  lat: 27.7,
  lon: 112.0,
  accuracyLevel: 'city'
};

const PLANET_ICON_FILES = {
  Sun: 'sun',
  Moon: 'moon',
  Mercury: 'mercury',
  Venus: 'venus',
  Mars: 'mars',
  Jupiter: 'jupiter',
  Saturn: 'saturn',
  Uranus: 'uranus',
  Neptune: 'neptune',
  Pluto: 'pluto',
  'North Node': 'north node',
  'South Node': 'south node',
  'Chiron': 'chiron',
  'Ceres': 'ceres',
  'Pallas': 'pallas',
  'Juno': 'juno',
  'Vesta': 'vesta',
  'Lilith': 'lilith',
  'Fortune': 'fortune',
  'Vertex': 'vertex',
  'Orient': 'orient',
  'East Point': 'orient',
  Ascendant: 'ascendant',
  Midheaven: 'ascendant',
  Descendant: 'ascendant',
  IC: 'ascendant'
};

const ASTEROID_NAMES = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta', 'North Node', 'South Node', 'Lilith', 'Fortune', 'Vertex', 'Orient', 'East Point'];

const ELEMENT_MAP = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water'
};

const MODE_MAP = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable'
};

// 水墨风格配色
const CANVAS_COLORS = {
  grid: '#E8E4DC',
  text: '#6B6560',
  fill: 'rgba(60, 56, 50, 0.12)',
  stroke: '#3C3832',
};

const DIMENSION_LIST = [
  { key: 'emotion', label: '情绪模式' },
  { key: 'boundary', label: '人际边界' },
  { key: 'security', label: '安全感来源' },
  { key: 'expression', label: '表达方式' },
  { key: 'decision', label: '决策模式' },
  { key: 'stress', label: '压力应对' },
  { key: 'love_language', label: '爱的语言' },
  { key: 'money', label: '金钱观' },
  { key: 'growth', label: '成长课题' },
  { key: 'creativity', label: '创造力源泉' },
  { key: 'intimacy', label: '亲密关系模式' },
  { key: 'role', label: '社会角色' },
];

const DEEP_DOMAIN_LIST = [
  { id: 'career', title: '事业发展', desc: '职业DNA与赛道选择', icon: '/images/icons/career.svg', iconColor: 'var(--domain-career-fg)', iconBg: 'var(--domain-career-bg)' },
  { id: 'wealth', title: '财富金钱', desc: '财富体质与增长策略', icon: '/images/icons/career.svg', iconColor: 'var(--domain-wealth-fg)', iconBg: 'var(--domain-wealth-bg)' },
  { id: 'love', title: '爱情婚姻', desc: '恋爱模式与长期指南', icon: '/images/icons/love.svg', iconColor: 'var(--domain-love-fg)', iconBg: 'var(--domain-love-bg)' },
  { id: 'relations', title: '人际关系', desc: '社交人设与边界设定', icon: '/images/icons/relations.svg', iconColor: 'var(--domain-relations-fg)', iconBg: 'var(--domain-relations-bg)' },
  { id: 'health', title: '健康养生', desc: '体质档案与作息建议', icon: '/images/icons/health.svg', iconColor: 'var(--domain-health-fg)', iconBg: 'var(--domain-health-bg)' },
  { id: 'growth', title: '自我成长', desc: '灵魂剧本与成长路线', icon: '/images/icons/study.svg', iconColor: 'var(--domain-growth-fg)', iconBg: 'var(--domain-growth-bg)' },
];

const APPENDIX_LABELS = {
  elements: '元素矩阵',
  aspects: '相位矩阵',
  planets: '行星信息',
  asteroids: '小行星信息',
  rulers: '宫主星信息',
};

const DETAIL_SECTION_LABELS = {
  summary: '概览',
  overview: '概览',
  highlight: '亮点',
  highlights: '亮点',
  strength: '优势',
  strengths: '优势',
  challenge: '挑战',
  challenges: '挑战',
  advice: '建议',
  suggestions: '建议',
  actions: '行动建议',
  opportunities: '机会',
  warnings: '提醒',
  focus: '重点关注',
  theme: '主题',
  background: '背景',
  conclusion: '结论',
  analysis: '分析',
  keywords: '关键词',
  details: '详情',
  positions: '星体位置',
  aspects: '相位',
  planets: '行星',
  asteroids: '小行星',
  rulers: '宫主星',
  elements: '元素',
  // 元素详情
  element_distribution: '元素分布',
  dominant_element: '主导元素',
  weak_element: '薄弱元素',
  element_balance: '元素平衡',
  chinese_metaphor: '文化意象',
  name: '名称',
  interpretation: '解读',
  growth_tip: '成长建议',
  overall: '整体评估',
  life_pattern: '生活模式',
  title: '标题',
  explanation: '说明',
  count: '数量',
  percentage: '占比',
  // 行星详情
  sign: '星座',
  house: '宫位',
  degree: '度数',
  content: '内容',
  description: '描述',
  meaning: '含义',
  influence: '影响',
  // 相位详情
  aspect: '相位',
  orb: '容许度',
  type: '类型',
  // 维度详情
  dimension_key: '维度',
  pattern: '核心模式',
  root: '根源',
  when_triggered: '触发场景',
  what_helps: '缓解方法',
  shadow: '阴影面',
  practice: '练习',
  prompt_question: '反思问题',
  confidence: '置信度',
  steps: '步骤',
  // 深度解析
  domain_key: '领域',
  key_patterns: '核心模式',
  growth_path: '成长方向',
  direction: '方向',
  reflection_question: '反思问题',
  astro_basis: '分析依据',
  // 宫主星
  ruler: '宫主星',
  flies_to_house: '飞入宫位',
  flies_to_sign: '飞入星座',
  // Big3 详情
  sun: '太阳',
  moon: '月亮',
  rising: '上升',
  key_traits: '核心特质',
  life_scenario: '生活场景',
  // 通用
  fire: '火元素',
  earth: '土元素',
  air: '风元素',
  water: '水元素',
};

// 报告元数据（用于支付弹窗展示）
const REPORT_PAYMENT_META = {
  annual: {
    title: '2026 年度成长报告',
    subtitle: '专属年度深度解读',
    features: [
      { title: '年度总览', desc: '全年指数主题与能量走向' },
      { title: '六大领域', desc: '事业、感情、健康、社交、成长、财运' },
      { title: '季度详解', desc: '四季指数节奏与关键时间点' },
      { title: '成长建议', desc: '幸运元素与能量提升建议' },
    ],
    price: 500,
    note: '约 8000-10000 字深度解读，永久保存',
  },
  'natal-report': {
    title: '人格深度解读',
    subtitle: '专属全维度深度解析',
    features: [
      { title: '核心人格解读', desc: '太阳、月亮、上升的深层心理分析' },
      { title: '人生维度详解', desc: '事业、感情、健康等领域的心理指引' },
      { title: '行星相位解读', desc: '内在动力与潜在张力的深度剖析' },
      { title: '成长建议', desc: '基于分析的个性化发展方向' },
    ],
    price: 500,
    note: '约 5000-8000 字深度解读，永久保存',
  },
};

Page({
  data: {
    auditMode: false,
    planets: [],
    aspects: [],
    big3: [],
    lifeDomains: DEEP_DOMAIN_LIST,
    dimensionList: DIMENSION_LIST,
    isZoomed: false,
    showPayment: false,
    paymentLoading: false,
    paymentReportType: 'annual', // 'annual' | 'natal-report'
    paymentMeta: null, // 当前弹窗显示的报告元数据
    expandedSection: null,
    showDetailReport: false,
    detailReportData: null,
    detailContentCache: {},
    prefetchedContent: {}, // 从 /api/natal/full 预获取的 overview/coreThemes/dimension 内容
    statusBarHeight: 20,
    navTitle: 'Self',
    // 年度报告任务状态
    annualTaskStatus: 'none', // none | pending | processing | completed | failed
    annualTaskProgress: 0,
    annualTaskMessage: '',

    // 本命深度解读任务状态
    natalReportStatus: 'none', // none | pending | processing | completed | failed
    natalReportProgress: 0,
    natalReportMessage: '',

    chartSize: 300,
    fullChartSize: 400,
    radarSize: 420,

    chartPositions: [],
    chartAspects: [],
    chartHouseCusps: [],

    asteroids: [],
    houseRulers: [],
    
    // Planet Detail Popup Data
    selectedPlanet: null,
    detailCardX: 0,
    detailCardY: 0,
  },

  onPlanetDetail(e) {
    const detail = e.detail;
    // Use coordinates from event if available (for fixed positioning)
    // If clientX/Y are provided (absolute), use them.
    // Otherwise use x/y (relative/calculated).
    let x = detail.clientX || detail.x;
    let y = detail.clientY || detail.y;
    
    this.setData({
      selectedPlanet: detail,
      detailCardX: x,
      detailCardY: y
    });
  },

  closePlanetDetail() {
    this.setData({
      selectedPlanet: null
    }, () => {
      // 关闭行星详情后重新绘制雷达图
      setTimeout(() => this.drawRadarChart('radarChart', this.data.radarSize), 50);
    });
  },

  onLoad() {
    const app = getApp();
    this.setData({ auditMode: !!(app && app.globalData && app.globalData.auditMode) });
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth;
    const padding = 128 * (windowWidth / 750);
    const chartSize = Math.max(240, Math.floor(windowWidth - padding));

    this.setData({
      chartSize,
      fullChartSize: Math.floor(windowWidth * 0.9),
      statusBarHeight: sysInfo.statusBarHeight || 20
    });

    this.loadUserProfile();
    this.fetchNatalChart();
    this.checkAnnualReportAccess();
    this.checkNatalReportAccess();
  },

  onShow() {
    // 每次页面显示时检查报告权限（可能在其他页面购买了）
    this.checkAnnualReportAccess();
    this.checkNatalReportAccess();
  },

  /** 检查年度报告任务状态 */
  async checkAnnualReportAccess() {
    try {
      // 使用 user_profile 获取出生信息
      const userProfile = storage.get('user_profile');
      if (!userProfile || !userProfile.birthDate) return;

      // 转换为 API 期望的格式
      const birthData = {
        date: userProfile.birthDate,
        time: userProfile.birthTime || '12:00',
        city: userProfile.birthCity || '',
        lat: userProfile.lat,
        lon: userProfile.lon,
        timezone: userProfile.timezone || 'Asia/Shanghai',
        accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
      };

      const result = await request({
        url: '/api/annual-task/status',
        method: 'GET',
        data: { birth: JSON.stringify(birthData) },
      });

      if (result && result.exists) {
        this.setData({
          annualTaskStatus: result.status,
          annualTaskProgress: result.progress || 0,
          annualTaskMessage: result.message || '',
        });

        // 如果正在处理中，定时刷新状态
        if (result.status === 'processing') {
          this._startStatusPolling();
        }
      } else {
        this.setData({
          annualTaskStatus: 'none',
          annualTaskProgress: 0,
          annualTaskMessage: '',
        });
      }
    } catch (error) {
      console.log('Check annual task status:', error?.statusCode || error);
      this.setData({ annualTaskStatus: 'none' });
    }
  },

  /** 开始轮询任务状态（递归 setTimeout 防止异步堆叠） */
  _startStatusPolling() {
    if (this._statusPollTimer) {
      clearTimeout(this._statusPollTimer);
    }
    this._statusPolling = true;
    this._pollAnnualOnce();
  },

  async _pollAnnualOnce() {
    if (!this._statusPolling) return;

    await this.checkAnnualReportAccess();

    if (this.data.annualTaskStatus !== 'processing') {
      this._statusPolling = false;
      this._statusPollTimer = null;
      if (this.data.annualTaskStatus === 'completed') {
        wx.showToast({ title: '报告已生成完成', icon: 'success' });
      }
      return;
    }

    if (this._statusPolling) {
      this._statusPollTimer = setTimeout(() => this._pollAnnualOnce(), 5000);
    }
  },

  onUnload() {
    // 清理定时器
    this._statusPolling = false;
    if (this._statusPollTimer) {
      clearTimeout(this._statusPollTimer);
      this._statusPollTimer = null;
    }
    this._natalReportPolling = false;
    if (this._natalReportPollTimer) {
      clearTimeout(this._natalReportPollTimer);
      this._natalReportPollTimer = null;
    }
  },

  loadUserProfile() {
    const stored = storage.get('user_profile');
    this.userProfile = { ...DEFAULT_PROFILE, ...(stored || {}) };
  },

  buildNatalParams() {
    const profile = this.userProfile || DEFAULT_PROFILE;
    const params = [];
    params.push(`date=${encodeURIComponent(profile.birthDate || DEFAULT_PROFILE.birthDate)}`);
    params.push(`city=${encodeURIComponent(profile.birthCity || DEFAULT_PROFILE.birthCity)}`);
    params.push(`timezone=${encodeURIComponent(profile.timezone || DEFAULT_PROFILE.timezone)}`);
    params.push(`accuracy=${encodeURIComponent(profile.accuracyLevel || profile.accuracy || 'exact')}`);

    if (profile.birthTime) params.push(`time=${encodeURIComponent(profile.birthTime)}`);
    if (profile.lat !== undefined) params.push(`lat=${encodeURIComponent(profile.lat)}`);
    if (profile.lon !== undefined) params.push(`lon=${encodeURIComponent(profile.lon)}`);

    return params.join('&');
  },

  getPlanetSvgPath(name) {
    const file = PLANET_ICON_FILES[name];
    if (!file) return '';
    return `/images/astro-symbols/${file}.svg`;
  },

  normalizeAngle(angle) {
    const normalized = angle % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  },

  getSignByLongitude(longitude) {
    const idx = Math.floor(this.normalizeAngle(longitude) / 30);
    return SIGN_NAMES[idx] || 'Aries';
  },

  buildHouseRulers(positions, houseCusps) {
    if (!Array.isArray(houseCusps) || houseCusps.length !== 12) return [];
    return houseCusps.map((cusp, index) => {
      const signId = this.getSignByLongitude(cusp);
      const signMeta = SIGN_META[signId] || {};
      const rulerId = SIGN_RULERS[signId];
      const rulerMeta = PLANET_META[rulerId] || {};
      const rulerPos = positions.find(p => p.name === rulerId);
      
      const fliesToSignId = rulerPos ? rulerPos.sign : '';
      const fliesToSignMeta = fliesToSignId ? SIGN_META[fliesToSignId] : {};

      return {
        house: index + 1,
        signName: SIGN_NAMES_ZH[signId] || signId,
        signIcon: `/images/astro-symbols/${signId.toLowerCase()}.png`,
        signColor: signMeta.color || '#666',
        rulerName: PLANET_NAMES_ZH[rulerId] || rulerId,
        rulerId: rulerId,
        rulerColor: rulerMeta.color || '#666',
        rulerSvg: this.getPlanetSvgPath(rulerId),
        fliesToHouse: rulerPos?.house || '--',
        fliesToSignName: rulerPos ? (SIGN_NAMES_ZH[rulerPos.sign] || rulerPos.sign) : '--',
        fliesToSignIcon: `/images/astro-symbols/${(rulerPos?.sign || 'aries').toLowerCase()}.png`,
        fliesToSignColor: fliesToSignMeta.color || '#666'
      };
    });
  },

  buildElementMatrix(positions) {
    const elementMatrix = {
      fire: { cardinal: [], fixed: [], mutable: [] },
      earth: { cardinal: [], fixed: [], mutable: [] },
      air: { cardinal: [], fixed: [], mutable: [] },
      water: { cardinal: [], fixed: [], mutable: [] }
    };

    positions
      .filter(p => MAJOR_PLANETS.includes(p.name))
      .forEach(p => {
        const element = ELEMENT_MAP[p.sign];
        const mode = MODE_MAP[p.sign];
        if (!element || !mode) return;
        const meta = PLANET_META[p.name] || {};
        elementMatrix[element][mode].push({
          id: p.name,
          symbol: meta.glyph || '',
          color: meta.color || '#666'
        });
      });

    return elementMatrix;
  },

  buildAspectMatrix(aspects, positions) {
    const matrixPlanetNames = [...MAJOR_PLANETS, 'North Node', 'Ascendant', 'Midheaven'];
    const symbolMap = {
      conjunction: '☌',
      sextile: '✱',
      square: '□',
      trine: '△',
      opposition: '☍'
    };
    const colorMap = {
      conjunction: '#FF4D4F',
      sextile: '#40A9FF',
      square: '#FF4D4F',
      trine: '#52C41A',
      opposition: '#FF4D4F'
    };
    const aspectMatrix = [];
    const firstPlanet = positions.find(p => p.name === matrixPlanetNames[0]);

    const firstRow = [{ isEmpty: true }];
    firstRow.push({
      isHeader: true,
      symbol: PLANET_META[firstPlanet?.name || matrixPlanetNames[0]]?.glyph || '☉',
      type: 'top'
    });
    aspectMatrix.push(firstRow);

    for (let i = 1; i < matrixPlanetNames.length; i++) {
      const row = [];
      const nameA = matrixPlanetNames[i];
      const metaA = PLANET_META[nameA] || {};
      row.push({ isHeader: true, symbol: metaA.glyph || '', type: 'left' });

      for (let j = 0; j < i; j++) {
        const nameB = matrixPlanetNames[j];
        const aspect = (aspects || []).find(a =>
          (a.planet1 === nameA && a.planet2 === nameB) || (a.planet1 === nameB && a.planet2 === nameA)
        );
        row.push({
          isHeader: false,
          aspect: aspect ? {
            ...aspect,
            symbol: symbolMap[aspect.type] || '',
            color: colorMap[aspect.type] || '#ccc'
          } : null
        });
      }

      row.push({ isHeader: true, symbol: metaA.glyph || '', type: 'right' });
      aspectMatrix.push(row);
    }

    return aspectMatrix;
  },

  buildPlanetList(positions) {
    const planetOrder = [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
      'Ascendant', 'Descendant', 'Midheaven', 'IC'
    ];
    return planetOrder
      .map(name => {
        const p = positions.find(p => p.name === name);
        if (!p) return null;
        const meta = PLANET_META[name] || {};
        const deg = Math.floor(p.degree);
        const min = p.minute ?? Math.round((p.degree - deg) * 60);
        const isAngle = ['Ascendant', 'Descendant', 'Midheaven', 'IC'].includes(name);
        
        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: PLANET_NAMES_ZH[name] || name,
          symbol: isAngle ? (name === 'Midheaven' ? 'MC' : name === 'Descendant' ? 'Des' : name === 'Ascendant' ? 'Asc' : 'IC') : (meta.glyph || ''),
          isAngle: isAngle,
          signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
          svgPath: this.getPlanetSvgPath(name),
          sign: SIGN_NAMES_ZH[p.sign] || p.sign,
          house: p.house,
          color: meta.color || '#666',
          description: '',
          degree: `${deg}°${String(min).padStart(2, '0')}'`,
          isRetrograde: p.isRetrograde || false
        };
      })
      .filter(Boolean);
  },

  buildAsteroidList(positions) {
    return ASTEROID_NAMES
      .map(name => {
        const p = positions.find(p => p.name === name);
        if (!p) return null;
        const meta = PLANET_META[name] || {};
        const deg = Math.floor(p.degree);
        const min = p.minute ?? Math.round((p.degree - deg) * 60);
        const isSpecialPoint = ['North Node', 'South Node', 'Fortune', 'Vertex', 'Orient', 'East Point'].includes(name);

        return {
          id: p.name.toLowerCase().replace(/\s+/g, '-'),
          name: PLANET_NAMES_ZH[p.name] || p.name,
          symbol: isSpecialPoint ? (name === 'Orient' || name === 'East Point' ? 'Ep' : (meta.glyph || name.substring(0, 2))) : (meta.glyph || ''),
          isSpecialPoint: isSpecialPoint,
          signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
          svgPath: this.getPlanetSvgPath(p.name),
          sign: SIGN_NAMES_ZH[p.sign] || p.sign,
          house: p.house,
          color: meta.color || '#666',
          degree: `${deg}°${String(min).padStart(2, '0')}'`,
          isRetrograde: p.isRetrograde || false
        };
      })
      .filter(Boolean);
  },

  async fetchNatalChart() {
    wx.showLoading({ title: 'Loading...' });
    try {
      const query = this.buildNatalParams();
      const res = await request({ url: `${API_ENDPOINTS.NATAL_CHART}?${query}` });
      const chart = res?.chart;
      const positions = chart?.positions || [];
      const aspects = chart?.aspects || [];
      const houseCusps = chart?.houseCusps || chart?.house_cusps || [];

      const planets = this.buildPlanetList(positions);
      const big3 = [
        planets.find(p => p.id === 'sun'),
        planets.find(p => p.id === 'moon'),
        planets.find(p => p.id === 'ascendant')
      ].filter(Boolean);

      const elementMatrix = this.buildElementMatrix(positions);
      const aspectMatrix = this.buildAspectMatrix(aspects, positions);
      const asteroids = this.buildAsteroidList(positions);
      const houseRulers = this.buildHouseRulers(positions, houseCusps);

      this.setData({
        planets,
        aspects,
        big3,
        elementMatrix,
        aspectMatrix,
        asteroids,
        houseRulers,
        chartPositions: positions,
        chartAspects: aspects,
        chartHouseCusps: houseCusps
      }, () => {
        this.drawRadarChart('radarChart', this.data.radarSize);
        // 图谱渲染完成后，后台预取 AI 内容（不阻塞界面）
        this.fetchNatalFull();
      });
    } catch (err) {
      console.error('Fetch natal chart failed', err);
      wx.showToast({ title: '数据获取失败', icon: 'none' });
      this.setData({
        planets: [],
        aspects: [],
        big3: [],
        elementMatrix: {
          fire: { cardinal: [], fixed: [], mutable: [] },
          earth: { cardinal: [], fixed: [], mutable: [] },
          air: { cardinal: [], fixed: [], mutable: [] },
          water: { cardinal: [], fixed: [], mutable: [] }
        },
        aspectMatrix: [],
        asteroids: [],
        houseRulers: [],
        chartPositions: [],
        chartAspects: [],
        chartHouseCusps: []
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 调用 /api/natal/full 并行端点，预获取 overview/coreThemes/dimension 内容。
   * 如果用户缺少完整出生信息或请求失败，静默降级，不影响正常使用。
   */
  async fetchNatalFull() {
    const profile = this.userProfile || DEFAULT_PROFILE;
    // 需要完整出生信息才调用
    if (!profile.birthDate || !profile.birthTime) return;

    try {
      const query = this.buildNatalParams();
      const canChunked = wx.canIUse && wx.canIUse('request.object.enableChunked');

      if (!canChunked) {
        const res = await request({ url: `${API_ENDPOINTS.NATAL_FULL}?${query}`, timeout: 120000 });
        if (!res) return;

        const prefetched = {};
        const blockNames = ['overview', 'coreThemes', 'dimension'];
        for (const blockName of blockNames) {
          const block = res[blockName];
          if (block && block.content) {
            prefetched[blockName] = block.content;
          }
        }

        if (Object.keys(prefetched).length > 0) {
          this.setData({ prefetchedContent: prefetched });
          console.log('[natal/full] Prefetched blocks:', Object.keys(prefetched).join(', '));
        }
        return;
      }

      const prefetched = { ...(this.data.prefetchedContent || {}) };
      const moduleMap = {
        overview: 'overview',
        coreThemes: 'coreThemes',
        dimension: 'dimension'
      };

      await new Promise((resolve) => {
        this._natalStreamTask = requestStream({
          url: `${API_ENDPOINTS.NATAL_FULL_STREAM}?${query}`,
          method: 'GET',
          onModule: (evt) => {
            const blockName = moduleMap[evt.moduleId];
            if (!blockName || !evt.content) return;
            prefetched[blockName] = evt.content;
            this._cacheNatalFullBlock(blockName, evt.content);
            this.setData({ prefetchedContent: prefetched });
          },
          onDone: () => {
            if (Object.keys(prefetched).length > 0) {
              this.setData({ prefetchedContent: prefetched });
              console.log('[natal/full/stream] Prefetched blocks:', Object.keys(prefetched).join(', '));
            }
            resolve();
          },
          onError: (err) => {
            console.log('[natal/full/stream] Prefetch failed, will fallback to /api/detail:', err?.message || err);
            resolve();
          },
        });
      });
    } catch (err) {
      // 静默失败，fallback 到原有单端点模式
      console.log('[natal/full] Prefetch failed, will fallback to /api/detail:', err?.statusCode || err?.message || err);
    }
  },

  /**
   * 将预获取的内容块写入 localStorage 缓存。
   * blockName: 'overview' | 'coreThemes' | 'dimension'
   */
  _cacheNatalFullBlock(blockName, content) {
    const cacheKey = `natal_full_${blockName}`;
    storage.set(cacheKey, { content });
  },

  drawRadarChart(canvasId, size, retryCount = 0) {
    const query = wx.createSelectorQuery();
    query.select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          // Canvas 未就绪，延迟重试
          if (retryCount < 3) {
            setTimeout(() => this.drawRadarChart(canvasId, size, retryCount + 1), 100);
          }
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        // 如果尺寸为 0，使用传入的 size 或默认值
        let width = res[0].width || size || 300;
        let height = res[0].height || size || 300;
        // 尺寸为 0 时延迟重试
        if (width <= 0 || height <= 0) {
          if (retryCount < 3) {
            setTimeout(() => this.drawRadarChart(canvasId, size, retryCount + 1), 100);
          }
          return;
        }
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) / 2 - 45;
        ctx.clearRect(0, 0, width, height);
        const data = [85, 78, 90, 72, 60, 88, 65, 75, 95, 70, 80, 85];
        const labels = (this.data.dimensionList || DIMENSION_LIST).map(item => item.label);
        const total = 12;
        ctx.strokeStyle = CANVAS_COLORS.grid;
        ctx.fillStyle = CANVAS_COLORS.text;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        [0.2, 0.4, 0.6, 0.8, 1.0].forEach(scale => {
           ctx.beginPath();
           for(let i=0; i<total; i++) {
              const rad = (i * 360 / total - 90) * Math.PI / 180;
              const x = cx + r * scale * Math.cos(rad);
              const y = cy + r * scale * Math.sin(rad);
              if (i===0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
           }
           ctx.closePath();
           ctx.stroke();
        });
        for(let i=0; i<total; i++) {
           const rad = (i * 360 / total - 90) * Math.PI / 180;
           const x = cx + r * Math.cos(rad);
           const y = cy + r * Math.sin(rad);
           ctx.beginPath();
           ctx.moveTo(cx, cy);
           ctx.lineTo(x, y);
           ctx.stroke();
           const labelR = r + 20;
           const lx = cx + labelR * Math.cos(rad);
           const ly = cy + labelR * Math.sin(rad);
           ctx.fillText(labels[i], lx, ly);
        }
        ctx.beginPath();
        for(let i=0; i<total; i++) {
           const val = data[i] / 100;
           const rad = (i * 360 / total - 90) * Math.PI / 180;
           const x = cx + r * val * Math.cos(rad);
           const y = cy + r * val * Math.sin(rad);
           if (i===0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = CANVAS_COLORS.fill;
        ctx.fill();
        ctx.strokeStyle = CANVAS_COLORS.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
  },

  async onBig3Click(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    const target = item.id === 'ascendant' ? 'rising' : item.id;
    const chartData = this.buildBig3ChartData(target);
    const subtitle = item.sign ? `${item.sign}${item.house ? `${item.house}宫` : ''}` : '';
    await this.openDetailReport({
      type: 'big3',
      key: target,
      title: `${item.name}解读`,
      subtitle,
      chartData,
    });
  },

  showPaymentModal(reportType) {
    const type = reportType || 'annual';
    const meta = REPORT_PAYMENT_META[type];
    if (!meta) return;
    if (wx.hideTabBar) {
      wx.hideTabBar({ animation: false });
    }
    this.setData({
      showPayment: true,
      paymentReportType: type,
      paymentMeta: meta,
    });
  },

  closePayment() {
    if (wx.showTabBar) {
      wx.showTabBar({ animation: false });
    }
    this.setData({ showPayment: false, paymentLoading: false }, () => {
      // 弹窗关闭后重新绘制雷达图
      setTimeout(() => this.drawRadarChart('radarChart', this.data.radarSize), 50);
    });
  },

  async handlePay() {
    const reportType = this.data.paymentReportType;
    this.setData({ paymentLoading: true });

    // 获取用户出生信息
    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      this.setData({ paymentLoading: false });
      return;
    }

    // 转换为 API 期望的格式
    const birthData = {
      date: userProfile.birthDate,
      time: userProfile.birthTime || '12:00',
      city: userProfile.birthCity || '',
      lat: userProfile.lat,
      lon: userProfile.lon,
      timezone: userProfile.timezone || 'Asia/Shanghai',
      accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };

    // TODO: 开发阶段 - 暂未接入支付，直接创建任务
    // 正式上线后需要先进行支付，支付成功后再创建任务
    const DEV_MODE = true;

    try {
      if (!DEV_MODE) {
        // 正式版：先支付
        const payResult = await request({
          url: '/api/reports/purchase',
          method: 'POST',
          data: { reportType },
        });

        if (!payResult || !payResult.success) {
          const errorMsg = payResult?.error || '支付失败';
          if (payResult?.error === 'Insufficient credits') {
            wx.showModal({
              title: '积分不足',
              content: `当前积分: ${payResult.balance || 0}，需要: ${payResult.price || 500}`,
              confirmText: '去充值',
              cancelText: '取消',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({ url: '/pages/me/me' });
                }
              },
            });
          } else {
            wx.showToast({ title: errorMsg, icon: 'none' });
          }
          return;
        }
      }

      // 根据报告类型分派创建逻辑
      if (reportType === 'annual') {
        await this._createAnnualTask(birthData);
      } else if (reportType === 'natal-report') {
        await this._createNatalTask(birthData);
      }
    } catch (error) {
      console.error('Create task error:', error);
      wx.showToast({ title: '创建任务失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ paymentLoading: false });
    }
  },

  /** 创建年度报告异步任务 */
  async _createAnnualTask(birthData) {
    const result = await request({
      url: '/api/annual-task/create',
      method: 'POST',
      data: { birth: birthData, lang: 'zh' },
    });

    if (result && result.success) {
      this.closePayment();
      this.setData({
        annualTaskStatus: result.status,
        annualTaskProgress: result.progress || 0,
        annualTaskMessage: result.message || '',
      });

      if (result.isNew) {
        wx.showModal({
          title: '任务已创建',
          content: `报告将在后台生成，预计需要 ${result.estimatedMinutes || 5} 分钟。\n\n生成完成后可在"本我"页面查看。`,
          showCancel: false,
          confirmText: '知道了',
        });
        this._startStatusPolling();
      } else if (result.status === 'completed') {
        wx.navigateTo({ url: '/pages/annual-report/annual-report' });
      } else if (result.status === 'processing') {
        wx.showToast({ title: '报告正在生成中...', icon: 'loading' });
        this._startStatusPolling();
      }
    } else {
      wx.showToast({ title: result?.error || '创建任务失败', icon: 'none' });
    }
  },

  /** 创建本命深度解读异步任务 */
  async _createNatalTask(birthData) {
    const result = await request({
      url: API_ENDPOINTS.REPORT_CREATE,
      method: 'POST',
      data: { reportType: 'natal-report', birth: birthData, lang: 'zh' },
    });

    if (result && result.success) {
      this.closePayment();
      this.setData({
        natalReportStatus: result.status,
        natalReportProgress: result.progress || 0,
        natalReportMessage: result.message || '',
      });

      if (result.isNew) {
        wx.showModal({
          title: '任务已创建',
          content: '报告将在后台生成，预计需要数分钟。\n\n生成完成后可在"本我"页面查看。',
          showCancel: false,
          confirmText: '知道了',
        });
        this._startNatalReportPolling();
      } else if (result.status === 'completed') {
        wx.navigateTo({ url: '/pages/report/report?reportType=natal-report' });
      } else if (result.status === 'processing') {
        wx.showToast({ title: '报告正在生成中...', icon: 'loading' });
        this._startNatalReportPolling();
      }
    } else {
      wx.showToast({ title: result?.error || '创建任务失败', icon: 'none' });
    }
  },

  /** 年度报告入口点击处理 */
  onAnnualReportTap() {
    const { annualTaskStatus } = this.data;

    switch (annualTaskStatus) {
      case 'none':
        this.showPaymentModal('annual');
        break;

      case 'pending':
      case 'processing':
        wx.navigateTo({ url: '/pages/annual-report/annual-report' });
        break;

      case 'completed':
        wx.navigateTo({ url: '/pages/annual-report/annual-report' });
        break;

      case 'failed':
        wx.showModal({
          title: '生成失败',
          content: '报告生成过程中出现错误，是否重试？',
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.retryAnnualReport();
            }
          },
        });
        break;

      default:
        this.showPaymentModal('annual');
    }
  },

  /** 重试失败的任务 */
  async retryAnnualReport() {
    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    const birthData = {
      date: userProfile.birthDate,
      time: userProfile.birthTime || '12:00',
      city: userProfile.birthCity || '',
      lat: userProfile.lat,
      lon: userProfile.lon,
      timezone: userProfile.timezone || 'Asia/Shanghai',
      accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };

    wx.showLoading({ title: '正在重试...' });

    try {
      const result = await request({
        url: '/api/annual-task/retry',
        method: 'POST',
        data: { birth: birthData },
      });

      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          annualTaskStatus: 'processing',
          annualTaskProgress: result.task?.progress || 0,
        });
        wx.showToast({ title: '重试任务已启动', icon: 'success' });
        this._startStatusPolling();
      } else {
        wx.showToast({ title: result?.error || '重试失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '重试失败', icon: 'none' });
    }
  },

  /** 直接查看年度报告（兼容旧代码） */
  goToAnnualReport() {
    this.onAnnualReportTap();
  },

  /** 检查本命深度解读任务状态 */
  async checkNatalReportAccess() {
    try {
      const userProfile = storage.get('user_profile');
      if (!userProfile || !userProfile.birthDate) return;

      const birthData = {
        date: userProfile.birthDate,
        time: userProfile.birthTime || '12:00',
        city: userProfile.birthCity || '',
        lat: userProfile.lat,
        lon: userProfile.lon,
        timezone: userProfile.timezone || 'Asia/Shanghai',
        accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
      };

      const result = await request({
        url: API_ENDPOINTS.REPORT_STATUS,
        method: 'GET',
        data: {
          reportType: 'natal-report',
          birth: JSON.stringify(birthData),
        },
      });

      if (result && result.exists) {
        this.setData({
          natalReportStatus: result.status,
          natalReportProgress: result.progress || 0,
          natalReportMessage: result.message || '',
        });

        if (result.status === 'processing') {
          this._startNatalReportPolling();
        }
      } else {
        this.setData({
          natalReportStatus: 'none',
          natalReportProgress: 0,
          natalReportMessage: '',
        });
      }
    } catch (error) {
      console.log('Check natal report status:', error?.statusCode || error);
      this.setData({ natalReportStatus: 'none' });
    }
  },

  /** 开始轮询本命报告任务状态（递归 setTimeout 防止异步堆叠） */
  _startNatalReportPolling() {
    if (this._natalReportPollTimer) {
      clearTimeout(this._natalReportPollTimer);
    }
    this._natalReportPolling = true;
    this._pollNatalOnce();
  },

  async _pollNatalOnce() {
    if (!this._natalReportPolling) return;

    await this.checkNatalReportAccess();

    if (this.data.natalReportStatus !== 'processing') {
      this._natalReportPolling = false;
      this._natalReportPollTimer = null;
      if (this.data.natalReportStatus === 'completed') {
        wx.showToast({ title: '本命解读已生成', icon: 'success' });
      }
      return;
    }

    if (this._natalReportPolling) {
      this._natalReportPollTimer = setTimeout(() => this._pollNatalOnce(), 5000);
    }
  },

  /** 本命深度解读入口点击处理 */
  onNatalReportTap() {
    const { natalReportStatus } = this.data;

    switch (natalReportStatus) {
      case 'none':
        this.showPaymentModal('natal-report');
        break;

      case 'pending':
      case 'processing':
      case 'completed':
        wx.navigateTo({ url: '/pages/report/report?reportType=natal-report' });
        break;

      case 'failed':
        wx.showModal({
          title: '生成失败',
          content: '报告生成过程中出现错误，是否重试？',
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.retryNatalReport();
            }
          },
        });
        break;

      default:
        this.showPaymentModal('natal-report');
    }
  },

  /** 重试本命深度解读任务 */
  async retryNatalReport() {
    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    const birthData = {
      date: userProfile.birthDate,
      time: userProfile.birthTime || '12:00',
      city: userProfile.birthCity || '',
      lat: userProfile.lat,
      lon: userProfile.lon,
      timezone: userProfile.timezone || 'Asia/Shanghai',
      accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };

    wx.showLoading({ title: '正在重试...' });

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_RETRY,
        method: 'POST',
        data: {
          reportType: 'natal-report',
          birth: birthData,
        },
      });

      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          natalReportStatus: 'processing',
          natalReportProgress: result.task?.progress || 0,
        });
        wx.showToast({ title: '重试任务已启动', icon: 'success' });
        this._startNatalReportPolling();
      } else {
        wx.showToast({ title: result?.error || '重试失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '重试失败', icon: 'none' });
    }
  },

  closeDetailReport() {
    this.setData({ showDetailReport: false, detailReportData: null, navTitle: 'Self' }, () => {
      // 弹窗关闭后重新绘制雷达图
      setTimeout(() => this.drawRadarChart('radarChart', this.data.radarSize), 50);
    });
  },

  toggleZoom() {
    const newZoom = !this.data.isZoomed;
    this.setData({ isZoomed: newZoom }, () => {
      // 关闭全屏模式后重新绘制雷达图
      if (!newZoom) {
        setTimeout(() => this.drawRadarChart('radarChart', this.data.radarSize), 50);
      }
    });
  },

  toggleAccordion(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedSection: this.data.expandedSection === id ? null : id
    });
  },
  
  async onDimensionClick(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    const chartData = this.buildDimensionChartData(item.key);
    await this.openDetailReport({
      type: 'dimension',
      key: item.key,
      title: `${item.label}解读`,
      subtitle: '12维心理解读',
      chartData,
    });
  },

  async onDimensionOverview() {
    const first = (this.data.dimensionList || [])[0];
    if (!first) return;
    await this.onDimensionClick({ currentTarget: { dataset: { item: first } } });
  },

  async onDomainClick(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const domain = (this.data.lifeDomains || []).find(item => item.id === id);
    if (!domain) return;
    const chartData = this.buildDeepChartData(id);
    await this.openDetailReport({
      type: 'deep',
      key: id,
      title: `${domain.title}深度解析`,
      subtitle: domain.desc || '',
      chartData,
    });
  },

  async onAppendixDetail(e) {
    const type = e.currentTarget.dataset.type;
    const label = APPENDIX_LABELS[type];
    if (!type || !label) return;
    const chartData = this.buildAppendixChartData(type);
    await this.openDetailReport({
      type,
      key: type,
      title: `${label}解读`,
      subtitle: '详细分析数据',
      chartData,
    });
  },

  buildBig3ChartData(target) {
    const nameMap = { sun: 'Sun', moon: 'Moon', rising: 'Ascendant' };
    const planetName = nameMap[target];
    if (!planetName) return null;
    const position = (this.data.chartPositions || []).find(p => p.name === planetName);
    if (!position) return null;
    const aspects = (this.data.chartAspects || []).filter(
      a => a.planet1 === planetName || a.planet2 === planetName
    );
    return {
      target,
      sign: position.sign,
      house: position.house,
      degree: position.degree,
      minute: position.minute,
      aspects,
      positions: this.data.chartPositions,
      houseCusps: this.data.chartHouseCusps,
    };
  },

  buildDimensionChartData(dimensionKey) {
    if (!this.data.chartPositions || this.data.chartPositions.length === 0) return null;
    return {
      dimensionKey,
      positions: this.data.chartPositions,
      aspects: this.data.chartAspects,
      houseCusps: this.data.chartHouseCusps,
    };
  },

  buildDeepChartData(domainKey) {
    if (!this.data.chartPositions || this.data.chartPositions.length === 0) return null;
    return {
      domainKey,
      positions: this.data.chartPositions,
      aspects: this.data.chartAspects,
      houseCusps: this.data.chartHouseCusps,
    };
  },

  buildAppendixChartData(type) {
    if (!this.data.chartPositions || this.data.chartPositions.length === 0) return null;
    const base = {
      positions: this.data.chartPositions,
      aspects: this.data.chartAspects,
      houseCusps: this.data.chartHouseCusps,
    };
    if (type === 'elements') return { ...base, elementMatrix: this.data.elementMatrix };
    if (type === 'aspects') return { ...base, aspects: this.data.chartAspects };
    if (type === 'planets') return { ...base, planets: this.data.planets };
    if (type === 'asteroids') return { ...base, asteroids: this.data.asteroids };
    if (type === 'rulers') return { ...base, houseRulers: this.data.houseRulers };
    return null;
  },

  getSelfDetailCacheKey(type, key) {
    const profile = this.userProfile || DEFAULT_PROFILE;
    const birthDate = profile.birthDate || '';
    const birthTime = profile.birthTime || '';
    const birthCity = profile.birthCity || '';
    const safeKey = `${birthDate}_${birthTime}_${birthCity}_${type}_${key}_zh`.replace(/\s+/g, '_');
    return `self_detail_${safeKey}`;
  },

  async fetchDetailContent(type, chartData, cacheKey) {
    // 1. 检查内存缓存
    if (cacheKey && this.data.detailContentCache?.[cacheKey]) {
      return this.data.detailContentCache[cacheKey];
    }

    // 2. 检查 localStorage 缓存（包括 fetchNatalFull 写入的）
    const cached = cacheKey ? storage.get(cacheKey) : null;
    if (cached?.content) {
      if (cacheKey) {
        this.setData({ [`detailContentCache.${cacheKey}`]: cached.content });
      }
      return cached.content;
    }

    // 3. 走原有的 /api/detail POST 请求
    const payload = {
      type,
      context: 'natal',
      lang: 'zh',
      chartData,
    };
    const result = await request({ url: API_ENDPOINTS.DETAIL, method: 'POST', data: payload, timeout: 120000 });
    const content = result?.content ?? null;
    if (cacheKey) {
      storage.set(cacheKey, { content });
      this.setData({ [`detailContentCache.${cacheKey}`]: content });
    }
    return content;
  },

  /**
   * 获取预取的 natal/full 内容块
   * blockName: 'overview' | 'coreThemes' | 'dimension'
   */
  getPrefetchedBlock(blockName) {
    return this.data.prefetchedContent?.[blockName] ?? null;
  },

  formatSectionTitle(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    let title = trimmed;
    title = title.replace(/^[一二三四五六七八九十]、\s*/, '');
    title = title.replace(/^【/, '').replace(/】$/, '');
    if (/[\u4e00-\u9fa5]/.test(title)) return title;
    const key = title.toLowerCase().replace(/[\s\-]+/g, '_');
    if (DETAIL_SECTION_LABELS[key]) return DETAIL_SECTION_LABELS[key];
    return title;
  },

  _formatArrayItem(item) {
    if (typeof item === 'string') return item.trim();
    if (typeof item === 'number' || typeof item === 'boolean') return String(item);
    if (typeof item === 'object' && item !== null) {
      // 优先使用 title/description 组合（如 key_patterns 元素）
      const title = item.title || item.name || item.label || '';
      const desc = item.description || item.content || item.text || item.meaning || '';
      if (title && desc) return `${title}：${desc}`;
      if (title) return title;
      if (desc) return desc;
      // fallback: 提取所有原始值拼接
      const parts = Object.entries(item)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        .map(([k, v]) => `${this.formatSectionTitle(k)}：${String(v)}`);
      if (parts.length) return parts.join('，');
    }
    return '';
  },

  formatSectionValue(value) {
    if (value === null || value === undefined) return { text: '', list: [] };
    if (Array.isArray(value)) {
      const list = value.map(item => this._formatArrayItem(item)).filter(Boolean);
      return { text: '', list };
    }
    if (typeof value === 'string') {
      return { text: value.trim(), list: [] };
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return { text: String(value), list: [] };
    }
    if (typeof value === 'object') {
      if (typeof value.text === 'string') return { text: value.text.trim(), list: [] };
      if (typeof value.content === 'string') return { text: value.content.trim(), list: [] };
      if (typeof value.description === 'string') return { text: value.description.trim(), list: [] };
      if (Array.isArray(value.items)) {
        return { text: '', list: value.items.map(item => this._formatArrayItem(item)).filter(Boolean) };
      }
      if (Array.isArray(value.list)) {
        return { text: '', list: value.list.map(item => this._formatArrayItem(item)).filter(Boolean) };
      }
      // steps 数组（如 practice.steps）
      if (Array.isArray(value.steps)) {
        const title = value.title ? `${value.title}：` : '';
        const steps = value.steps.map(s => this._formatArrayItem(s)).filter(Boolean);
        return { text: title, list: steps };
      }
      // actions 数组（如 growth_path.actions）
      if (Array.isArray(value.actions)) {
        const dir = value.direction ? `${value.direction}` : '';
        const actions = value.actions.map(a => this._formatArrayItem(a)).filter(Boolean);
        return { text: dir, list: actions };
      }
      const primitiveEntries = Object.entries(value).filter(([, v]) =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      );
      if (primitiveEntries.length) {
        const lines = primitiveEntries.map(([k, v]) => `${this.formatSectionTitle(k)}：${String(v)}`);
        return { text: lines.join('\n'), list: [] };
      }
    }
    return { text: '', list: [] };
  },

  normalizeDetailContent(value) {
    if (!value) return { text: '', sections: [] };
    if (typeof value === 'string') return { text: value.trim(), sections: [] };
    if (Array.isArray(value)) {
      const list = value.map(item => String(item).trim()).filter(Boolean);
      return { text: '', sections: list.length ? [{ title: '重点内容', list }] : [] };
    }
    if (typeof value === 'object') {
      if (Array.isArray(value.sections)) {
        const sections = value.sections
          .map(section => {
            const title = this.formatSectionTitle(section.title || section.label || '解读内容');
            const payload = this.formatSectionValue(section.text || section.content || section.description || section.list || section.items);
            if (!payload.text && (!payload.list || payload.list.length === 0)) return null;
            return { title, ...payload };
          })
          .filter(Boolean);
        if (sections.length) return { text: '', sections };
      }
      if (typeof value.text === 'string') return { text: value.text.trim(), sections: [] };
      const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== '');
      const sections = entries
        .map(([key, val]) => {
          const payload = this.formatSectionValue(val);
          if (!payload.text && (!payload.list || payload.list.length === 0)) return null;
          return { title: this.formatSectionTitle(key), ...payload };
        })
        .filter(Boolean);
      if (sections.length) return { text: '', sections };
    }
    return { text: String(value), sections: [] };
  },

  buildDetailSections(text) {
    if (!text) return [];
    const lines = String(text).split(/\n+/).map(line => line.trim()).filter(Boolean);
    const sections = [];
    let current = null;

    const pushCurrent = () => {
      if (current && current.text) {
        sections.push(current);
      }
    };

    lines.forEach((line) => {
      const isNumbered = /^[一二三四五六七八九十]、/.test(line);
      const isBracket = /^【.+】$/.test(line);
      if (isNumbered || isBracket) {
        pushCurrent();
        current = { title: this.formatSectionTitle(line), text: '' };
        return;
      }

      const focusMatch = line.match(/^重点关注[:：]\s*(.+)$/);
      if (focusMatch) {
        if (!current) {
          current = { title: '重点关注', text: '' };
        }
        current.text += (current.text ? '\n' : '') + focusMatch[1];
        return;
      }

      if (!current) {
        current = { title: '解读内容', text: '' };
      }
      current.text += (current.text ? '\n' : '') + line;
    });

    pushCurrent();
    if (!sections.length) {
      return [{ title: '解读内容', text }];
    }
    return sections;
  },

  buildDetailReportData(title, subtitle, content, type) {
    if (!content) return null;
    const normalizer = {
      big3: this.normalizeBig3Content,
      deep: this.normalizeDeepContent,
      dimension: this.normalizeDimensionContent,
      elements: this.normalizeElementsContent,
      aspects: this.normalizeAspectsContent,
      planets: this.normalizePlanetsContent,
      asteroids: this.normalizeAsteroidsContent,
      rulers: this.normalizeRulersContent,
    }[type];
    const sections = normalizer
      ? normalizer.call(this, content)
      : this.normalizeGenericSections(content);
    if (!sections || !sections.length) return null;
    return {
      title: title || '解读详情',
      subtitle: subtitle || '',
      sections
    };
  },

  /** 将英文行星/星座名翻译为中文，已是中文则原样返回 */
  _zhName(name) {
    if (!name || typeof name !== 'string') return name || '';
    return PLANET_NAMES_ZH[name] || SIGN_NAMES_ZH[name] || name;
  },

  /** 翻译数组中的行星名 */
  _zhNames(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(n => this._zhName(n));
  },

  normalizeGenericSections(content) {
    const normalized = this.normalizeDetailContent(content);
    const sections = normalized.sections && normalized.sections.length
      ? normalized.sections
      : this.buildDetailSections(normalized.text || '');
    return sections;
  },

  normalizeBig3Content(content) {
    const sections = [];
    // 概述卡片（新格式 summary 优先，旧格式 fallback 到 content）
    const summaryText = content.summary || content.content || '';
    if (summaryText) {
      const titleParts = [];
      if (content.title) titleParts.push(content.title);
      if (content.sign && content.house) titleParts.push(`${this._zhName(content.sign)} ${content.house}宫`);
      else if (content.sign) titleParts.push(this._zhName(content.sign));
      sections.push({
        title: titleParts.join(' · ') || '概述',
        text: summaryText,
        cardColor: 'accent-red'
      });
    }
    // 核心模式（新格式，含分析依据）
    if (Array.isArray(content.key_patterns) && content.key_patterns.length) {
      content.key_patterns.forEach((p, i) => {
        const text = [p.description, p.astro_basis ? `分析依据：${p.astro_basis}` : ''].filter(Boolean).join('\n');
        sections.push({ title: p.title || `核心模式 ${i + 1}`, text, cardColor: 'info' });
      });
    }
    // 天赋优势
    if (Array.isArray(content.strengths) && content.strengths.length) {
      sections.push({ title: '天赋优势', list: content.strengths, cardColor: 'success' });
    }
    // 兼容旧格式 key_traits
    if (!content.strengths && Array.isArray(content.key_traits) && content.key_traits.length) {
      sections.push({ title: '核心特质', list: content.key_traits, cardColor: 'success' });
    }
    // 成长挑战
    if (Array.isArray(content.challenges) && content.challenges.length) {
      sections.push({ title: '成长挑战', list: content.challenges, cardColor: 'warning' });
    }
    // 生活场景（新格式数组 / 旧格式字符串）
    if (Array.isArray(content.life_scenarios) && content.life_scenarios.length) {
      sections.push({ title: '生活场景', list: content.life_scenarios, cardColor: 'default' });
    } else if (content.life_scenario) {
      sections.push({ title: '生活场景', text: content.life_scenario, cardColor: 'default' });
    }
    // 成长方向
    if (content.growth_path) {
      const gp = content.growth_path;
      sections.push({
        title: '成长方向',
        text: gp.direction || '',
        list: Array.isArray(gp.actions) ? gp.actions : [],
        cardColor: 'success'
      });
    }
    // 兼容旧格式 growth_tip
    if (!content.growth_path && content.growth_tip) {
      sections.push({ title: '成长建议', text: content.growth_tip, cardColor: 'success' });
    }
    // 反思问题
    if (content.reflection_question) {
      sections.push({ title: '反思问题', text: content.reflection_question, cardColor: 'accent-red' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizeDeepContent(content) {
    const sections = [];
    if (content.summary) {
      sections.push({ title: content.title || '概述', text: content.summary, cardColor: 'accent-red' });
    }
    if (Array.isArray(content.key_patterns) && content.key_patterns.length) {
      content.key_patterns.forEach((p, i) => {
        const text = [p.description, p.astro_basis ? `分析依据：${p.astro_basis}` : ''].filter(Boolean).join('\n');
        sections.push({ title: p.title || `核心模式 ${i + 1}`, text, cardColor: 'info' });
      });
    }
    if (Array.isArray(content.strengths) && content.strengths.length) {
      sections.push({ title: '天赋优势', list: content.strengths, cardColor: 'success' });
    }
    if (Array.isArray(content.challenges) && content.challenges.length) {
      sections.push({ title: '成长挑战', list: content.challenges, cardColor: 'warning' });
    }
    if (content.growth_path) {
      const gp = content.growth_path;
      sections.push({
        title: '成长方向',
        text: gp.direction || '',
        list: Array.isArray(gp.actions) ? gp.actions : [],
        cardColor: 'success'
      });
    }
    if (content.reflection_question) {
      sections.push({ title: '反思问题', text: content.reflection_question, cardColor: 'accent-red' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizeDimensionContent(content) {
    const sections = [];
    if (content.pattern) {
      sections.push({ title: content.title || '核心模式', text: content.pattern, cardColor: 'accent-red' });
    }
    if (content.root) {
      sections.push({ title: '模式根源', text: content.root, cardColor: 'info' });
    }
    if (content.when_triggered) {
      sections.push({ title: '触发场景', text: content.when_triggered, cardColor: 'warning' });
    }
    if (Array.isArray(content.what_helps) && content.what_helps.length) {
      sections.push({ title: '缓解方法', list: content.what_helps, cardColor: 'success' });
    }
    if (content.shadow) {
      sections.push({ title: '阴影面', text: content.shadow, cardColor: 'info' });
    }
    if (content.practice) {
      const pr = content.practice;
      sections.push({
        title: pr.title || '推荐练习',
        list: Array.isArray(pr.steps) ? pr.steps : [],
        cardColor: 'success'
      });
    }
    if (content.prompt_question) {
      sections.push({ title: '反思问题', text: content.prompt_question, cardColor: 'accent-red' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizeElementsContent(content) {
    const sections = [];
    if (content.element_distribution) {
      const dist = content.element_distribution;
      const elementNames = { fire: '火元素', earth: '土元素', air: '风元素', water: '水元素' };
      const list = Object.entries(elementNames).map(([key, name]) => {
        const el = dist[key];
        if (!el) return '';
        const planets = Array.isArray(el.planets) ? this._zhNames(el.planets).join('、') : '';
        return `${name}：${el.count || 0}颗（${el.percentage || 0}%）${planets ? ' — ' + planets : ''}`;
      }).filter(Boolean);
      if (list.length) sections.push({ title: '元素分布', list, cardColor: 'info' });
    }
    if (content.dominant_element) {
      const de = content.dominant_element;
      sections.push({ title: `主导元素：${de.name || ''}`, text: de.interpretation || '', cardColor: 'success' });
    }
    if (content.weak_element) {
      const we = content.weak_element;
      const text = [we.interpretation, we.growth_tip ? `成长建议：${we.growth_tip}` : ''].filter(Boolean).join('\n');
      sections.push({ title: `薄弱元素：${we.name || ''}`, text, cardColor: 'warning' });
    }
    if (content.element_balance) {
      const eb = content.element_balance;
      const text = [eb.overall, eb.life_pattern].filter(Boolean).join('\n');
      sections.push({ title: '元素平衡', text, cardColor: 'default' });
    }
    if (content.chinese_metaphor) {
      const cm = content.chinese_metaphor;
      sections.push({ title: cm.title || '文化意象', text: cm.explanation || '', cardColor: 'accent-red' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizeAspectsContent(content) {
    const sections = [];
    if (Array.isArray(content.major_aspects)) {
      content.major_aspects.forEach(a => {
        const parts = [a.content];
        if (a.life_scenario) parts.push(`生活场景：${a.life_scenario}`);
        if (a.growth_point) parts.push(`成长建议：${a.growth_point}`);
        const typeLabel = a.type === '和谐' ? 'success' : a.type === '紧张' ? 'warning' : 'info';
        sections.push({
          title: a.title || a.aspect || '相位',
          text: parts.filter(Boolean).join('\n'),
          cardColor: typeLabel
        });
      });
    }
    if (content.aspect_pattern && content.aspect_pattern.name) {
      const ap = content.aspect_pattern;
      const text = [
        ap.interpretation,
        Array.isArray(ap.planets_involved) ? `相关行星：${this._zhNames(ap.planets_involved).join('、')}` : ''
      ].filter(Boolean).join('\n');
      sections.push({ title: `格局：${ap.name}`, text, cardColor: 'accent-red' });
    }
    if (content.summary) {
      const s = content.summary;
      const text = [
        s.main_theme ? `主题：${s.main_theme}` : '',
        s.inner_tension ? `内在张力：${s.inner_tension}` : '',
        s.resource ? `内在资源：${s.resource}` : ''
      ].filter(Boolean).join('\n');
      sections.push({ title: '总结', text, cardColor: 'default' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizePlanetsContent(content) {
    const sections = [];
    const formatPlanet = (p) => {
      const parts = [];
      if (p.title) parts.push(p.title);
      if (p.meaning) parts.push(p.meaning);
      if (p.expression) parts.push(`表现：${p.expression}`);
      if (p.life_stage) parts.push(`人生阶段：${p.life_stage}`);
      if (p.generation_theme) parts.push(`世代主题：${p.generation_theme}`);
      if (p.personal_touch) parts.push(p.personal_touch);
      const header = [this._zhName(p.planet), this._zhName(p.sign), p.house ? `${p.house}宫` : '', p.dignity || ''].filter(Boolean).join(' · ');
      return { header, text: parts.filter(Boolean).join('\n') };
    };
    if (Array.isArray(content.personal_planets) && content.personal_planets.length) {
      content.personal_planets.forEach(p => {
        const f = formatPlanet(p);
        sections.push({ title: f.header || '个人行星', text: f.text, cardColor: 'info' });
      });
    }
    if (Array.isArray(content.social_planets) && content.social_planets.length) {
      content.social_planets.forEach(p => {
        const f = formatPlanet(p);
        sections.push({ title: f.header || '社会行星', text: f.text, cardColor: 'success' });
      });
    }
    if (Array.isArray(content.outer_planets) && content.outer_planets.length) {
      content.outer_planets.forEach(p => {
        const f = formatPlanet(p);
        sections.push({ title: f.header || '外行星', text: f.text, cardColor: 'warning' });
      });
    }
    if (content.key_insight) {
      const ki = content.key_insight;
      const text = [
        ki.strongest_planet ? `最强行星：${ki.strongest_planet}` : '',
        ki.hidden_power ? `隐藏力量：${ki.hidden_power}` : '',
        ki.integration_advice ? `整合建议：${ki.integration_advice}` : ''
      ].filter(Boolean).join('\n');
      sections.push({ title: '关键洞察', text, cardColor: 'accent-red' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizeAsteroidsContent(content) {
    const sections = [];
    const asteroidKeys = [
      { key: 'chiron', name: '凯龙星', fields: ['wound', 'healing_path', 'gift'] },
      { key: 'juno', name: '婚神星', fields: ['partnership_need', 'ideal_partner', 'growth_point'] },
      { key: 'pallas', name: '智神星', fields: ['wisdom_style', 'application'] },
      { key: 'ceres', name: '谷神星', fields: ['nurturing_style', 'comfort_needs', 'mothering_pattern'] },
    ];
    const colorCycle = ['info', 'success', 'warning', 'accent-red'];
    asteroidKeys.forEach((def, i) => {
      const a = content[def.key];
      if (!a) return;
      const header = [a.title || def.name, this._zhName(a.sign), a.house ? `${a.house}宫` : ''].filter(Boolean).join(' · ');
      const parts = [];
      def.fields.forEach(f => {
        if (a[f]) {
          if (Array.isArray(a[f])) parts.push(a[f].join('、'));
          else parts.push(a[f]);
        }
      });
      sections.push({ title: header, text: parts.join('\n'), cardColor: colorCycle[i % colorCycle.length] });
    });
    if (content.integration) {
      const ig = content.integration;
      const text = [ig.common_theme, ig.life_lesson].filter(Boolean).join('\n');
      sections.push({ title: '整合洞察', text, cardColor: 'default' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  normalizeRulersContent(content) {
    const sections = [];
    if (content.chart_ruler) {
      const cr = content.chart_ruler;
      const header = [this._zhName(cr.planet), this._zhName(cr.sign), cr.house ? `${cr.house}宫` : '', cr.condition || ''].filter(Boolean).join(' · ');
      sections.push({ title: `命主星：${header}`, text: cr.life_direction || '', cardColor: 'accent-red' });
    }
    if (Array.isArray(content.key_rulers) && content.key_rulers.length) {
      content.key_rulers.forEach(r => {
        const header = `${r.house}宫 ${r.house_theme || ''}`;
        const parts = [
          `宫头${this._zhName(r.cusp_sign)}，宫主星${this._zhName(r.ruler)}在${this._zhName(r.ruler_sign)} ${r.ruler_house || ''}宫`,
          r.interpretation,
          r.life_implication ? `生活影响：${r.life_implication}` : ''
        ].filter(Boolean);
        sections.push({ title: header, text: parts.join('\n'), cardColor: 'info' });
      });
    }
    if (Array.isArray(content.ruler_chains) && content.ruler_chains.length) {
      content.ruler_chains.forEach(chain => {
        const text = [chain.description, chain.insight].filter(Boolean).join('\n');
        sections.push({ title: chain.name || '宫主星链', text, cardColor: 'success' });
      });
    }
    if (content.key_insight) {
      const ki = content.key_insight;
      const text = [ki.energy_flow, ki.advice].filter(Boolean).join('\n');
      sections.push({ title: '关键洞察', text, cardColor: 'warning' });
    }
    return sections.length ? sections : this.normalizeGenericSections(content);
  },

  async openDetailReport({ type, key, title, subtitle, chartData }) {
    if (!chartData) {
      wx.showToast({ title: '数据未就绪，请稍后重试', icon: 'none' });
      return;
    }
    const cacheKey = this.getSelfDetailCacheKey(type, key);
    wx.showLoading({ title: '加载解读...' });
    try {
      const content = await this.fetchDetailContent(type, chartData, cacheKey);
      const reportData = this.buildDetailReportData(title, subtitle, content, type);
      if (!reportData) {
        wx.showToast({ title: '暂无解读内容', icon: 'none' });
        return;
      }
      this.setData({
        detailReportData: reportData,
        showDetailReport: true,
        navTitle: reportData.title || '太阳解读'
      });
    } catch (err) {
      console.error('Fetch self detail failed', err);
      wx.showToast({ title: '内容加载失败，请稍后重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  stopProp() {}
})

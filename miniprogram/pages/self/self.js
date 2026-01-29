const { request } = require('../../utils/request');
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
};

Page({
  data: {
    planets: [],
    aspects: [],
    big3: [],
    lifeDomains: DEEP_DOMAIN_LIST,
    dimensionList: DIMENSION_LIST,
    isZoomed: false,
    showPayment: false,
    paymentLoading: false,
    expandedSection: null,
    showDetailReport: false,
    detailReportData: null,
    detailContentCache: {},

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
    });
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth;
    const padding = 128 * (windowWidth / 750);
    const chartSize = Math.max(240, Math.floor(windowWidth - padding));
    
    this.setData({
      chartSize,
      fullChartSize: Math.floor(windowWidth * 0.9)
    });

    this.loadUserProfile();
    this.fetchNatalChart();
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
      const houseCusps = chart?.houseCusps || [];

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
      });
    } catch (err) {
      console.error('Fetch natal chart failed', err);
      wx.showToast({ title: '星盘数据获取失败', icon: 'none' });
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

  drawRadarChart(canvasId, size) {
    const query = wx.createSelectorQuery();
    query.select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        const width = res[0].width;
        const height = res[0].height;
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

  showPaymentModal() {
    if (wx.hideTabBar) {
      wx.hideTabBar({ animation: false });
    }
    this.setData({ showPayment: true });
  },

  closePayment() {
    if (wx.showTabBar) {
      wx.showTabBar({ animation: false });
    }
    this.setData({ showPayment: false });
  },

  handlePay() {
    this.setData({ paymentLoading: true });
    setTimeout(() => {
      if (wx.showTabBar) {
        wx.showTabBar({ animation: false });
      }
      this.setData({ paymentLoading: false, showPayment: false });
      wx.showToast({ title: 'Payment logic', icon: 'none' });
    }, 1500);
  },

  closeDetailReport() {
    this.setData({ showDetailReport: false, detailReportData: null });
  },

  toggleZoom() {
    const newZoom = !this.data.isZoomed;
    this.setData({ isZoomed: newZoom });
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
      subtitle: '专业星象数据附录',
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

  normalizeDetailContent(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(item => String(item)).join('\n');
    if (typeof value === 'object') {
      if (typeof value.text === 'string') return value.text.trim();
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  },

  async fetchDetailContent(type, chartData, cacheKey) {
    if (cacheKey && this.data.detailContentCache?.[cacheKey]) {
      return this.data.detailContentCache[cacheKey];
    }
    const cached = cacheKey ? storage.get(cacheKey) : null;
    if (cached?.content) {
      if (cacheKey) {
        this.setData({ [`detailContentCache.${cacheKey}`]: cached.content });
      }
      return cached.content;
    }

    const payload = {
      type,
      context: 'natal',
      lang: 'zh',
      chartData,
    };
    const result = await request({ url: API_ENDPOINTS.DETAIL, method: 'POST', data: payload });
    const content = result?.content ?? null;
    if (cacheKey) {
      storage.set(cacheKey, { content });
      this.setData({ [`detailContentCache.${cacheKey}`]: content });
    }
    return content;
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

  formatSectionValue(value) {
    if (value === null || value === undefined) return { text: '', list: [] };
    if (Array.isArray(value)) {
      const list = value.map(item => String(item).trim()).filter(Boolean);
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
        return { text: '', list: value.items.map(item => String(item).trim()).filter(Boolean) };
      }
      if (Array.isArray(value.list)) {
        return { text: '', list: value.list.map(item => String(item).trim()).filter(Boolean) };
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

  buildDetailReportData(title, subtitle, content) {
    const normalized = this.normalizeDetailContent(content);
    const sections = normalized.sections && normalized.sections.length
      ? normalized.sections
      : this.buildDetailSections(normalized.text || '');
    if (!sections.length) return null;
    return {
      title: title || '解读详情',
      subtitle: subtitle || '',
      sections
    };
  },

  async openDetailReport({ type, key, title, subtitle, chartData }) {
    if (!chartData) {
      wx.showToast({ title: '星盘数据未就绪，请稍后重试', icon: 'none' });
      return;
    }
    const cacheKey = this.getSelfDetailCacheKey(type, key);
    wx.showLoading({ title: '加载解读...' });
    try {
      const content = await this.fetchDetailContent(type, chartData, cacheKey);
      const reportData = this.buildDetailReportData(title, subtitle, content);
      if (!reportData) {
        wx.showToast({ title: '暂无解读内容', icon: 'none' });
        return;
      }
      this.setData({
        detailReportData: reportData,
        showDetailReport: true
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

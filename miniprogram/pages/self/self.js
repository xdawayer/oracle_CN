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

const CANVAS_COLORS = {
  grid: '#EFEAE2',
  text: '#7A746B',
  fill: 'rgba(198, 160, 98, 0.25)',
  stroke: '#C6A062',
};

Page({
  data: {
    planets: [],
    aspects: [],
    big3: [],
    lifeDomains: [
      { id: 'career', title: '财运事业', desc: '二宫主星飞星良好', icon: '/images/icons/career.svg', iconColor: 'var(--domain-career-fg)', iconBg: 'var(--domain-career-bg)' },
      { id: 'marriage', title: '婚恋关系', desc: '七宫落双鱼座', icon: '/images/icons/marriage.svg', iconColor: 'var(--domain-marriage-fg)', iconBg: 'var(--domain-marriage-bg)' },
      { id: 'health', title: '身体健康', desc: '六宫群星汇聚', icon: '/images/icons/health.svg', iconColor: 'var(--domain-health-fg)', iconBg: 'var(--domain-health-bg)' },
      { id: 'relations', title: '人际交往', desc: '十一宫贵人运', icon: '/images/icons/relations.svg', iconColor: 'var(--domain-relations-fg)', iconBg: 'var(--domain-relations-bg)' },
      { id: 'study', title: '学业考试', desc: '水星相位极佳', icon: '/images/icons/study.svg', iconColor: 'var(--domain-study-fg)', iconBg: 'var(--domain-study-bg)' },
      { id: 'love', title: '恋爱桃花', desc: '金星入庙天秤', icon: '/images/icons/love.svg', iconColor: 'var(--domain-love-fg)', iconBg: 'var(--domain-love-bg)' },
    ],
    selectedItem: null,
    isZoomed: false,
    showPayment: false,
    paymentLoading: false,
    expandedSection: null,

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
        const labels = ['自我', '情感', '沟通', '关系', '行动', '成长', '责任', '创新', '灵性', '转化', '疗愈', '命运'];
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

  onSelectPlanet(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ selectedItem: item });
  },

  showPaymentModal() {
    this.setData({ showPayment: true });
  },

  closePayment() {
    this.setData({ showPayment: false });
  },

  handlePay() {
    this.setData({ paymentLoading: true });
    setTimeout(() => {
      this.setData({ paymentLoading: false, showPayment: false });
      wx.showToast({ title: 'Payment logic', icon: 'none' });
    }, 1500);
  },

  closeDetail() {
    this.setData({ selectedItem: null });
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
  
  onDomainClick() {},
  stopProp() {}
})

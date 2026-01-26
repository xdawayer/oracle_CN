const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

const LoadingState = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
};

const ASTRO_DICTIONARY = {
  Sun: { zh: '太阳' },
  Moon: { zh: '月亮' },
  Mercury: { zh: '水星' },
  Venus: { zh: '金星' },
  Mars: { zh: '火星' },
  Jupiter: { zh: '木星' },
  Saturn: { zh: '土星' },
  Uranus: { zh: '天王星' },
  Neptune: { zh: '海王星' },
  Pluto: { zh: '冥王星' },
  Chiron: { zh: '凯龙星' },
  Ceres: { zh: '谷神星' },
  Pallas: { zh: '智神星' },
  Juno: { zh: '婚神星' },
  Vesta: { zh: '灶神星' },
  'North Node': { zh: '北交点' },
  'South Node': { zh: '南交点' },
  Lilith: { zh: '莉莉丝' },
  Fortune: { zh: '福点' },
  Vertex: { zh: '宿命点' },
  'East Point': { zh: '东方点' },
  Ascendant: { zh: '上升' },
  Midheaven: { zh: '天顶' },
  Descendant: { zh: '下降' },
  IC: { zh: '下中天' },
  Aries: { zh: '白羊座' },
  Taurus: { zh: '金牛座' },
  Gemini: { zh: '双子座' },
  Cancer: { zh: '巨蟹座' },
  Leo: { zh: '狮子座' },
  Virgo: { zh: '处女座' },
  Libra: { zh: '天秤座' },
  Scorpio: { zh: '天蝎座' },
  Sagittarius: { zh: '射手座' },
  Capricorn: { zh: '摩羯座' },
  Aquarius: { zh: '水瓶座' },
  Pisces: { zh: '双鱼座' },
  conjunction: { zh: '合' },
  opposition: { zh: '冲' },
  square: { zh: '刑' },
  trine: { zh: '拱' },
  sextile: { zh: '六合' },
};

const ASPECT_CONFIG = {
  conjunction: { symbol: '☌', color: '#94A3B8' },
  opposition: { symbol: '☍', color: '#8B5CF6' },
  square: { symbol: '□', color: '#EF4444' },
  trine: { symbol: '△', color: '#22C55E' },
  sextile: { symbol: '⚹', color: '#3B82F6' },
};

const MATRIX_HEADER_LABELS = {
  Sun: '日', Moon: '月', Mercury: '水', Venus: '金', Mars: '火',
  Jupiter: '木', Saturn: '土', Uranus: '天', Neptune: '海', Pluto: '冥',
  'North Node': '北交', Ascendant: '上升'
};

const ASPECT_MATRIX_CONFIG = {
  conjunction: { label: '合', color: '#7A746B', bg: 'rgba(122, 116, 107, 0.1)' },
  opposition: { label: '冲', color: '#8B5CF6', bg: 'rgba(139, 95, 246, 0.1)' },
  square: { label: '刑', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  trine: { label: '拱', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)' },
  sextile: { label: '六合', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
};

const PLANET_META = {
  Sun: { glyph: '☉', color: '#FF6B6B' },
  Moon: { glyph: '☽', color: '#74B9FF' },
  Mercury: { glyph: '☿', color: '#FFEAA7' },
  Venus: { glyph: '♀', color: '#55EFC4' },
  Mars: { glyph: '♂', color: '#FF85C1' },
  Jupiter: { glyph: '♃', color: '#FF7675' },
  Saturn: { glyph: '♄', color: '#DFE6E9' },
  Uranus: { glyph: '♅', color: '#00CEC9' },
  Neptune: { glyph: '♆', color: '#74B9FF' },
  Pluto: { glyph: '♇', color: '#A29BFE' },
  Chiron: { glyph: '⚷', color: '#E056FD' },
  Ceres: { glyph: '⚳', color: '#55EFC4' },
  Pallas: { glyph: '⚴', color: '#00CEC9' },
  Juno: { glyph: '⚵', color: '#FF85C1' },
  Vesta: { glyph: '⚶', color: '#FDCB6E' },
  'North Node': { glyph: '☊', color: '#E056FD' },
  'South Node': { glyph: '☋', color: '#E056FD' },
  Lilith: { glyph: '⚸', color: '#FD79A8' },
  Fortune: { glyph: '⊗', color: '#FDCB6E' },
  Vertex: { glyph: 'Vx', color: '#DFE6E9' },
  'East Point': { glyph: 'EA', color: '#DFE6E9' },
  Ascendant: { glyph: 'Asc', color: '#FFFFFF' },
  Midheaven: { glyph: 'MC', color: '#00CEC9' },
  Descendant: { glyph: 'Dsc', color: '#FFFFFF' },
  IC: { glyph: 'IC', color: '#00CEC9' },
};

const SIGN_META = {
  Aries: { glyph: '♈', color: '#FF6B6B' },
  Taurus: { glyph: '♉', color: '#FFEAA7' },
  Gemini: { glyph: '♊', color: '#00CEC9' },
  Cancer: { glyph: '♋', color: '#74B9FF' },
  Leo: { glyph: '♌', color: '#FF7675' },
  Virgo: { glyph: '♍', color: '#FFEAA7' },
  Libra: { glyph: '♎', color: '#00CEC9' },
  Scorpio: { glyph: '♏', color: '#74B9FF' },
  Sagittarius: { glyph: '♐', color: '#FF6B6B' },
  Capricorn: { glyph: '♑', color: '#FFEAA7' },
  Aquarius: { glyph: '♒', color: '#00CEC9' },
  Pisces: { glyph: '♓', color: '#74B9FF' },
};

const CROSS_ASPECT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'Ascendant'];

const DIMENSION_ORDER = [
  { key: 'career', label: '事业运', color: '#8B7355' },    // 暖棕色
  { key: 'wealth', label: '财运', color: '#C6A062' },      // 琥珀金
  { key: 'love', label: '爱情运', color: '#CD5C5C' },      // 印度红
  { key: 'health', label: '健康运', color: '#6B8E23' },    // 橄榄绿
];

const LUCKY_COLOR_MAP = {
  '深蓝': ['#5D5FEF', '#7B7DF4'],
  '紫色': ['#8E59FF', '#AC82FF'],
  '金色': ['#C6A062', '#D4AF37'],
  '绿色': ['#27AE60', '#2ECC71'],
  '红色': ['#EB5757', '#F2994A'],
  '白色': ['#999999', '#CCCCCC'],
  '橙色': ['#F2994A', '#F2C94C'],
  '大地棕': ['#8B7355', '#A68B6A'],
  '棕色': ['#8B7355', '#A68B6A'],
  '粉色': ['#FF85A2', '#FFA3B1'],
  '天蓝': ['#4CC9F0', '#4895EF'],
  'default': ['#1A1A1A', '#2D2D2D']
};

const COLOR_NAME_MAP = {
  '大地棕': '大地棕',
  '棕色': '大地棕',
  '深蓝': '深蓝',
  '紫色': '紫色',
  '金色': '金色',
  '绿色': '绿色',
  '红色': '红色',
  '白色': '白色',
  '橙色': '橙色',
  '粉色': '粉色',
  '天蓝': '天蓝'
};

const DIMENSION_ICONS = {
  career: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjczNTUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjciIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PHBhdGggZD0iTTE2IDIxVjVhMiAyIDAgMCAwLTItMmgtNGEyIDIgMCAwIDAtMiAydjE2Ij48L3BhdGg+PC9zdmc+',
  wealth: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNDNkEwNjIiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQsPSJNMTkgNWgtMTRhMiAyIDAgMCAwLTIgMnYxMGEyIDIgMCAwIDAgMiAyaDE0YTIgMiAwIDAgMCAyLTJ2LTEwYTIgMiAwIDAgMC0yLTJ6Ij48L3BhdGg+PHBhdGggZD0iTTEyIDExYTIgMiAwIDEgMCAwIDQgMiAyIDAgMCAwIDAtNHoiPjwvcGF0aD48cGF0aCBkPSJNMjIgOWgtNGEyIDIgMCAwIDAgMCA0aDQiPjwvcGF0aD48L3N2Zz4=',
  love: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjQ0Q1QzVDMzAiIHN0cm9rZT0iI0NENUM1QyIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwLjg0IDQuNjFhNS41IDUuNSAwIDAgMC03Ljc4IDBMMTIgNS42N2wtMS4wNi0xLjA2YTUuNSA1LjUgMCAwIDAtNy43OCA3Ljc4bDEuMDYgMS4wNkwxMiAyMS4yM2w3Ljc4LTcuNzggMS4wNi0xLjA2YTUuNSA1LjUgMCAwIDAgMC03Ljc4eiI+PC9wYXRoPjwvc3ZnPg==',
  health: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2QjhFMjMiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwcm9seWxpbmUgcG9pbnRzPSIyMiAxMiAxOCAxMiAxNSAyMSA5IDMgNiAxMiAyIDEyIj48L3Byb2x5bGluZT48L3N2Zz4='
};

const LUCKY_TEXT_COLOR_MAP = {
  '深蓝': '#FFFFFF',
  '紫色': '#FFFFFF',
  '金色': '#FFFFFF',
  '绿色': '#FFFFFF',
  '红色': '#FFFFFF',
  '白色': '#4A4540',
  '橙色': '#FFFFFF',
  '大地棕': '#FFFFFF',
  '棕色': '#FFFFFF',
  '粉色': '#FFFFFF',
  '天蓝': '#FFFFFF',
  'default': '#FFFFFF'
};

Page({
  data: {
    LoadingState,
    status: LoadingState.IDLE,
    dates: [],
    selectedDateIndex: 2,
    forecast: null,
    cardStyle: '',
    cardTextColor: '#FFFFFF',
    dimensionItems: [],
    weekRange: '',
    weeklyEvents: [],
    transits: [],
    transitChartData: {
      innerPositions: [],
      outerPositions: [],
      aspects: [],
      houseCusps: []
    }
  },

  onLoad() {
    this.initDates();
    this.loadProfile();
    this.handleGenerate();
  },

  initDates() {
    const dates = [];
    const today = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = -2; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        fullDate: d,
        day: d.getDate(),
        weekday: weekdays[d.getDay()],
        isToday: i === 0
      });
    }

    this.setData({ dates });
  },

  loadProfile() {
    this.userProfile = storage.get('user_profile');

    // 如果没有用户数据，使用默认测试数据
    if (!this.userProfile) {
      this.userProfile = {
        birthDate: '1989-10-31',
        birthTime: '22:00',
        birthCity: '北京',
        lat: 39.9042,
        lon: 116.4074,
        timezone: 'Asia/Shanghai',
        accuracyLevel: 'exact'
      };
      // 保存默认数据到 storage
      storage.set('user_profile', this.userProfile);
    }
  },

  buildDailyParams(dateStr) {
    if (!this.userProfile) return '';
    const params = [];
    params.push(`birthDate=${encodeURIComponent(this.userProfile.birthDate || '')}`);
    params.push(`city=${encodeURIComponent(this.userProfile.birthCity || '')}`);
    params.push(`timezone=${encodeURIComponent(this.userProfile.timezone || '')}`);
    params.push(`accuracy=${encodeURIComponent(this.userProfile.accuracyLevel || '')}`);
    params.push(`date=${encodeURIComponent(dateStr)}`);
    params.push('lang=zh');

    if (this.userProfile.birthTime) {
      params.push(`birthTime=${encodeURIComponent(this.userProfile.birthTime)}`);
    }
    if (this.userProfile.lat !== undefined) {
      params.push(`lat=${encodeURIComponent(this.userProfile.lat)}`);
    }
    if (this.userProfile.lon !== undefined) {
      params.push(`lon=${encodeURIComponent(this.userProfile.lon)}`);
    }

    return params.join('&');
  },

  onDateSelect(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedDateIndex: index });
    this.handleGenerate();
  },

  async handleGenerate() {
    if (!this.userProfile) {
      this.setData({ status: LoadingState.ERROR });
      return;
    }

    this.setData({ status: LoadingState.LOADING });

    try {
      const { dates, selectedDateIndex } = this.data;
      const selected = dates[selectedDateIndex];
      const dateStr = selected ? selected.fullDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const query = this.buildDailyParams(dateStr);

      if (!query) {
        this.setData({ status: LoadingState.ERROR });
        return;
      }

      const result = await request({
        url: `${API_ENDPOINTS.DAILY_FORECAST}?${query}`,
        method: 'GET'
      });

      const forecast = result && result.content ? result.content : null;
      const transits = result && result.transits && result.transits.positions ? result.transits.positions : [];

      // 适配四个运势维度（事业/财运/爱情/健康）
      const dimensions = forecast && forecast.dimensions ? forecast.dimensions : null;
      const dimensionItems = dimensions ? DIMENSION_ORDER.map((item) => ({
        key: item.key,
        label: item.label,
        color: item.color,
        score: dimensions[item.key] || 0,
        iconUrl: DIMENSION_ICONS[item.key]
      })) : DIMENSION_ORDER.map((item) => ({
        key: item.key,
        label: item.label,
        color: item.color,
        score: 0,
        iconUrl: DIMENSION_ICONS[item.key]
      }));

      // 本周星象提醒
      const weeklyEvents = forecast && forecast.weekly_events ? forecast.weekly_events : [];
      const weekRange = this.getWeekRange();

      // 准备行运盘数据
      const transitChartData = this.prepareTransitChartData(result);
      const technical = this.prepareTechnicalData(result.technical);

      const luckyColorName = forecast ? (forecast.lucky_color || '深蓝') : '深蓝';
      const normalizedColor = COLOR_NAME_MAP[luckyColorName] || luckyColorName;
      const colors = LUCKY_COLOR_MAP[normalizedColor] || LUCKY_COLOR_MAP.default;
      const cardStyle = `background: linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%);`;
      const cardTextColor = LUCKY_TEXT_COLOR_MAP[normalizedColor] || LUCKY_TEXT_COLOR_MAP.default;

      this.setData({
        status: LoadingState.SUCCESS,
        forecast,
        cardStyle,
        cardTextColor,
        dimensionItems,
        weekRange,
        weeklyEvents,
        transits,
        transitChartData,
        technical
      });
    } catch (e) {
      console.error(e);
      this.setData({ status: LoadingState.ERROR });
    }
  },

  // 获取本周日期范围
  getWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  },

  translate(term) {
    return ASTRO_DICTIONARY[term]?.zh || term;
  },

  getPlanetMeta(name) {
    return PLANET_META[name] || { glyph: '?', color: '#888' };
  },

  getSignMeta(name) {
    return SIGN_META[name] || { glyph: '?', color: '#888' };
  },

  formatDegree(degree, minute) {
    return `${Math.floor(degree)}°${String(Math.floor(minute || 0)).padStart(2, '0')}'`;
  },

  buildAspectMatrix(aspects) {
    const matrix = [];
    const aspectMap = new Map();

    aspects.forEach(a => {
      const p1 = a.planet1.startsWith('T-') ? a.planet1.slice(2) : a.planet1;
      const p2 = a.planet2.startsWith('N-') ? a.planet2.slice(2) : a.planet2;
      if (CROSS_ASPECT_PLANETS.includes(p1) && CROSS_ASPECT_PLANETS.includes(p2)) {
        aspectMap.set(`${p1}|${p2}`, a);
      }
    });

    CROSS_ASPECT_PLANETS.forEach(p1 => {
      const row = {
        planet: p1,
        meta: this.getPlanetMeta(p1),
        cells: []
      };
      CROSS_ASPECT_PLANETS.forEach(p2 => {
        const aspect = aspectMap.get(`${p1}|${p2}`);
        row.cells.push(aspect ? {
          ...aspect,
          config: ASPECT_CONFIG[aspect.type]
        } : null);
      });
      matrix.push(row);
    });

    return {
      header: CROSS_ASPECT_PLANETS.map(p => ({
        name: p,
        label: MATRIX_HEADER_LABELS[p] || p,
        meta: this.getPlanetMeta(p)
      })),
      rows: matrix.map(row => ({
        ...row,
        label: MATRIX_HEADER_LABELS[row.planet] || row.planet,
        cells: row.cells.map(cell => cell ? {
          ...cell,
          matrixConfig: ASPECT_MATRIX_CONFIG[cell.type]
        } : null)
      }))
    };
  },

  prepareTechnicalData(tech) {
    if (!tech) return null;

    return {
      transitPlanets: tech.transit_planets.map(p => ({
        ...p,
        zhName: this.translate(p.name),
        zhSign: this.translate(p.sign),
        meta: this.getPlanetMeta(p.name),
        signMeta: this.getSignMeta(p.sign),
        degreeText: this.formatDegree(p.degree, p.minute)
      })),
      transitAsteroids: tech.transit_asteroids.map(p => ({
        ...p,
        zhName: this.translate(p.name),
        zhSign: this.translate(p.sign),
        meta: this.getPlanetMeta(p.name),
        signMeta: this.getSignMeta(p.sign),
        degreeText: this.formatDegree(p.degree, p.minute)
      })),
      houseRulers: tech.house_rulers.map(r => ({
        ...r,
        zhSign: this.translate(r.sign),
        zhRuler: this.translate(r.ruler),
        zhFliesToSign: this.translate(r.fliesToSign),
        rulerMeta: this.getPlanetMeta(r.ruler),
        signMeta: this.getSignMeta(r.sign),
        fliesToSignMeta: this.getSignMeta(r.fliesToSign)
      })),
      aspectMatrix: this.buildAspectMatrix(tech.cross_aspects)
    };
  },

  // 准备行运盘数据
  prepareTransitChartData(result) {
    if (!result || !result.natal || !result.transits) {
      return {
        innerPositions: [],
        outerPositions: [],
        aspects: [],
        houseCusps: []
      };
    }

    // 内环：本命盘位置
    const innerPositions = result.natal.positions || [];

    // 外环：行运位置
    const outerPositions = result.transits.positions || [];

    // 相位：跨盘相位（本命 vs 行运）
    const aspects = result.transits.aspects || [];

    // 宫位：本命盘宫位
    const houseCusps = result.natal.houseCusps || [];

    return {
      innerPositions,
      outerPositions,
      aspects,
      houseCusps
    };
  },

  onViewDetail(e) {
    const { type } = e.currentTarget.dataset;
    wx.showToast({
      title: `正在生成${this.translateDetailType(type)}解读...`,
      icon: 'loading'
    });
  },

  translateDetailType(type) {
    const map = {
      chart: '行运星盘',
      aspects: '相位矩阵',
      planets: '行运行星',
      asteroids: '小行星',
      rulers: '宫主星'
    };
    return map[type] || '详情';
  }
});

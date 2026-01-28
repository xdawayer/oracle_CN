const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

const LoadingState = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
};

const DEFAULT_PROFILE = {
  birthDate: '1989-10-31',
  birthTime: '22:00',
  birthCity: '北京',
  lat: 39.9042,
  lon: 116.4074,
  timezone: 'Asia/Shanghai',
  accuracyLevel: 'exact'
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
  conjunction: { symbol: '☌', color: '#FF4D4F' },
  opposition: { symbol: '☍', color: '#FF4D4F' },
  square: { symbol: '□', color: '#FF4D4F' },
  trine: { symbol: '△', color: '#52C41A' },
  sextile: { symbol: '✱', color: '#40A9FF' },
};

const ASPECT_MATRIX_CONFIG = {
  conjunction: { label: '合', color: 'var(--paper-400)', bg: 'var(--paper-200)' },
  opposition: { label: '冲', color: 'var(--warm-brown)', bg: 'var(--paper-200)' },
  square: { label: '刑', color: 'var(--danger)', bg: 'var(--paper-200)' },
  trine: { label: '拱', color: 'var(--success)', bg: 'var(--paper-200)' },
  sextile: { label: '六合', color: 'var(--accent)', bg: 'var(--paper-200)' },
};

const PLANET_META = {
  Sun: { glyph: '☉', color: '#8B0000' },
  Moon: { glyph: '☽', color: '#0000CD' },
  Mercury: { glyph: '☿', color: '#0000CD' },
  Venus: { glyph: '♀', color: '#0000CD' },
  Mars: { glyph: '♂', color: '#8B0000' },
  Jupiter: { glyph: '♃', color: '#006400' },
  Saturn: { glyph: '♄', color: '#006400' },
  Uranus: { glyph: '♅', color: '#006400' },
  Neptune: { glyph: '♆', color: '#006400' },
  Pluto: { glyph: '♇', color: '#006400' },
  Chiron: { glyph: '⚷', color: '#006400' },
  Ceres: { glyph: '⚳', color: '#006400' },
  Pallas: { glyph: '⚴', color: '#006400' },
  Juno: { glyph: '⚵', color: '#006400' },
  Vesta: { glyph: '⚶', color: '#006400' },
  'North Node': { glyph: '☊', color: '#006400' },
  'South Node': { glyph: '☋', color: '#006400' },
  Lilith: { glyph: '⚸', color: '#8B0000' },
  Fortune: { glyph: '⊗', color: '#006400' },
  Vertex: { glyph: 'Vx', color: '#006400' },
  'East Point': { glyph: 'EA', color: '#006400' },
  Ascendant: { glyph: 'Asc', color: '#3A3A3A' },
  Midheaven: { glyph: 'MC', color: '#3A3A3A' },
  Descendant: { glyph: 'Dsc', color: '#3A3A3A' },
  IC: { glyph: 'IC', color: '#3A3A3A' },
};

const SIGN_META = {
  Aries: { color: '#E74C3C' },
  Leo: { color: '#E74C3C' },
  Sagittarius: { color: '#E74C3C' },
  Taurus: { color: '#27AE60' },
  Virgo: { color: '#27AE60' },
  Capricorn: { color: '#27AE60' },
  Gemini: { color: '#3498DB' },
  Libra: { color: '#3498DB' },
  Aquarius: { color: '#3498DB' },
  Cancer: { color: '#8E44AD' },
  Scorpio: { color: '#8E44AD' },
  Pisces: { color: '#8E44AD' },
};

const CROSS_ASPECT_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Ascendant'
];

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

const LUCKY_COLOR_TOKEN_MAP = {
  '深蓝': 'var(--paper-400)',
  '紫色': 'var(--warm-brown)',
  '金色': 'var(--accent)',
  '绿色': 'var(--success)',
  '红色': 'var(--danger)',
  '白色': 'var(--paper-200)',
  '橙色': 'var(--accent)',
  '大地棕': 'var(--warm-brown)',
  '棕色': 'var(--warm-brown)',
  '粉色': 'var(--accent)',
  '天蓝': 'var(--paper-400)',
  'default': 'var(--accent)'
};

const DIMENSION_ICONS = {
  career: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjczNTUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjciIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PHBhdGggZD0iTTE2IDIxVjVhMiAyIDAgMCAwLTItMmgtNGEyIDIgMCAwIDAtMiAydjE2Ij48L3BhdGg+PC9zdmc+',
  wealth: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNDNkEwNjIiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQsPSJNMTkgNWgtMTRhMiAyIDAgMCAwLTIgMnYxMGEyIDIgMCAwIDAtMiAyaDE0YTIgMiAwIDAgMCAyLTJ2LTEwYTIgMiAwIDAgMC0yLTJ6Ij48L3BhdGg+PHBhdGggZD0iTTEyIDExYTIgMiAwIDEgMCAwIDQgMiAyIDAgMCAwIDAtNHoiPjwvcGF0aD48cGF0aCBkPSJNMjIgOWgtNGEyIDIgMCAwIDAgMCA0aDQiPjwvcGF0aD48L3N2Zz4=',
  love: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjQ0Q1QzVDMzAiIHN0cm9rZT0iI0NENUM1QyIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwLjg0IDQuNjFhNS41IDUuNSAwIDAgMC03Ljc4IDBMMTIgNS42N2wtMS4wNi0xLjA2YTUuNSA1LjUgMCAwIDAtNy43OCA3Ljc4bDEuMDYgMS4wNkwxMiAyMS4yM2w3Ljc4LTcuNzggMS4wNi0xLjA2YTUuNSA1LjUgMCAwIDAgMC03Ljc4eiI+PC9wYXRoPjwvc3ZnPg==',
  health: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2QjhFMjMiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwcm9seWxpbmUgcG9pbnRzPSIyMiAxMiAxOCAxMiAxNSAyMSA5IDMgNiAxMiAyIDEyIj48L3Byb2x5bGluZT48L3N2Zz4='
};

const DIMENSION_ORDER = [
  { key: 'career', label: '事业', color: 'var(--career-color)' },
  { key: 'wealth', label: '财运', color: 'var(--wealth-color)' },
  { key: 'love', label: '爱情', color: 'var(--love-color)' },
  { key: 'health', label: '健康', color: 'var(--health-color)' }
];

const TIME_WINDOW_STYLE_MAP = {
  '积极': { dotColor: 'var(--accent)', tagBg: 'var(--paper-200)', tagColor: 'var(--warm-brown)' },
  '平稳': { dotColor: 'var(--success)', tagBg: 'var(--paper-200)', tagColor: 'var(--success)' },
  '放松': { dotColor: 'var(--paper-400)', tagBg: 'var(--paper-200)', tagColor: 'var(--paper-400)' },
  '挑战': { dotColor: 'var(--danger)', tagBg: 'var(--paper-200)', tagColor: 'var(--danger)' }
};

Page({
  data: {
    LoadingState,
    status: LoadingState.IDLE,
    dates: [],
    selectedDateIndex: 2,
    forecast: null,
    overviewSummary: '',
    currentDateStr: '',
    luckyColorToken: 'var(--accent)',
    advice: { do: { title: '', details: [] }, dont: { title: '', details: [] } },
    timeWindows: [],
    weeklyScores: [],
    dimensionItems: [],
    weekRange: '',
    weeklyEvents: [],
    transits: [],
    transitChartData: {
      innerPositions: [],
      outerPositions: [],
      aspects: [],
      houseCusps: []
    },
    technical: null,
    selectedPlanet: null,
    detailContentMap: {},
    detailCard: null
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
    const stored = storage.get('user_profile');
    this.userProfile = { ...DEFAULT_PROFILE, ...(stored || {}) };
  },

  getCacheKey(dateStr) {
    if (!this.userProfile) return null;
    const { birthDate, birthTime, birthCity } = this.userProfile;
    return `daily_cache_${birthDate}_${birthTime}_${birthCity}_${dateStr}_zh`;
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
    this.setData({
      selectedDateIndex: index,
      technical: null,
      selectedPlanet: null,
      detailContentMap: {},
      detailCard: null
    });
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
      
      // 1. Check Cache
      const cacheKey = this.getCacheKey(dateStr);
      const cachedData = storage.get(cacheKey);
      
      if (cachedData) {
        this.processDailyData(cachedData, dateStr);
        return;
      }

      // 2. Fetch Summary
      const query = this.buildDailyParams(dateStr);
      if (!query) {
        this.setData({ status: LoadingState.ERROR });
        return;
      }

      const result = await request({
        url: `${API_ENDPOINTS.DAILY_FORECAST}?${query}`,
        method: 'GET'
      });

      if (result) {
        // Save to cache
        storage.set(cacheKey, result);
        this.processDailyData(result, dateStr);
      } else {
        this.setData({ status: LoadingState.ERROR });
      }

    } catch (e) {
      console.error(e);
      this.setData({ status: LoadingState.ERROR });
    }
  },

  processDailyData(result, dateStr) {
    const forecast = result && result.content ? result.content : null;
    const currentDateStr = this.formatDateLabel(dateStr);
    const overviewSummary = forecast?.summary || forecast?.theme_explanation || forecast?.theme_title || forecast?.share_text || '';
    const transits = result && result.transits && result.transits.positions ? result.transits.positions : [];
    const transitChartData = this.prepareTransitChartData(result);
    const technical = this.prepareTechnicalData(result.technical);

    // 适配四个运势维度（事业/财运/爱情/健康）
    const dimensions = forecast && forecast.dimensions ? forecast.dimensions : null;
    const dimensionItems = dimensions ? DIMENSION_ORDER.map((item) => ({
      key: item.key,
      label: item.label,
      color: item.color,
      score: Number.isFinite(dimensions[item.key]) ? dimensions[item.key] : 0,
      iconUrl: DIMENSION_ICONS[item.key]
    })) : DIMENSION_ORDER.map((item) => ({
      key: item.key,
      label: item.label,
      color: item.color,
      score: 0,
      iconUrl: DIMENSION_ICONS[item.key]
    }));

    const weeklyTrend = forecast?.weekly_trend || {};
    const weeklyEvents = this.buildWeeklyEvents(forecast);
    const weeklyScores = this.buildWeeklyScores(forecast, dateStr);
    const weekRange = weeklyTrend.weekRange || weeklyTrend.week_range || this.getWeekRange();

    const luckyColorName = forecast ? (forecast.lucky_color || '深蓝') : '深蓝';
    const normalizedColor = COLOR_NAME_MAP[luckyColorName] || luckyColorName;
    const luckyColorToken = LUCKY_COLOR_TOKEN_MAP[normalizedColor] || LUCKY_COLOR_TOKEN_MAP.default;

    const advice = this.buildAdvice(forecast);
    const timeWindows = this.buildTimeWindows(forecast);

    this.setData({
      status: LoadingState.SUCCESS,
      forecast,
      overviewSummary,
      currentDateStr,
      luckyColorToken,
      advice,
      timeWindows,
      dimensionItems,
      weekRange,
      weeklyEvents,
      weeklyScores,
      transits,
      transitChartData,
      technical
    });
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

  formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  },

  normalizeEnergyLabel(label) {
    const raw = String(label || '').replace(/[⭐🌙⚡⚠️]/g, '').trim();
    return raw || '平稳';
  },

  buildAdvice(forecast) {
    const fallbackDo = forecast?.strategy?.best_use || '';
    const fallbackDont = forecast?.strategy?.avoid || '';
    const advice = forecast?.advice || {};
    return {
      do: {
        title: advice.do?.title || fallbackDo,
        details: Array.isArray(advice.do?.details) ? advice.do.details : []
      },
      dont: {
        title: advice.dont?.title || fallbackDont,
        details: Array.isArray(advice.dont?.details) ? advice.dont.details : []
      }
    };
  },

  buildTimeWindows(forecast) {
    if (!forecast) return [];
    const enhanced = forecast.time_windows_enhanced || forecast.time_windows_enhanced_list;
    if (Array.isArray(enhanced)) {
      return enhanced.map((item) => {
        const energyLevel = this.normalizeEnergyLabel(item.energyLevel || item.energy_level || item.tag || item.mood);
        const style = TIME_WINDOW_STYLE_MAP[energyLevel] || TIME_WINDOW_STYLE_MAP['平稳'];
        const bestFor = Array.isArray(item.bestFor) ? item.bestFor : [];
        const avoidFor = Array.isArray(item.avoidFor) ? item.avoidFor : [];
        return {
          period: item.period || '',
          time: item.time || '',
          description: item.description || '',
          energyLevel,
          dotColor: style.dotColor,
          tagBg: style.tagBg,
          tagColor: style.tagColor,
          bestForStr: bestFor.join('、'),
          avoidForStr: avoidFor.join('、')
        };
      });
    }

    const timeWindows = forecast.time_windows || {};
    const fallback = [
      {
        period: '上午',
        time: '6:00-12:00',
        mood: this.normalizeEnergyLabel(timeWindows.morning_mood || '积极'),
        description: timeWindows.morning || ''
      },
      {
        period: '午间',
        time: '12:00-18:00',
        mood: this.normalizeEnergyLabel(timeWindows.midday_mood || '平稳'),
        description: timeWindows.midday || ''
      },
      {
        period: '晚上',
        time: '18:00-24:00',
        mood: this.normalizeEnergyLabel(timeWindows.evening_mood || '放松'),
        description: timeWindows.evening || ''
      }
    ];

    return fallback.map((item) => {
      const style = TIME_WINDOW_STYLE_MAP[item.mood] || TIME_WINDOW_STYLE_MAP['平稳'];
      return {
        period: item.period,
        time: item.time,
        description: item.description,
        energyLevel: item.mood,
        dotColor: style.dotColor,
        tagBg: style.tagBg,
        tagColor: style.tagColor,
        bestForStr: '',
        avoidForStr: ''
      };
    });
  },

  buildWeeklyScores(forecast, dateStr) {
    if (!forecast) return [];
    const weeklyTrend = forecast.weekly_trend || forecast.weeklyTrend || {};
    const raw = weeklyTrend.dailyScores || weeklyTrend.daily_scores || forecast.weekly_scores || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const score = Number.isFinite(item.score) ? item.score : 0;
      const label = String(item.label || item.tag || item.event_label || '').replace(/[⭐🌙⚡⚠️]/g, '').trim();
      const date = item.date || '';
      let dayText = item.day || item.weekday || '';
      if (!dayText && date) {
        const parsed = new Date(date);
        if (!Number.isNaN(parsed.getTime())) {
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          dayText = weekdays[parsed.getDay()];
        }
      }
      return {
        date,
        day: dayText,
        score,
        label,
        isToday: date === dateStr,
        barColor: date === dateStr ? 'var(--accent)' : 'var(--paper-200)'
      };
    });
  },

  buildWeeklyEvents(forecast) {
    if (!forecast) return [];
    const weeklyTrend = forecast.weekly_trend || forecast.weeklyTrend || {};
    const raw = weeklyTrend.keyDates || weeklyTrend.key_dates || forecast.weekly_events || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      date: item.date || '',
      label: String(item.label || item.tag || '').replace(/[⭐🌙⚡⚠️]/g, '').trim(),
      description: item.description || item.reason || ''
    }));
  },

  onPlanetDetail(e) {
    const detail = e?.detail;
    if (!detail) return;
    this.setData({ selectedPlanet: detail });
  },

  closePlanetDetail() {
    this.setData({ selectedPlanet: null });
  },

  stopProp() {},

  closeDetailCard() {
    this.setData({ detailCard: null });
  },

  async onViewDetail(e) {
    const type = e?.currentTarget?.dataset?.type || 'detail';
    await this.openDetailCard(type);
  },

  async openDetailCard(type) {
    const { dates, selectedDateIndex } = this.data;
    const selected = dates[selectedDateIndex];
    const dateStr = selected ? selected.fullDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const needsDetail = ['career', 'wealth', 'love', 'health', 'chart', 'aspects', 'planets', 'asteroids', 'rulers'].includes(type);

    let detailContent = null;
    if (needsDetail) {
      wx.showLoading({ title: '加载解读...' });
      detailContent = await this.ensureDetailContent(type, dateStr);
      wx.hideLoading();
    }

    const detailCard = this.buildDetailCard(type, detailContent);
    if (detailCard) {
      this.setData({ detailCard });
    }
  },

  getDetailCacheKey(dateStr) {
    if (!this.userProfile) return null;
    const { birthDate, birthTime, birthCity } = this.userProfile;
    return `daily_detail_cache_${birthDate}_${birthTime}_${birthCity}_${dateStr}_zh`;
  },

  getDetailCacheKeyByType(type, dateStr) {
    const base = this.getDetailCacheKey(dateStr);
    return base ? `${base}_${type}` : null;
  },

  resolveDetailType(type) {
    const map = {
      career: 'dimension',
      wealth: 'dimension',
      love: 'dimension',
      health: 'dimension',
      chart: 'astro-report',
      aspects: 'aspect-matrix',
      planets: 'planets',
      asteroids: 'asteroids',
      rulers: 'rulers'
    };
    return map[type] || null;
  },

  buildDetailPayload(type, dateStr) {
    if (!this.userProfile) return null;
    const apiType = this.resolveDetailType(type);
    if (!apiType) return null;
    return {
      type: apiType,
      context: 'transit',
      lang: 'zh',
      date: dateStr,
      dimension: apiType === 'dimension' ? type : undefined,
      birth: {
        date: this.userProfile.birthDate,
        time: this.userProfile.birthTime,
        city: this.userProfile.birthCity,
        lat: this.userProfile.lat,
        lon: this.userProfile.lon,
        timezone: this.userProfile.timezone,
        accuracy: this.userProfile.accuracyLevel
      }
    };
  },

  async ensureDetailContent(type, dateStr) {
    const cacheKey = this.getDetailCacheKeyByType(type, dateStr);
    if (cacheKey && this.data.detailContentMap?.[cacheKey]) {
      return this.data.detailContentMap[cacheKey];
    }

    const cached = cacheKey ? storage.get(cacheKey) : null;
    if (cached?.content) {
      if (cacheKey) {
        this.setData({ [`detailContentMap.${cacheKey}`]: cached.content });
      }
      return cached.content;
    }

    try {
      const payload = this.buildDetailPayload(type, dateStr);
      if (!payload) return null;
      const result = await request({ url: API_ENDPOINTS.DETAIL, method: 'POST', data: payload });
      const content = result?.content || null;
      if (content && cacheKey) {
        storage.set(cacheKey, { content });
      }
      if (cacheKey) {
        this.setData({ [`detailContentMap.${cacheKey}`]: content });
      }
      return content;
    } catch (e) {
      console.error('Fetch daily detail failed', e);
      wx.showToast({ title: '解读加载失败', icon: 'none' });
      return null;
    }
  },

  buildDetailCard(type, detail) {
    const forecast = this.data.forecast || {};
    const dimensions = forecast.dimensions || {};
    const titleBase = this.translateDetailType(type);
    const score = Number.isFinite(dimensions[type]) ? dimensions[type] : null;
    const detailData = detail || {};

    const buildSections = (...items) => items.filter(item => item && item.text);
    const safeText = (val) => (val ? String(val).trim() : '');
    const listFrom = (arr) => Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];

    if (['career', 'wealth', 'love', 'health'].includes(type)) {
      const keyAspects = Array.isArray(detailData.key_aspects)
        ? detailData.key_aspects.map((item) => `${item.aspect}：${item.meaning}`)
        : [];
      const sections = buildSections(
        { label: '整体判断', text: safeText(detailData.summary || forecast.theme_explanation) },
        { label: '关键相位', text: safeText(keyAspects.join('；')) },
        { label: '机会', text: safeText((detailData.opportunities || []).join('；')) },
        { label: '挑战', text: safeText((detailData.challenges || []).join('；')) },
        { label: '行动建议', text: safeText((detailData.actions || []).join('；')) }
      );

      const list = listFrom(detailData.reflection_question ? [detailData.reflection_question] : []);

      return {
        title: detailData.title || `${titleBase}解读`,
        subtitle: score !== null ? `今日评分：${score}` : '',
        sections,
        listTitle: list.length ? '自问提示' : '',
        list
      };
    }

    if (type === 'chart') {
      const sections = buildSections(
        { label: '今日摘要', text: safeText(detailData.summary) },
        { label: '深度解读', text: safeText(detailData.deep_dive) },
        { label: '提醒', text: safeText(detailData.caution) },
        { label: '行动建议', text: safeText(detailData.action) }
      );
      const list = listFrom((detailData.highlights || []).map((item) => `${item.title}：${item.description}`));
      return {
        title: detailData.title || `${titleBase}解读`,
        subtitle: '',
        sections,
        listTitle: list.length ? '关键亮点' : '',
        list
      };
    }

    if (type === 'aspects') {
      const keyAspects = (detailData.key_aspects || []).map((item) => `${item.aspect}：${item.impact}｜${item.advice}`);
      const list = listFrom(keyAspects);
      const fallback = list.length ? list : this.buildAspectSummaryList();
      return {
        title: detailData.headline || `${titleBase}解读`,
        subtitle: '',
        sections: buildSections(
          { label: '总体解读', text: safeText(detailData.summary) },
          { label: '能量流向', text: safeText((detailData.energy_flow || []).join('；')) },
          { label: '宜做', text: safeText((detailData.do_dont?.do || []).join('；')) },
          { label: '忌做', text: safeText((detailData.do_dont?.dont || []).join('；')) }
        ),
        listTitle: '关键相位',
        list: fallback
      };
    }

    if (type === 'planets') {
      const list = listFrom(detailData.highlights);
      return {
        title: detailData.title || `${titleBase}详情`,
        subtitle: '',
        sections: buildSections(
          { label: '概览', text: safeText(detailData.summary) }
        ),
        listTitle: list.length ? '要点' : '行运行星',
        list: list.length ? list : this.buildTransitList(this.data.technical?.transitPlanets)
      };
    }

    if (type === 'asteroids') {
      const focusList = (detailData.focus_asteroids || []).map((item) => {
        const houseText = Number.isFinite(item.house) ? `· ${item.house}宫` : '';
        return `${item.name} ${item.sign} ${houseText}：${item.theme}｜${item.influence}`.trim();
      });
      return {
        title: detailData.headline || `${titleBase}详情`,
        subtitle: '',
        sections: buildSections(
          { label: '凯龙星主题', text: safeText(detailData.chiron_focus ? `${detailData.chiron_focus.theme}｜${detailData.chiron_focus.healing_path}` : '') },
          { label: '提醒', text: safeText(detailData.chiron_focus?.warning) },
          { label: '建议', text: safeText((detailData.suggestions || []).join('；')) }
        ),
        listTitle: focusList.length ? '关键小行星' : '行运小行星',
        list: focusList.length ? focusList : this.buildTransitList(this.data.technical?.transitAsteroids)
      };
    }

    if (type === 'rulers') {
      const list = (detailData.rulers || []).map((r) => {
        return `第${r.house}宫 ${r.sign}｜${r.ruler} → 第${r.flies_to_house}宫 ${r.flies_to_sign}：${r.theme}（${r.advice}）`;
      });
      return {
        title: `${titleBase}详情`,
        subtitle: '',
        sections: buildSections(
          { label: '总体提示', text: safeText(detailData.overview) },
          { label: '重点链条', text: safeText((detailData.deep_focus || []).map((item) => `${item.title}：${item.description}`).join('；')) },
          { label: '宫位联动', text: safeText((detailData.combinations || []).map((item) => `第${item.from_house}宫→第${item.to_house}宫：${item.theme}（${item.suggestion}）`).join('；')) }
        ),
        listTitle: list.length ? '宫主星路径' : '宫主星路径',
        list: list.length ? list : this.buildHouseRulerList(this.data.technical?.houseRulers)
      };
    }

    return null;
  },

  buildAspectSummaryList() {
    const aspects = this.data.technical?.crossAspects || [];
    if (!Array.isArray(aspects) || aspects.length === 0) return [];
    return aspects.slice(0, 6).map((a) => {
      const p1 = a.planet1?.startsWith('T-') ? a.planet1.slice(2) : a.planet1;
      const p2 = a.planet2?.startsWith('N-') ? a.planet2.slice(2) : a.planet2;
      const name1 = this.translate(p1);
      const name2 = this.translate(p2);
      const symbol = ASPECT_CONFIG[a.type]?.symbol || '';
      const orbText = this.formatOrb(a.orb);
      return `行运${name1} ${symbol} 本命${name2}（orb ${orbText}）`;
    });
  },

  buildTransitList(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 10).map((p) => {
      const retro = p.isRetrograde ? '· 逆行' : '';
      const houseText = Number.isFinite(p.house) ? `· ${p.house}宫` : '';
      return `${p.zhName} ${p.zhSign} ${p.degreeText} ${houseText} ${retro}`.trim();
    });
  },

  buildHouseRulerList(list) {
    if (!Array.isArray(list)) return [];
    return list.map((r) => {
      return `第${r.house}宫 ${r.zhSign}｜${r.zhRuler} → 第${r.fliesTo}宫 ${r.zhFliesToSign}`;
    });
  },

  translate(term) {
    return ASTRO_DICTIONARY[term]?.zh || term;
  },

  getPlanetMeta(name) {
    return PLANET_META[name] || { glyph: '?', color: 'var(--paper-400)' };
  },

  getSignMeta(name) {
    return SIGN_META[name] || { color: 'var(--paper-400)' };
  },

  formatDegree(degree, minute) {
    return `${Math.floor(degree)}°${String(Math.floor(minute || 0)).padStart(2, '0')}'`;
  },

  formatOrb(orb) {
    const value = Math.abs(orb || 0);
    let deg = Math.floor(value);
    let min = Math.round((value - deg) * 60);
    if (min === 60) {
      deg += 1;
      min = 0;
    }
    return `${deg}°${String(min).padStart(2, '0')}'`;
  },

  buildAspectMatrix(aspects) {
    const transitBodies = CROSS_ASPECT_PLANETS;
    const natalBodies = CROSS_ASPECT_PLANETS;
    const matrix = [];

    const headerRow = [{ isEmpty: true }];
    natalBodies.forEach((name) => {
      headerRow.push({ isHeader: true, symbol: this.getPlanetMeta(name).glyph || '' });
    });
    matrix.push(headerRow);

    transitBodies.forEach((tName) => {
      const row = [];
      row.push({ isHeader: true, symbol: this.getPlanetMeta(tName).glyph || '' });

      natalBodies.forEach((nName) => {
        const aspect = (aspects || []).find((a) => {
          const p1 = a.planet1 || '';
          const p2 = a.planet2 || '';
          const transit = p1.startsWith('T-') ? p1.slice(2) : (p2.startsWith('T-') ? p2.slice(2) : p1);
          const natal = p2.startsWith('N-') ? p2.slice(2) : (p1.startsWith('N-') ? p1.slice(2) : p2);
          return transit === tName && natal === nName;
        });

        row.push({
          isHeader: false,
          aspect: aspect ? {
            ...aspect,
            symbol: ASPECT_CONFIG[aspect.type]?.symbol || '',
            color: ASPECT_CONFIG[aspect.type]?.color || 'var(--paper-400)',
            orbText: this.formatOrb(aspect.orb)
          } : null
        });
      });

      matrix.push(row);
    });

    return matrix;
  },

  prepareTechnicalData(tech) {
    if (!tech) return null;

    return {
      transitPlanets: tech.transit_planets.map(p => ({
        ...p,
        signId: p.sign,
        zhName: this.translate(p.name),
        zhSign: this.translate(p.sign),
        meta: this.getPlanetMeta(p.name),
        signMeta: this.getSignMeta(p.sign),
        signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
        degreeText: this.formatDegree(p.degree, p.minute)
      })),
      transitAsteroids: tech.transit_asteroids.map(p => ({
        ...p,
        signId: p.sign,
        zhName: this.translate(p.name),
        zhSign: this.translate(p.sign),
        meta: this.getPlanetMeta(p.name),
        signMeta: this.getSignMeta(p.sign),
        signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
        degreeText: this.formatDegree(p.degree, p.minute)
      })),
      houseRulers: tech.house_rulers.map(r => ({
        ...r,
        signId: r.sign,
        fliesToSignId: r.fliesToSign,
        zhSign: this.translate(r.sign),
        zhRuler: this.translate(r.ruler),
        zhFliesToSign: this.translate(r.fliesToSign),
        rulerMeta: this.getPlanetMeta(r.ruler),
        signMeta: this.getSignMeta(r.sign),
        fliesToSignMeta: this.getSignMeta(r.fliesToSign),
        signIcon: `/images/astro-symbols/${(r.sign || 'aries').toLowerCase()}.png`,
        fliesToSignIcon: `/images/astro-symbols/${(r.fliesToSign || 'aries').toLowerCase()}.png`
      })),
      aspectMatrix: this.buildAspectMatrix(tech.cross_aspects),
      crossAspects: tech.cross_aspects || []
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

  translateDetailType(type) {
    const map = {
      chart: '行运星盘',
      aspects: '相位矩阵',
      planets: '行运行星',
      asteroids: '小行星',
      rulers: '宫主星',
      career: '事业运',
      wealth: '财运',
      love: '爱情运',
      health: '健康运'
    };
    return map[type] || '详情';
  }
});

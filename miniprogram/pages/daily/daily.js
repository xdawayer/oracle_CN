const { request, requestStream } = require('../../utils/request');
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
    weekRangeTitle: '',
    weeklyEvents: [],
    weeklyDescriptions: [],
    transits: [],
    transitChartData: {
      innerPositions: [],
      outerPositions: [],
      aspects: [],
      houseCusps: []
    },
    technical: null,
    transitReady: false,
    selectedPlanet: null,
    detailContentMap: {},
    showReport: false,
    reportData: null,
    detailCard: null,
    monthlyEntryTitle: '',
    monthlyColorClass: '',
    monthlyReportStatus: 'none',
    monthlyReportProgress: 0,
    // 支付弹窗
    showPayment: false,
    paymentLoading: false,
    paymentMeta: null,
  },

  _monthlyPollTimer: null,

  onLoad() {
    this.initDates();
    this.initMonthlyEntry();
    this.loadProfile();
    this.handleGenerate();
  },

  onShow() {
    // 页面显示时重新检查月度报告状态
    if (this._monthlyYear) {
      this.checkMonthlyReportStatus();
    }
  },

  onHide() {
    this._stopMonthlyPolling();
  },

  onUnload() {
    this._stopMonthlyPolling();
  },

  initMonthlyEntry() {
    const now = new Date();
    const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const monthIndex = now.getMonth(); // 0-11
    const monthName = monthNames[monthIndex];
    this._monthlyYear = now.getFullYear();
    this._monthlyMonth = monthIndex + 1;
    this.setData({
      monthlyEntryTitle: `${monthName}月度深度解读`,
      monthlyColorClass: `month-${monthIndex + 1}`,
    });
    // 延迟检查月度报告状态（等 profile 加载完成）
    setTimeout(() => this.checkMonthlyReportStatus(), 500);
  },

  _getMonthlyBirth() {
    if (!this.userProfile) return null;
    return {
      date: this.userProfile.birthDate,
      time: this.userProfile.birthTime || '12:00',
      city: this.userProfile.birthCity || '',
      lat: this.userProfile.lat,
      lon: this.userProfile.lon,
      timezone: this.userProfile.timezone || 'Asia/Shanghai',
      accuracy: this.userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };
  },

  async checkMonthlyReportStatus() {
    const birth = this._getMonthlyBirth();
    if (!birth) return;

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_STATUS,
        method: 'GET',
        data: {
          reportType: 'monthly',
          birth: JSON.stringify(birth),
        },
      });

      if (result && result.exists) {
        this.setData({
          monthlyReportStatus: result.status,
          monthlyReportProgress: result.progress || 0,
        });
        if (result.status === 'processing' || result.status === 'pending') {
          this._startMonthlyPolling();
        }
      }
    } catch (e) {
      // 静默处理，状态保持 none
    }
  },

  _startMonthlyPolling() {
    this._stopMonthlyPolling();
    this._monthlyPolling = true;
    this._monthlyPollOnce();
  },

  _stopMonthlyPolling() {
    this._monthlyPolling = false;
    if (this._monthlyPollTimer) {
      clearTimeout(this._monthlyPollTimer);
      this._monthlyPollTimer = null;
    }
  },

  async _monthlyPollOnce() {
    if (!this._monthlyPolling) return;
    await this.checkMonthlyReportStatus();
    const status = this.data.monthlyReportStatus;
    if (status === 'completed' || status === 'failed' || status === 'none') {
      this._monthlyPolling = false;
      return;
    }
    if (this._monthlyPolling) {
      this._monthlyPollTimer = setTimeout(() => this._monthlyPollOnce(), 5000);
    }
  },

  onOpenMonthlyReport() {
    if (!this.userProfile) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    const { monthlyReportStatus } = this.data;

    switch (monthlyReportStatus) {
      case 'none':
        this._showMonthlyPayment();
        break;
      case 'pending':
      case 'processing':
      case 'completed':
        wx.navigateTo({ url: '/pages/report/report?reportType=monthly' });
        break;
      case 'failed':
        wx.showModal({
          title: '生成失败',
          content: '报告生成过程中出现错误，是否重试？',
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this._retryMonthlyReport();
          },
        });
        break;
      default:
        this._showMonthlyPayment();
    }
  },

  // ========== 支付弹窗 ==========

  _showMonthlyPayment() {
    const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const monthName = monthNames[(this._monthlyMonth || 1) - 1];
    this.setData({
      showPayment: true,
      paymentMeta: {
        title: `${monthName}月度深度解读`,
        subtitle: '专属月度深度解读',
        features: [
          { title: '月度总览', desc: '当月主题与能量走向' },
          { title: '重点领域', desc: '事业、感情、健康等月度指引' },
          { title: '关键时间点', desc: '本月重要节点与应对建议' },
          { title: '行动指南', desc: '本月能量提升与成长方向' },
        ],
        price: 200,
        note: '约 3000-5000 字深度解读，永久保存',
      },
    });
  },

  closePayment() {
    this.setData({ showPayment: false, paymentLoading: false });
  },

  async handlePay() {
    this.setData({ paymentLoading: true });

    const birth = this._getMonthlyBirth();
    if (!birth) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      this.setData({ paymentLoading: false });
      return;
    }

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_CREATE,
        method: 'POST',
        data: {
          reportType: 'monthly',
          birth,
          year: this._monthlyYear,
          month: this._monthlyMonth,
          lang: 'zh',
        },
      });

      if (result && result.success !== false) {
        this.closePayment();
        this.setData({
          monthlyReportStatus: result?.status || 'processing',
          monthlyReportProgress: 0,
        });
        this._startMonthlyPolling();

        if (result.isNew) {
          wx.showModal({
            title: '任务已创建',
            content: '报告将在后台生成，预计需要数分钟。\n\n生成完成后可在此页面查看。',
            showCancel: false,
            confirmText: '知道了',
          });
        } else if (result.status === 'completed') {
          wx.navigateTo({ url: '/pages/report/report?reportType=monthly' });
        } else if (result.status === 'processing') {
          wx.showToast({ title: '报告正在生成中...', icon: 'loading' });
        }
      } else {
        wx.showToast({ title: result?.error || '创建任务失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Monthly] Create task failed:', err);
      wx.showToast({ title: '创建任务失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ paymentLoading: false });
    }
  },

  async _retryMonthlyReport() {
    const birth = this._getMonthlyBirth();
    if (!birth) return;

    wx.showLoading({ title: '正在重试...' });
    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_RETRY,
        method: 'POST',
        data: { reportType: 'monthly', birth },
      });
      wx.hideLoading();
      if (result && result.success) {
        this.setData({ monthlyReportStatus: 'processing', monthlyReportProgress: 0 });
        wx.showToast({ title: '重试任务已启动', icon: 'success' });
        this._startMonthlyPolling();
      } else {
        wx.showToast({ title: result?.error || '重试失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '重试失败', icon: 'none' });
    }
  },

  initDates() {
    const dates = [];
    const today = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = -2; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isNewMonth = d.getMonth() !== today.getMonth();
      dates.push({
        fullDate: d,
        day: d.getDate(),
        monthPrefix: isNewMonth ? `${d.getMonth() + 1}月` : '',
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

  getCacheKey(dateStr, full) {
    if (!this.userProfile) return null;
    const { birthDate, birthTime, birthCity } = this.userProfile;
    const suffix = full ? '_full' : '';
    return `daily_cache_${birthDate}_${birthTime}_${birthCity}_${dateStr}_zh${suffix}`;
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
      transitReady: false,
      selectedPlanet: null,
      detailContentMap: {},
      showReport: false,
      reportData: null,
      detailCard: null
    });
    this.handleGenerate();
  },

  getTransitCacheKey(dateStr) {
    if (!this.userProfile) return null;
    const { birthDate, birthTime, birthCity } = this.userProfile;
    return `daily_transit_cache_${birthDate}_${birthTime}_${birthCity}_${dateStr}`;
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

      // 1. 优先检查 /full 缓存（含 AI 内容）
      const fullCacheKey = this.getCacheKey(dateStr, true);
      const cachedFull = storage.get(fullCacheKey);
      if (cachedFull) {
        this.processFullData(cachedFull, dateStr);
        return;
      }

      // 2. 检查旧版缓存（向后兼容）
      const legacyCacheKey = this.getCacheKey(dateStr, false);
      const cachedLegacy = storage.get(legacyCacheKey);
      if (cachedLegacy) {
        this.processDailyData(cachedLegacy, dateStr);
        return;
      }

      // 3. 构建请求参数
      const query = this.buildDailyParams(dateStr);
      if (!query) {
        this.setData({ status: LoadingState.ERROR });
        return;
      }

      // 4. 并行发起 /transit（快，~50ms）和 /full（慢，含 AI）
      const transitCacheKey = this.getTransitCacheKey(dateStr);
      const cachedTransit = transitCacheKey ? storage.get(transitCacheKey) : null;

      const transitPromise = cachedTransit
        ? Promise.resolve(cachedTransit)
        : request({ url: `${API_ENDPOINTS.DAILY_TRANSIT}?${query}`, method: 'GET' }).catch(err => {
            console.warn('[Daily] /transit failed:', err);
            return null;
          });

      const canChunked = wx.canIUse && wx.canIUse('request.object.enableChunked');
      const streamState = { chart: null, forecast: null, detail: null };

      const fullPromise = canChunked
        ? new Promise((resolve) => {
            requestStream({
              url: `${API_ENDPOINTS.DAILY_FULL_STREAM}?${query}`,
              method: 'GET',
              onMeta: (meta) => {
                if (meta && meta.chart && !this.data.transitReady) {
                  const transitChartData = this.prepareTransitChartData(meta.chart);
                  const technical = this.prepareTechnicalData(meta.chart.technical);
                  const transits = meta.chart.transits?.positions || [];
                  this.setData({
                    transitReady: true,
                    transits,
                    transitChartData,
                    technical
                  });
                }
                streamState.chart = meta?.chart || streamState.chart;
              },
              onModule: (evt) => {
                if (!evt || !evt.moduleId) return;
                if (evt.moduleId === 'forecast') {
                  streamState.forecast = evt.content || null;
                } else if (evt.moduleId === 'detail') {
                  streamState.detail = evt.content || null;
                }
                if (streamState.chart && streamState.forecast) {
                  this.processFullData(streamState, dateStr);
                }
              },
              onDone: () => resolve(streamState.chart && streamState.forecast ? streamState : null),
              onError: (err) => {
                console.warn('[Daily] /full/stream failed:', err);
                resolve(null);
              },
            });
          })
        : request({ url: `${API_ENDPOINTS.DAILY_FULL}?${query}`, method: 'GET' }).catch(err => {
            console.warn('[Daily] /full failed:', err);
            return null;
          });

      // 5. /transit 先到 → 立即渲染行运图表和技术数据（保持 LOADING，等 AI 内容）
      const transitResult = await transitPromise;
      if (transitResult) {
        // 缓存 transit 数据
        if (transitCacheKey && !cachedTransit) {
          storage.set(transitCacheKey, transitResult);
        }
        // 立即渲染行运图表（不含 AI 预测，状态保持 LOADING）
        const transitChartData = this.prepareTransitChartData(transitResult);
        const technical = this.prepareTechnicalData(transitResult.technical);
        const transits = transitResult.transits?.positions || [];
        this.setData({
          transitReady: true,
          transits,
          transitChartData,
          technical
        });
      }

      // 6. /full 到达 → 填充 AI 预测内容
      const fullResult = await fullPromise;

      if (fullResult) {
        storage.set(fullCacheKey, fullResult);
        this.processFullData(fullResult, dateStr);
        return;
      }

      // 7. /full 失败 → fallback 到旧 /api/daily 端点
      try {
        const result = await request({
          url: `${API_ENDPOINTS.DAILY_FORECAST}?${query}`,
          method: 'GET'
        });

        if (result) {
          storage.set(legacyCacheKey, result);
          this.processDailyData(result, dateStr);
        } else if (transitResult) {
          // AI 全部失败但 transit 已渲染，标记为 SUCCESS 展示图表
          this.setData({ status: LoadingState.SUCCESS });
        } else {
          this.setData({ status: LoadingState.ERROR });
        }
      } catch (legacyErr) {
        console.error('[Daily] Legacy fallback failed:', legacyErr);
        if (transitResult) {
          this.setData({ status: LoadingState.SUCCESS });
        } else {
          this.setData({ status: LoadingState.ERROR });
        }
      }

    } catch (e) {
      console.error(e);
      this.setData({ status: LoadingState.ERROR });
    }
  },

  /**
   * 处理 /api/daily/full 响应
   * 从 full 响应中提取 forecast、detail、chart 数据
   */
  processFullData(fullResult, dateStr) {
    // 将 /full 响应转换为与旧版 /api/daily 兼容的格式传入 processDailyData
    const chart = fullResult.chart || {};
    const forecastData = fullResult.forecast || {};
    const detailData = fullResult.detail || {};

    // 构造与旧版兼容的结构
    const compatResult = {
      content: forecastData.content || forecastData || null,
      natal: chart.natal || null,
      transits: chart.transits || null,
      technical: chart.technical || null
    };

    // 预缓存 detail 内容，当用户打开 detail 时直接使用
    const detailContent = detailData.content || detailData || null;
    if (detailContent) {
      this._prefetchedDetail = {
        dateStr: dateStr,
        content: detailContent
      };
    }

    this.processDailyData(compatResult, dateStr);
  },

  processDailyData(result, dateStr) {
    const forecast = result && result.content ? result.content : null;
    const currentDateStr = this.formatDateLabel(dateStr);
    const overviewSummary = forecast?.summary || forecast?.theme_explanation || forecast?.theme_title || forecast?.share_text || '';

    // 如果 transit 已先到并渲染了图表，保留已有数据；否则从本次结果提取
    const hasTransitData = this.data.transitReady;
    const transits = hasTransitData
      ? this.data.transits
      : (result && result.transits && result.transits.positions ? result.transits.positions : []);
    const transitChartData = hasTransitData
      ? this.data.transitChartData
      : this.prepareTransitChartData(result);
    const technical = hasTransitData
      ? this.data.technical
      : this.prepareTechnicalData(result.technical);

    // 适配四个指数维度（事业/财运/爱情/健康）
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
    const weekRangeTitle = this.formatWeekRangeTitle(weekRange);
    const weeklyDescriptions = this.buildWeeklyDescriptions(weeklyScores, weeklyEvents, weekRangeTitle);

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
      weekRangeTitle,
      weeklyEvents,
      weeklyDescriptions,
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

  formatWeekRangeTitle(weekRange) {
    if (!weekRange) return '';
    const raw = String(weekRange).replace(/\s+/g, '');
    if (raw.includes('月')) return raw;
    const parts = raw.split('-');
    if (parts.length !== 2) return raw;
    const parsePart = (part) => {
      const match = part.match(/(\d{1,2})\/(\d{1,2})/);
      if (!match) return part;
      return `${match[1]}月${match[2]}日`;
    };
    return `${parsePart(parts[0])}-${parsePart(parts[1])}`;
  },

  normalizeEnergyLabel(label) {
    const raw = String(label || '').replace(/[⭐🌙⚡⚠️]/g, '').trim();
    return raw || '平稳';
  },

  buildAdvice(forecast) {
    const fallbackDo = forecast?.strategy?.best_use || '';
    const fallbackDont = forecast?.strategy?.avoid || '';
    const advice = forecast?.advice || {};
    const stripPrefix = (str) => str.replace(/^[宜忌]\s*/, '');
    return {
      do: {
        title: stripPrefix(advice.do?.title || fallbackDo),
        details: Array.isArray(advice.do?.details) ? advice.do.details : []
      },
      dont: {
        title: stripPrefix(advice.dont?.title || fallbackDont),
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

  // 标准化日期为 YYYY-MM-DD 格式
  normalizeDate(dateStr) {
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return String(dateStr);
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 校验日期是否在指定参考日期所在周范围内（周一到周日）
  isDateInWeek(dateStr, refDateStr) {
    if (!dateStr) return false;
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return false;
    const ref = refDateStr ? new Date(refDateStr) : new Date();
    if (Number.isNaN(ref.getTime())) return false;
    const dayOfWeek = ref.getDay();
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    // 如果目标日期在参考日所在周内，或在前后各1天的容差内（应对AI日期偏差）
    return target >= monday && target <= sunday;
  },

  buildWeeklyScores(forecast, dateStr) {
    if (!forecast) return [];
    const weeklyTrend = forecast.weekly_trend || forecast.weeklyTrend || {};
    const raw = weeklyTrend.dailyScores || weeklyTrend.daily_scores || forecast.weekly_scores || [];
    if (!Array.isArray(raw)) return [];
    const normalizedDateStr = this.normalizeDate(dateStr);
    // 直接使用 AI 返回的周数据，不再过滤日期范围
    // AI 已根据请求日期生成对应周的趋势
    return raw
      .map((item) => {
        const score = Number.isFinite(item.score) ? item.score : 0;
        const label = String(item.label || item.tag || item.event_label || '').replace(/[⭐🌙⚡⚠️]/g, '').trim();
        const date = this.normalizeDate(item.date);
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
          isToday: date === normalizedDateStr,
          barColor: date === normalizedDateStr ? 'var(--accent)' : 'var(--paper-200)'
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

  buildWeeklyDescriptions(weeklyScores, weeklyEvents, weekRangeTitle) {
    if (!Array.isArray(weeklyScores) || weeklyScores.length === 0) return [];
    const eventMap = new Map();
    (weeklyEvents || []).forEach((item) => {
      if (item?.date) eventMap.set(String(item.date), item);
    });

    return weeklyScores.map((item, idx) => {
      const date = item.date || '';
      const dateLabel = this.formatWeekDayLabel(date, weekRangeTitle, item.day);
      const event = eventMap.get(String(date)) || null;
      const title = item.label || event?.label || '平稳';
      const defaultDescs = [
        '保持稳定节奏，按计划推进即可。',
        '适合做规律性的事务，稳中求进。',
        '节奏平和，可以安排日常事务。',
        '维持现有步调，不急不躁。',
        '平稳度过，留意细节即可。',
        '按部就班推进，注意劳逸结合。',
        '整体平顺，适合处理常规工作。'
      ];
      const description = event?.description || item.description || item.detail || defaultDescs[idx % defaultDescs.length];
      const isSpecial = Boolean(event?.label || title.includes('周期') || description.includes('周期'));
      return {
        dateLabel,
        title,
        description,
        isSpecial
      };
    });
  },

  formatWeekDayLabel(dateStr, weekRangeTitle, fallbackDay) {
    if (!dateStr) return fallbackDay || '';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
  },

  onPlanetDetail(e) {
    const detail = e?.detail;
    if (!detail) return;
    this.setData({ selectedPlanet: detail });
  },

  closePlanetDetail() {
    this.setData({ selectedPlanet: null }, () => {
      setTimeout(() => {
        const chartComp = this.selectComponent('.chart-wrapper astro-chart');
        if (chartComp && chartComp.redraw) {
          chartComp.redraw();
        }
      }, 50);
    });
  },

  stopProp() {},

  closeDetailCard() {
    this.setData({ detailCard: null });
  },

  closeReport() {
    this.setData({ showReport: false, reportData: null }, () => {
      // 弹窗关闭后延迟重绘 Canvas，确保节点已挂载
      setTimeout(() => {
        const query = wx.createSelectorQuery();
        query.select('#transitChart')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res && res[0]?.node) {
              const chartComp = this.selectComponent('.chart-wrapper astro-chart');
              if (chartComp && chartComp.redraw) {
                chartComp.redraw();
              }
            }
          });
      }, 50);
    });
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

    const reportData = this.buildReportData(type, detailContent);
    if (reportData) {
      this.setData({ reportData, showReport: true, detailCard: null });
    } else {
      wx.showToast({ title: '暂无解读内容', icon: 'none' });
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

  buildChartDataForType(type) {
    const tech = this.data.technical || {};
    if (type === 'planets') return tech.transitPlanets || null;
    if (type === 'asteroids') return tech.transitAsteroids || null;
    if (type === 'rulers') return tech.houseRulers || null;
    if (type === 'aspects') return tech.crossAspects || null;
    return null;
  },

  buildDetailPayload(type, dateStr) {
    if (!this.userProfile) return null;
    const apiType = this.resolveDetailType(type);
    if (!apiType) return null;
    const chartData = this.buildChartDataForType(type);
    return {
      type: apiType,
      context: 'transit',
      lang: 'zh',
      date: dateStr,
      dimension: apiType === 'dimension' ? type : undefined,
      chartData: chartData || undefined,
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

    // 检查 /full 预缓存的 detail 数据
    // 预缓存的是 daily-detail prompt 的输出，仅适用于 'chart' 类型
    // 四维指数和技术类型（planets/aspects/asteroids/rulers）需要独立的 detail API 调用
    const canUsePrefetch = (type === 'chart');
    if (canUsePrefetch && this._prefetchedDetail && this._prefetchedDetail.dateStr === dateStr && this._prefetchedDetail.content) {
      const prefetched = this._prefetchedDetail.content;
      const detailForType = prefetched[type] || prefetched;
      if (detailForType && Object.keys(detailForType).length > 0) {
        if (cacheKey) {
          storage.set(cacheKey, { content: detailForType });
          this.setData({ [`detailContentMap.${cacheKey}`]: detailForType });
        }
        return detailForType;
      }
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

  buildReportData(type, detail) {
    if (!detail) return null;
    const titleBase = this.translateDetailType(type);
    const subtitle = this.data.currentDateStr || '';
    const data = detail || {};
    const rawTitle = data.title || titleBase;
    const reportTitle = this.normalizeReportTitle(rawTitle, type, titleBase);
    const sections = [];
    const addSection = (title, text, list, cardColor) => {
      if (!title) return;
      const hasText = text && String(text).trim();
      const hasList = Array.isArray(list) && list.length > 0;
      if (!hasText && !hasList) return;
      sections.push({
        title,
        text: hasText ? String(text).trim() : '',
        list: hasList ? list : [],
        cardColor: cardColor || 'default'
      });
    };

    if (['career', 'wealth', 'love', 'health'].includes(type)) {
      addSection('核心解读', data.summary || '', null, 'accent-red');
      const aspectList = Array.isArray(data.key_aspects)
        ? data.key_aspects.map((item) => `${item.aspect}：${item.meaning}`)
        : [];
      addSection('关键相位', '', aspectList, 'info');
      addSection('机会', '', data.opportunities || [], 'success');
      addSection('挑战', '', data.challenges || [], 'warning');
      addSection('行动建议', '', data.actions || [], 'success');
      addSection('自问提示', data.reflection_question || '', null, 'accent-red');
      return { title: reportTitle, subtitle, sections };
    }

    if (type === 'chart') {
      // 农历信息
      if (data.lunar_info) {
        const li = data.lunar_info;
        const lunarParts = [li.lunar_date, li.solar_term, li.traditional_meaning].filter(Boolean).join(' · ');
        addSection('农历', lunarParts, null, 'default');
      }
      // 天象气象
      if (data.sky_weather) {
        const sw = data.sky_weather;
        const swParts = [
          sw.overall_tone || '',
          sw.energy_quality || '',
          sw.dominant_element ? `主导元素：${sw.dominant_element}` : '',
          sw.dominant_modality ? `主导模式：${sw.dominant_modality}` : ''
        ].filter(Boolean).join('\n');
        addSection('天象气象', swParts, null, 'accent-red');
      }
      // 重要周期配置
      if (Array.isArray(data.major_configurations)) {
        data.major_configurations.forEach(cfg => {
          const planets = Array.isArray(cfg.planets_involved) ? cfg.planets_involved.join('、') : '';
          const text = [cfg.description, planets ? `相关行星：${planets}` : '', cfg.how_to_use ? `利用方式：${cfg.how_to_use}` : ''].filter(Boolean).join('\n');
          addSection(cfg.name || '周期配置', text, null, 'info');
        });
      }
      // 行运亮点
      if (Array.isArray(data.transit_highlights)) {
        const hlList = data.transit_highlights.map(h => {
          const time = h.exact_time ? `[${h.exact_time}]` : '';
          return `${h.aspect || ''} ${time}：${h.impact || ''}`.trim();
        });
        addSection('关键行运', '', hlList, 'info');
      }
      // 个人影响
      if (data.personal_impact) {
        const pi = data.personal_impact;
        const piParts = [
          pi.most_affected_house ? `最受影响宫位：${pi.most_affected_house}` : '',
          pi.theme || '',
          pi.opportunity ? `机会：${pi.opportunity}` : '',
          pi.challenge ? `挑战：${pi.challenge}` : '',
          pi.advice || ''
        ].filter(Boolean).join('\n');
        addSection('个人影响', piParts, null, 'accent-red');
      }
      // 时间建议
      if (data.timing_notes) {
        const tn = data.timing_notes;
        const bestList = Array.isArray(tn.best_times) ? tn.best_times : [];
        const cautionList = Array.isArray(tn.caution_times) ? tn.caution_times : [];
        if (bestList.length) addSection('最佳时段', '', bestList, 'success');
        if (cautionList.length) addSection('谨慎时段', '', cautionList, 'warning');
        if (tn.moon_void) addSection('月亮空亡', tn.moon_void, null, 'default');
      }
      // 技术数据
      if (data.technical_data) {
        const td = data.technical_data;
        const tdParts = [
          td.sun_position ? `太阳：${td.sun_position}` : '',
          td.moon_position ? `月亮：${td.moon_position}` : '',
          td.mercury_status ? `水星：${td.mercury_status}` : '',
          td.venus_status ? `金星：${td.venus_status}` : '',
          td.mars_status ? `火星：${td.mars_status}` : ''
        ].filter(Boolean).join('\n');
        addSection('行星状态', tdParts, null, 'default');
      }
      // 兼容旧格式
      if (!data.sky_weather && !data.personal_impact) {
        addSection('今日摘要', data.summary || '', null, 'accent-red');
        addSection('深度解读', data.deep_dive || '', null, 'default');
        const highlightList = Array.isArray(data.highlights)
          ? data.highlights.map((item) => `${item.title}：${item.description}`)
          : [];
        addSection('关键亮点', '', highlightList, 'info');
        addSection('注意事项', data.caution || '', null, 'warning');
        addSection('行动建议', data.action || '', null, 'success');
      }
      return { title: reportTitle, subtitle, sections };
    }

    if (type === 'aspects') {
      // 整体天气
      if (data.overall_weather) {
        const ow = data.overall_weather;
        const owText = [ow.tone ? `氛围：${ow.tone}` : '', ow.summary || ''].filter(Boolean).join('\n');
        addSection('能量天气', owText, null, 'accent-red');
      }
      // 今日焦点
      if (data.today_highlight) {
        const th = data.today_highlight;
        const thText = [th.main_aspect || '', th.why_important || '', th.how_to_use ? `利用方式：${th.how_to_use}` : ''].filter(Boolean).join('\n');
        addSection('今日焦点', thText, null, 'accent-red');
      }
      // 活跃行运
      if (Array.isArray(data.active_transits) && data.active_transits.length) {
        data.active_transits.forEach(at => {
          const header = [at.transit_planet, at.aspect, at.natal_planet].filter(Boolean).join(' ');
          const parts = [
            at.exactness ? `状态：${at.exactness}` : '',
            at.intensity ? `强度：${'★'.repeat(at.intensity)}` : '',
            at.interpretation || ''
          ].filter(Boolean).join('\n');
          addSection(header || '行运相位', parts, null, 'info');
        });
      }
      // 支持性相位
      if (data.supportive_aspects) {
        const sa = data.supportive_aspects;
        const saList = Array.isArray(sa.aspects) ? sa.aspects : [];
        const saText = sa.opportunity || '';
        if (saList.length || saText) addSection('支持能量', saText, saList, 'success');
      }
      // 挑战性相位
      if (data.challenging_aspects) {
        const ca = data.challenging_aspects;
        const caList = Array.isArray(ca.aspects) ? ca.aspects : [];
        const caText = ca.advice || '';
        if (caList.length || caText) addSection('挑战能量', caText, caList, 'warning');
      }
      // 兼容旧格式
      if (!data.overall_weather && !data.active_transits) {
        addSection('总体解读', data.summary || '', null, 'accent-red');
        const keyList = Array.isArray(data.key_aspects)
          ? data.key_aspects.map((item) => `${item.aspect}：${item.impact}｜${item.advice}`)
          : [];
        addSection('关键相位', '', keyList, 'info');
        addSection('能量流向', '', data.energy_flow || [], 'default');
        addSection('宜做', '', data.do_dont?.do || [], 'success');
        addSection('忌做', '', data.do_dont?.dont || [], 'warning');
      }
      return { title: reportTitle, subtitle, sections };
    }

    if (type === 'planets') {
      const formatPlanets = (planets, label, color) => {
        if (!Array.isArray(planets) || !planets.length) return;
        planets.forEach(p => {
          const header = [p.planet, p.current_sign, p.current_degree, p.natal_house ? `${p.natal_house}宫` : '', p.status || ''].filter(Boolean).join(' · ');
          const text = p.today_influence || p.long_term_theme || '';
          const extra = p.affected_area ? `影响领域：${p.affected_area}` : (p.current_phase || '');
          const fullText = [text, extra].filter(Boolean).join('\n');
          addSection(header || label, fullText, null, color);
        });
      };
      formatPlanets(data.fast_planets, '快速行星', 'info');
      formatPlanets(data.slow_planets, '慢速行星', 'default');
      if (data.retrograde_alert) {
        const rx = data.retrograde_alert;
        const rxList = Array.isArray(rx.planets_rx) ? rx.planets_rx : [];
        const rxText = [rxList.length ? `逆行行星：${rxList.join('、')}` : '', rx.advice || ''].filter(Boolean).join('\n');
        addSection('逆行提醒', rxText, null, 'warning');
      }
      if (data.moon_report) {
        const m = data.moon_report;
        const moonParts = [
          m.sign ? `月亮${m.sign}` : '',
          m.phase || '',
          m.emotional_tone ? `情绪基调：${m.emotional_tone}` : '',
          m.best_activity ? `最佳活动：${m.best_activity}` : '',
          m.void_times ? `空亡时段：${m.void_times}` : ''
        ].filter(Boolean).join('\n');
        addSection('月亮报告', moonParts, null, 'accent-red');
      }
      // 兼容旧格式
      if (!data.fast_planets && !data.slow_planets) {
        addSection('总体解读', data.summary || '', null, 'accent-red');
        addSection('关键要点', '', data.highlights || [], 'info');
        addSection('详细解读', data.interpretation || '', null, 'default');
      }
      return { title: reportTitle, subtitle, sections };
    }

    if (type === 'asteroids') {
      const asteroidDefs = [
        { key: 'chiron_transit', name: '凯龙星', color: 'accent-red' },
        { key: 'juno_transit', name: '婚神星', color: 'info' },
        { key: 'pallas_transit', name: '智神星', color: 'success' },
        { key: 'ceres_transit', name: '谷神星', color: 'warning' }
      ];
      asteroidDefs.forEach(def => {
        const a = data[def.key];
        if (!a) return;
        const header = [def.name, a.current_position || ''].filter(Boolean).join(' · ');
        const parts = [
          a.natal_aspect ? `本命相位：${a.natal_aspect}` : '',
          a.theme || '',
          a.self_care_tip || a.relationship_tip || a.strategy_tip || a.nurture_tip || ''
        ].filter(Boolean).join('\n');
        addSection(header, parts, null, def.color);
      });
      if (data.most_active) {
        const ma = data.most_active;
        const text = [ma.reason || '', ma.focus ? `今日关注：${ma.focus}` : ''].filter(Boolean).join('\n');
        addSection(`今日最活跃：${ma.asteroid || ''}`, text, null, 'accent-red');
      }
      // 兼容旧格式
      if (!data.chiron_transit && !data.juno_transit) {
        const focusList = Array.isArray(data.focus_asteroids)
          ? data.focus_asteroids.map((item) => {
            const houseText = Number.isFinite(item.house) ? `· ${item.house}宫` : '';
            return `${item.name} ${item.sign} ${houseText}：${item.theme}｜${item.influence}`.trim();
          })
          : [];
        addSection('重点小行星', '', focusList, 'info');
        if (data.chiron_focus) {
          const cf = data.chiron_focus;
          const chironText = [cf.theme, cf.healing_path, cf.warning ? `提醒：${cf.warning}` : ''].filter(Boolean).join('\n');
          addSection('凯龙星主题', chironText, null, 'accent-red');
        }
        addSection('行动建议', '', data.suggestions || [], 'success');
      }
      return { title: reportTitle, subtitle, sections };
    }

    if (type === 'rulers') {
      if (data.chart_ruler_status) {
        const cr = data.chart_ruler_status;
        const crParts = [
          cr.today_aspects?.length ? `今日相位：${cr.today_aspects.join('、')}` : '',
          cr.energy_level ? `能量状态：${cr.energy_level}` : '',
          cr.advice || ''
        ].filter(Boolean).join('\n');
        addSection(`命主星：${cr.planet || ''}`, crParts, null, 'accent-red');
      }
      if (Array.isArray(data.activated_rulers)) {
        data.activated_rulers.forEach(r => {
          const header = `${r.natal_house || ''}宫 · ${r.ruler || ''}`;
          const parts = [
            r.transit_trigger ? `触发：${r.transit_trigger}` : '',
            r.theme || '',
            r.manifestation ? `表现：${r.manifestation}` : ''
          ].filter(Boolean).join('\n');
          addSection(header, parts, null, 'info');
        });
      }
      if (Array.isArray(data.ruler_chains_activated)) {
        data.ruler_chains_activated.forEach(chain => {
          const text = [chain.trigger_point ? `触发点：${chain.trigger_point}` : '', chain.ripple_effect || ''].filter(Boolean).join('\n');
          addSection(chain.chain_description || '宫主星链', text, null, 'success');
        });
      }
      if (data.key_insight) {
        const ki = data.key_insight;
        const text = [ki.main_theme || '', ki.life_area_focus ? `关注领域：${ki.life_area_focus}` : '', ki.tip || ''].filter(Boolean).join('\n');
        addSection('关键洞察', text, null, 'warning');
      }
      // 兼容旧格式
      if (!data.chart_ruler_status && !data.activated_rulers) {
        addSection('总体提示', data.overview || '', null, 'accent-red');
        const deepList = Array.isArray(data.deep_focus)
          ? data.deep_focus.map((item) => `${item.title}：${item.description}`)
          : [];
        addSection('重点链条', '', deepList, 'info');
        const comboList = Array.isArray(data.combinations)
          ? data.combinations.map((item) => `第${item.from_house}宫→第${item.to_house}宫：${item.theme}（${item.suggestion}）`)
          : [];
        addSection('宫位联动', '', comboList, 'success');
        const rulerList = Array.isArray(data.rulers)
          ? data.rulers.map((item) => `第${item.house}宫 ${item.sign}｜${item.ruler} → 第${item.flies_to_house}宫 ${item.flies_to_sign}：${item.theme}（${item.advice}）`)
          : [];
        addSection('宫主星路径', '', rulerList, 'default');
      }
      return { title: reportTitle, subtitle, sections };
    }

    return null;
  },

  normalizeReportTitle(rawTitle, type, titleBase) {
    let title = String(rawTitle || '').trim();
    if (!title) title = String(titleBase || '').trim();
    if (!title) title = '洞察';

    title = title.replace(/的深度解读/g, '分析');
    title = title.replace(/深度解读/g, '分析');
    title = title.replace(/解读/g, '');
    title = title.replace(/\s+/g, '');

    if (type === 'chart' && title === '分析') {
      title = '今日周期';
    }

    if (title.length > 10) {
      title = title.slice(0, 10);
    }

    return title;
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

    const transitPlanets = Array.isArray(tech.transit_planets) ? tech.transit_planets : [];
    const transitAsteroids = Array.isArray(tech.transit_asteroids) ? tech.transit_asteroids : [];
    const houseRulers = Array.isArray(tech.house_rulers) ? tech.house_rulers : [];
    const crossAspects = Array.isArray(tech.cross_aspects) ? tech.cross_aspects : [];

    return {
      transitPlanets: transitPlanets.map(p => ({
        ...p,
        signId: p.sign,
        zhName: this.translate(p.name),
        zhSign: this.translate(p.sign),
        meta: this.getPlanetMeta(p.name),
        signMeta: this.getSignMeta(p.sign),
        signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
        degreeText: this.formatDegree(p.degree, p.minute)
      })),
      transitAsteroids: transitAsteroids.map(p => ({
        ...p,
        signId: p.sign,
        zhName: this.translate(p.name),
        zhSign: this.translate(p.sign),
        meta: this.getPlanetMeta(p.name),
        signMeta: this.getSignMeta(p.sign),
        signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
        degreeText: this.formatDegree(p.degree, p.minute)
      })),
      houseRulers: houseRulers.map(r => ({
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
      aspectMatrix: this.buildAspectMatrix(crossAspects),
      crossAspects
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

    // 内环：核心图谱位置
    const innerPositions = result.natal.positions || [];

    // 外环：行运位置
    const outerPositions = result.transits.positions || [];

    // 相位：跨盘相位（本命 vs 行运）
    const aspects = result.transits.aspects || [];

    // 宫位：核心图谱宫位
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
      chart: '行运图谱',
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

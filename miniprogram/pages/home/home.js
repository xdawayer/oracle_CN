const { request, getBaseUrl } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');
const logger = require('../../utils/logger');
const { isDev } = logger;
const { handleInsufficientCredits, creditsModalData, creditsModalMethods } = require('../../utils/credits');
const { buildDailyFullCacheKey, buildProfileFingerprint } = require('../../utils/tab-preloader');
const avatarBehavior = require('../../behaviors/avatar');

// 星座英文→中文名映射
const SIGN_CN = {
  Aries: '白羊座', Taurus: '金牛座', Gemini: '双子座', Cancer: '巨蟹座',
  Leo: '狮子座', Virgo: '处女座', Libra: '天秤座', Scorpio: '天蝎座',
  Sagittarius: '射手座', Capricorn: '摩羯座', Aquarius: '水瓶座', Pisces: '双鱼座'
};

const DEFAULT_PROFILE = {
  birthDate: '1989-10-31',
  birthTime: '22:00',
  birthCity: '北京',
  timezone: 'Asia/Shanghai',
  lat: 39.9042,
  lon: 116.4074,
  accuracyLevel: 'exact'
};

Page({
  behaviors: [avatarBehavior],
  data: {
    auditMode: false,
    greeting: '早安, 星语用户',
    currentDate: '',
    avatarUrl: '',
    shareData: {
      score: '--',
      quote: '加载中...',
      body: '正在获取今日洞察...',
      sunSign: '',
      lucky: {
        color: '--',
        number: '--',
        direction: '--'
      },
      date: ""
    },
    showShareModal: false,
    showPayment: false,
    paymentLoading: false,
    paymentMeta: {
      title: '2026 年度成长报告',
      subtitle: '专属年度深度解读',
      features: [
        { title: '年度总览', desc: '全年主题与趋势走向' },
        { title: '六大领域', desc: '事业、感情、健康、社交、成长、财运' },
        { title: '季度详解', desc: '四季节奏与关键时间点' },
        { title: '成长建议', desc: '个性化发展与提升建议' },
      ],
      price: 300,
      note: '约 8000-10000 字深度解读，永久保存',
    },
    isLoadingForecast: true,
    isForecastPending: false,
    isLoadingRecommendations: true,
    recommendations: [],

    // 年度报告任务状态
    annualTaskStatus: 'none', // none | pending | processing | completed | failed
    annualTaskProgress: 0,
    annualTaskMessage: '',

    ...creditsModalData,
  },

  onLoad() {
    this._alive = true;
    const app = getApp();
    this.setData({ auditMode: !!(app && app.globalData && app.globalData.auditMode) });
    if (app && typeof app.notifyTabActivated === 'function') {
      app.notifyTabActivated('home');
    }
    this.updateDate();
    this.loadUserProfile();
    this.loadHomeVisibleData();
  },

  onShow() {
    const app = getApp();
    if (app && typeof app.notifyTabActivated === 'function') {
      app.notifyTabActivated('home');
    }

    // 确保 tabBar 可见（防止 hideTabBar 后异常退出未恢复）
    if (!this.data.showPayment && wx.showTabBar) {
      wx.showTabBar({ animation: false });
    }

    // 初始加载尚未完成，不重复触发
    if (this._homeVisibleLoadPromise) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const jobs = [];

    // 先从 storage 刷新 profile，再检测变化
    this.loadUserProfile();

    // 跨天 → 刷新
    if (this._lastForecastDate && this._lastForecastDate !== today) {
      jobs.push(this.fetchDailyForecast());
    }
    // profile 变化 或 首次获取到 profile（从 onboarding 返回）→ 重新生成
    else if (this.userProfile) {
      const currentFp = this._lastProfileFingerprint || '';
      const newFp = buildProfileFingerprint(this.userProfile);
      if (newFp !== currentFp) {
        // currentFp 非空说明是资料变更（非首次），需要完整 loading 体验
        this._profileChanged = !!currentFp;
        jobs.push(this.fetchDailyForecast(!!currentFp));
      }
      // 仍处于初始加载状态 → 重试
      else if (this.data.isLoadingForecast || this.data.shareData.quote === '加载中...') {
        jobs.push(this.fetchDailyForecast());
      }
      // 上次请求失败（score 仍为 '--'）→ 自动重试
      else if (this.data.shareData.score === '--') {
        jobs.push(this.fetchDailyForecast());
      }
    } else if (!this.userProfile) {
      // 无 profile，不请求
    }

    jobs.push(this.checkAnnualReportAccess());

    Promise.allSettled(jobs).finally(() => {
      if (app && typeof app.markHomeVisibleReady === 'function') {
        app.markHomeVisibleReady();
      }
    });
  },

  onUnload() {
    this._alive = false;
    this._statusPolling = false;
    if (this._statusPollTimer) {
      clearTimeout(this._statusPollTimer);
      this._statusPollTimer = null;
    }
  },

  onPullDownRefresh() {
    // 下拉刷新：skipCache
    // fetchDailyForecast 在 transit 返回后 resolve（<500ms），AI 在后台继续
    // 这是预期行为：用户无需等待 AI 重试，卡片已用 transit 数据刷新
    Promise.all([
      this.fetchDailyForecast(true),
      this.initRecommendations()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    const { score, quote, date } = this.data.shareData;
    return {
      title: quote || `今日洞察 ${score}分`,
      path: '/pages/home/home',
    };
  },

  updateDate() {
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;
    const shareDateStr = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

    this.setData({
      currentDate: dateStr,
      'shareData.date': shareDateStr
    });
  },

  loadUserProfile() {
    const stored = storage.get('user_profile');
    if (!stored) {
      this.userProfile = null;
      return;
    }
    this.userProfile = { ...DEFAULT_PROFILE, ...stored };

    const updates = {};

    const avatarUrl = storage.get('user_avatar') || '';
    if (avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }

    const userName = stored.name || '星语用户';
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';
    updates.greeting = `${timeGreeting}, ${userName}`;

    this.setData(updates);
  },

  loadHomeVisibleData() {
    const app = getApp();
    const jobs = [
      this.fetchDailyForecast(),
      this.initRecommendations(),
      this.checkAnnualReportAccess(),
    ];

    this._homeVisibleLoadPromise = Promise.allSettled(jobs).finally(() => {
      this._homeVisibleLoadPromise = null;
      if (app && typeof app.markHomeVisibleReady === 'function') {
        app.markHomeVisibleReady();
      }
    });
  },

  /** 检查年度报告任务状态 */
  async checkAnnualReportAccess() {
    if (this._annualStatusPromise) {
      return this._annualStatusPromise;
    }

    this._annualStatusPromise = (async () => {
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
          url: '/api/annual-task/status',
          method: 'GET',
          data: { birth: JSON.stringify(birthData) },
          timeout: 120000,
        });

        if (result && result.exists) {
          this.setData({
            annualTaskStatus: result.status,
            annualTaskProgress: result.progress || 0,
            annualTaskMessage: result.message || '',
          });

          if (result.status === 'processing' || result.status === 'pending') {
            this._startStatusPolling();
          }
        } else {
          // pending/processing 可能是刚创建任务的竞态，保留当前状态
          const currentStatus = this.data.annualTaskStatus;
          if (currentStatus !== 'pending' && currentStatus !== 'processing') {
            this.setData({
              annualTaskStatus: 'none',
              annualTaskProgress: 0,
              annualTaskMessage: '',
            });
          }
        }
      } catch (error) {
        logger.log('Check annual task status:', error?.statusCode || error);
        // 网络出错时保留当前状态，不重置为 'none'
      }
    })().finally(() => {
      this._annualStatusPromise = null;
    });

    return this._annualStatusPromise;
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

    const status = this.data.annualTaskStatus;
    if (status !== 'processing' && status !== 'pending') {
      this._statusPolling = false;
      this._statusPollTimer = null;
      if (status === 'completed') {
        wx.showToast({ title: '报告已生成完成', icon: 'success' });
      }
      return;
    }

    if (this._statusPolling) {
      this._statusPollTimer = setTimeout(() => this._pollAnnualOnce(), 5000);
    }
  },

  buildDailyParams(date) {
    if (!this.userProfile) return '';

    const params = [];
    params.push(`birthDate=${encodeURIComponent(this.userProfile.birthDate || '')}`);
    params.push(`city=${encodeURIComponent(this.userProfile.birthCity || '')}`);
    params.push(`timezone=${encodeURIComponent(this.userProfile.timezone || '')}`);
    params.push(`accuracy=${encodeURIComponent(this.userProfile.accuracyLevel || '')}`);
    params.push(`date=${encodeURIComponent(date)}`);
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

  /** 序列号自增 + 清理残留 pending */
  _beginForecastTask() {
    this._forecastSeq = (this._forecastSeq || 0) + 1;
    if (this.userProfile) {
      const today = new Date().toISOString().slice(0, 10);
      const key = buildDailyFullCacheKey(this.userProfile, today);
      if (key) storage.remove(key + '_pending');
    }
    return this._forecastSeq;
  },

  /** 检查是否为最新请求 */
  _isLatestForecast(seq) {
    return this._alive && seq === this._forecastSeq;
  },

  /** 从 /full 响应中提取 shareData 并渲染卡片 */
  _renderCardFromFullResult(fullResult, today) {
    if (!this._alive) return;

    const forecastData = fullResult.forecast || {};
    const forecast = forecastData.content || forecastData;
    const chart = fullResult.chart || {};
    const lucky = fullResult.lucky || {};

    // 提取太阳星座
    const sunPos = chart.natal && chart.natal.positions
      ? chart.natal.positions.find(p => p.name === 'Sun')
      : null;
    const sunSign = sunPos ? (SIGN_CN[sunPos.sign] || sunPos.sign) : '';

    const quote = forecast.share_text || forecast.theme_title || '';
    const body = forecast.summary || forecast.theme_explanation || '';
    // 优先用 transit 确定性分数（与 daily 页一致），fallback 到 AI 生成的分数
    const score = lucky.score || forecast.overall_score || forecast.score || '--';

    const shareData = {
      score: String(score),
      quote: quote || '今日洞察已就绪',
      body: body || '',
      sunSign,
      lucky: {
        color: lucky.color || forecast.lucky_color || '--',
        number: lucky.number !== undefined ? String(lucky.number) : (forecast.lucky_number || '--'),
        direction: lucky.direction || forecast.lucky_direction || '--',
      },
      date: this.data.shareData.date
    };

    this.setData({
      isLoadingForecast: false,
      isForecastPending: false,
      shareData
    });

    this._lastForecastDate = today;
    this._lastProfileFingerprint = buildProfileFingerprint(this.userProfile);
  },

  /** 首页卡片专用缓存 key（与 daily 页面的 full 缓存分开） */
  _homeCardCacheKey(dateStr) {
    if (!this.userProfile) return null;
    return `home_card_${buildProfileFingerprint(this.userProfile)}_${dateStr}`;
  },

  /**
   * 从 /transit 确定性数据渲染卡片基础信息（分数/幸运值）
   * pending=true 时仅展示“AI 报告生成中”提示，不展示过渡文案
   */
  _renderCardFromTransit(transitRes, today, options = {}) {
    if (!this._alive) return;
    const pending = options.pending !== false;
    const interp = transitRes.interpreted || {};
    const natal = transitRes.natal || {};
    const sunPos = natal.positions
      ? natal.positions.find(p => p.name === 'Sun')
      : null;
    const sunSign = sunPos ? (SIGN_CN[sunPos.sign] || sunPos.sign) : '';

    this.setData({
      isLoadingForecast: false,
      // pending 阶段为“AI 报告生成中”，最终兜底结束 pending
      isForecastPending: pending,
      shareData: {
        score: String(interp.score || '--'),
        quote: pending ? 'AI报告正在生成中……' : '已加载今日基础数据',
        body: pending
          ? '今日运势基础数据已就绪，个性化解读生成中，请稍候。'
          : 'AI 解读暂不可用，请稍后下拉刷新重试。',
        sunSign,
        lucky: {
          color: interp.luckyColor || '--',
          number: interp.luckyNumber !== undefined ? String(interp.luckyNumber) : '--',
          direction: interp.luckyDirection || '--',
        },
        date: this.data.shareData.date,
      }
    });
    this._lastForecastDate = today;
    this._lastProfileFingerprint = buildProfileFingerprint(this.userProfile);
  },

  /** AI 内容后台获取（带自动重试，不阻塞卡片展示） */
  async _fetchAIForecast(seq, query, today) {
    const fullCacheKey = buildDailyFullCacheKey(this.userProfile, today);
    const homeCardKey = this._homeCardCacheKey(today);
    // 设置 pending 标记，防止 preloader 重复请求
    if (fullCacheKey) storage.set(fullCacheKey + '_pending', true);

    const RETRY_DELAYS = [0, 8000, 15000, 30000];
    try {
      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (!this._isLatestForecast(seq)) return;

        if (attempt > 0) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          if (!this._isLatestForecast(seq)) return;
        }
        try {
          const res = await request({
            url: `${API_ENDPOINTS.DAILY_FULL}?${query}&sections=forecast`,
            method: 'GET',
            timeout: 120000,
          });
          if (!this._isLatestForecast(seq)) return;
          if (res && res.forecast) {
            if (homeCardKey) storage.set(homeCardKey, res);
            this._profileChanged = false;
            this._transitFallback = null;
            this._renderCardFromFullResult(res, today);
            return;
          }
        } catch (err) {
          logger.log(`AI forecast attempt ${attempt + 1}/${RETRY_DELAYS.length} failed:`, err?.message || err);
        }
      }
      // 所有重试用尽
      if (this._isLatestForecast(seq)) {
        // 资料变更模式下有 transit 暂存数据，降级渲染
        if (this._transitFallback) {
          this._renderCardFromTransit(this._transitFallback.data, this._transitFallback.today, { pending: false });
          this._transitFallback = null;
          this._profileChanged = false;
        } else if (this.data.isLoadingForecast) {
          // transit 也失败了，此时仍在 loading → 显示错误
          this.setData({
            isLoadingForecast: false,
            isForecastPending: false,
            shareData: {
              ...this.data.shareData,
              score: '--',
              quote: '暂时无法获取',
              body: '请下拉刷新重试',
              lucky: { color: '--', number: '--', direction: '--' }
            }
          });
        } else {
          logger.warn('AI forecast all retries exhausted, keeping transit data');
        }
      }
    } finally {
      // 仅当仍是最新请求时才清除 pending，避免旧序列误删新序列的标记
      if (fullCacheKey && this._isLatestForecast(seq)) {
        storage.remove(fullCacheKey + '_pending');
      }
    }
  },

  /**
   * 获取每日洞察：缓存优先 → transit 快速渲染 → AI 后台升级
   */
  async fetchDailyForecast(skipCache) {
    this.setData({
      isLoadingForecast: true,
      isForecastPending: false
    });

    if (!this.userProfile) {
      this.setData({
        isLoadingForecast: false,
        shareData: {
          ...this.data.shareData,
          score: '--',
          quote: '请先设置出生信息',
          body: '前往"我的"页面设置您的出生日期、时间和地点，即可获取个性化洞察解读。',
          lucky: { color: '--', number: '--', direction: '--' }
        }
      });
      return;
    }

    const seq = this._beginForecastTask();
    const today = new Date().toISOString().slice(0, 10);
    this._transitFallback = null;

    // 缓存优先：先查 home 卡片缓存，再查 full 缓存（preloader 可能已写入）
    if (!skipCache) {
      const homeCardKey = this._homeCardCacheKey(today);
      const homeCached = homeCardKey ? storage.get(homeCardKey) : null;
      if (homeCached && homeCached.forecast) {
        this._renderCardFromFullResult(homeCached, today);
        return;
      }
      const fullCacheKey = buildDailyFullCacheKey(this.userProfile, today);
      const fullCached = fullCacheKey ? storage.get(fullCacheKey) : null;
      if (fullCached && (fullCached.chart || fullCached.forecast)) {
        this._renderCardFromFullResult(fullCached, today);
        return;
      }
    }

    const query = this.buildDailyParams(today);
    if (!query) {
      this.setData({ isLoadingForecast: false });
      return;
    }

    // Phase 1：快速 transit（确定性数据，<500ms）→ 立即渲染卡片
    // 资料变更时保持 loading 骨架屏，等 AI 内容到达后再渲染
    try {
      const transitRes = await request({
        url: `${API_ENDPOINTS.DAILY_TRANSIT}?${query}`,
        method: 'GET',
        timeout: 15000,
      });
      if (this._isLatestForecast(seq) && transitRes && transitRes.interpreted) {
        this._transitFallback = { data: transitRes, today };
        if (this._profileChanged) {
          // 资料变更：暂存 transit，保持 loading 直到 AI 内容到达
        } else {
          // 非资料变更：先展示基础数据 + “AI 报告生成中”提示，避免显示过渡 mock 文案
          this._renderCardFromTransit(transitRes, today, { pending: true });
        }
      }
    } catch (e) {
      logger.warn('Transit fetch failed:', e?.message || e);
    }

    // Phase 2：AI 内容后台获取（带自动重试）
    this._fetchAIForecast(seq, query, today);
  },

  async initRecommendations() {
    this.setData({ isLoadingRecommendations: true });
    const [userStatus, astroEvents] = await Promise.all([
      this.fetchUserStatus(),
      this.fetchAstroEvents()
    ]);
    this.generateRecommendations(userStatus, astroEvents);
  },

  normalizeUserStatus(raw) {
    const base = {
      isNewUser: false,
      registeredAt: null,
      hasBirthChart: false,
      hasUsedSynastry: false,
      lastCBTEntry: null,
      recentActions: []
    };

    if (!raw || raw.success === false) {
      return base;
    }

    const merged = {
      ...base,
      ...raw
    };

    if (!merged.isNewUser && merged.registeredAt) {
      const diffMs = Date.now() - new Date(merged.registeredAt).getTime();
      merged.isNewUser = diffMs <= 3 * 24 * 60 * 60 * 1000;
    }

    return merged;
  },

  _isLocalBackend() {
    const baseUrl = getBaseUrl();
    return baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost');
  },

  async fetchUserStatus() {
    // 后端尚未实现此端点，直接从 storage 构造
    const profile = storage.get('user_profile');
    const synastryProfiles = storage.get('synastry_profiles') || [];
    return this.normalizeUserStatus({
      isNewUser: false,
      hasBirthChart: !!profile,
      hasUsedSynastry: Array.isArray(synastryProfiles) && synastryProfiles.length > 0,
      lastCBTEntry: null,
      recentActions: []
    });
  },

  async fetchAstroEvents() {
    // 后端尚未实现此端点，暂返回缓存或空数组
    const CACHE_KEY = 'astro_events_cache';
    const cached = storage.get(CACHE_KEY);
    if (cached && cached.data) {
      return cached.data;
    }
    return [];
  },

  generateRecommendations(userStatus, astroEvents) {
    const recs = [];
    const hiddenRoutes = this.data.auditMode ? ['kline', 'chart', 'wiki', 'synthetica'] : [];
    const trendingPool = [
      {
        id: 'trending_personality',
        title: '了解你的沟通风格',
        subtitle: '高频场景的应对策略',
        category: '热门内容',
        route: 'wiki',
        icon: '/images/icons/relations.svg',
        accentClass: 'accent-gold',
        priority: 5
      },
      {
        id: 'trending_growth',
        title: '2026 个人成长趋势',
        subtitle: '年度自我提升指南',
        category: '热门内容',
        route: 'wiki',
        icon: '/images/icons/study.svg',
        accentClass: 'accent-mystic',
        priority: 5
      }
    ];

    const educationPool = [
      {
        id: 'edu_wiki',
        title: '性格分析入门',
        subtitle: '三分钟理解性格图谱',
        category: '教育内容',
        route: 'wiki',
        icon: '/images/icons/study.svg',
        accentClass: 'accent-psycho',
        priority: 4
      },
      {
        id: 'edu_chart',
        title: '发现你的核心人格特质',
        subtitle: '三维人格的快速索引',
        category: '教育内容',
        route: 'self',
        icon: '/images/icons/study.svg',
        accentClass: 'accent-gold',
        priority: 4
      }
    ];

    if (userStatus.isNewUser) {
      const newUserRecs = [
        {
          id: 'onboard_chart',
          title: '生成你的性格图谱',
          subtitle: '建立专属分析档案',
          category: '新手引导',
          route: 'self',
          icon: '/images/astro-symbols/sun.svg',
          accentClass: 'accent-gold'
        },
        {
          id: 'onboard_synastry',
          title: '了解关系分析',
          subtitle: '关系匹配地图',
          category: '新手引导',
          route: 'synastry',
          icon: '/images/icons/love.svg',
          accentClass: 'accent-love'
        },
        {
          id: 'onboard_wiki',
          title: '性格分析入门',
          subtitle: '从基础概念开始',
          category: '新手引导',
          route: 'wiki',
          icon: '/images/icons/study.svg',
          accentClass: 'accent-psycho'
        }
      ].filter(r => !hiddenRoutes.includes(r.route));
      this.setData({
        isLoadingRecommendations: false,
        recommendations: newUserRecs
      });
      return;
    }

    if (!userStatus.hasBirthChart) {
      recs.push({
        id: 'chart_gen',
        priority: 10,
        title: '5分钟了解真实的自己',
        subtitle: '生成图谱，开启探索之旅',
        category: '性格图谱引导',
        route: 'self',
        icon: '/images/astro-symbols/sun.svg',
        accentClass: 'accent-gold'
      });
    }

    if (Array.isArray(astroEvents) && astroEvents.length > 0) {
      const importantEvent = astroEvents.find(event => event.importance === 'high') || astroEvents[0];
      if (importantEvent) {
        recs.push({
          id: `event_${importantEvent.id}`,
          priority: 9,
          title: importantEvent.title,
          subtitle: importantEvent.description || '查看本周重要提醒',
          category: '周期提醒',
          route: 'wiki',
          icon: '/images/astro-symbols/mercury.svg',
          accentClass: 'accent-mystic'
        });
      }
    }

    const recentActions = Array.isArray(userStatus.recentActions) ? userStatus.recentActions : [];
    if (recentActions.length > 0) {
      recs.push({
        id: 'behavior_daily',
        priority: 8,
        title: '查看今日详细分析',
        subtitle: '延伸今日的关键洞察',
        category: '行为推荐',
        route: 'daily',
        icon: '/images/astro-symbols/moon.svg',
        accentClass: 'accent-gold'
      });
    }

    if (userStatus.lastCBTEntry) {
      const lastEntryTime = new Date(userStatus.lastCBTEntry).getTime();
      const daysSince = Math.floor((Date.now() - lastEntryTime) / (24 * 60 * 60 * 1000));
      if (daysSince > 3) {
        recs.push({
          id: 'cbt_remind',
          priority: 7,
          title: '记录此刻的情绪',
          subtitle: '心情日记帮助你梳理思绪',
          category: '心情提醒',
          route: 'cbt',
          icon: '/images/icons/health.svg',
          accentClass: 'accent-psycho'
        });
      }
    }

    if (!userStatus.hasUsedSynastry) {
      recs.push({
        id: 'synastry_promo',
        priority: 6,
        title: '测测你们的契合度',
        subtitle: '关系分析深度解析',
        category: '社交推荐',
        route: 'synastry',
        icon: '/images/icons/relations.svg',
        accentClass: 'accent-love'
      });
    }

    recs.push(trendingPool[0]);
    recs.push(educationPool[0]);

    recs.sort((a, b) => b.priority - a.priority);
    const filtered = hiddenRoutes.length > 0 ? recs.filter(r => !hiddenRoutes.includes(r.route)) : recs;
    this.setData({
      isLoadingRecommendations: false,
      recommendations: filtered.slice(0, 4)
    });
  },

  onNavigateToDaily() {
    wx.switchTab({ url: '/pages/daily/daily' });
  },

  onNavigateToQuickAccess(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'synastry') {
      storage.set('discovery_entry', 'synastry');
      wx.switchTab({ url: '/pages/discovery/discovery' });
    } else if (type === 'cbt') {
      wx.navigateTo({ url: '/pages/cbt/cbt' });
    } else if (type === 'ask') {
      wx.navigateTo({ url: '/pages/ask/ask' });
    }
  },

  onNavigateToChart(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'natal') {
      wx.switchTab({ url: '/pages/self/self' });
    } else if (type === 'kline') {
      wx.navigateTo({ url: '/pages/kline/kline' });
    }
  },

  onNavigateToRecommendation(e) {
    const route = e.currentTarget.dataset.route;
    if (route === 'synastry') {
      storage.set('discovery_entry', 'synastry');
      wx.switchTab({ url: '/pages/discovery/discovery' });
      return;
    }
    if (route === 'self') {
      wx.switchTab({ url: '/pages/self/self' });
      return;
    }
    if (route === 'daily') {
      wx.switchTab({ url: '/pages/daily/daily' });
      return;
    }
    wx.navigateTo({ url: `/pages/${route}/${route}` });
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

  ...creditsModalMethods,

  async handlePay() {
    this.setData({ paymentLoading: true });

    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      this.setData({ paymentLoading: false });
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

    try {
      // 统一走 /api/report/create（内置积分门控：检查+扣减+创建任务一步完成）
      const result = await request({
        url: API_ENDPOINTS.REPORT_CREATE,
        method: 'POST',
        data: { reportType: 'annual', birth: birthData, lang: 'zh' },
        timeout: 60000,
      });

      // 处理积分不足
      if (handleInsufficientCredits(this, result, { showPayment: false, paymentLoading: false })) {
        if (wx.showTabBar) wx.showTabBar({ animation: false });
        return;
      }

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
            content: `报告将在后台生成，预计需要 ${result.estimatedMinutes || 5} 分钟。\n\n生成完成后可在首页查看。`,
            showCancel: false,
            confirmText: '知道了',
          });

          this._startStatusPolling();
        } else if (result.status === 'completed') {
          wx.navigateTo({
            url: '/pages/annual-report/annual-report',
          });
        } else if (result.status === 'processing') {
          wx.showToast({ title: '报告正在生成中...', icon: 'loading' });
          this._startStatusPolling();
        }
      } else {
        wx.showToast({ title: result?.error || '创建任务失败', icon: 'none' });
      }
    } catch (error) {
      if (handleInsufficientCredits(this, error, { showPayment: false, paymentLoading: false })) {
        if (wx.showTabBar) wx.showTabBar({ animation: false });
        return;
      }
      logger.error('Create task error:', error);
      wx.showToast({ title: '创建任务失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ paymentLoading: false });
    }
  },

  /** 年度报告入口点击处理 */
  onAnnualReportTap() {
    const { annualTaskStatus } = this.data;

    switch (annualTaskStatus) {
      case 'none':
        this.showPaymentModal();
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
        this.showPaymentModal();
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
          annualTaskMessage: result.task?.message || '',
        });
        this._startStatusPolling();
        wx.showToast({ title: '重试任务已启动', icon: 'success' });
      } else {
        wx.showToast({ title: result?.error || '重试失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '重试失败', icon: 'none' });
    }
  },

  showShareModal() {
    this.setData({ showShareModal: true });
  },

  hideShareModal() {
    this.setData({ showShareModal: false });
  },

  onCopyShare() {
    const { score, quote, date, sunSign } = this.data.shareData;
    const app = getApp();
    const audit = !!(app && app.globalData && app.globalData.auditMode);
    const signPrefix = (!audit && sunSign) ? sunSign + ' | ' : '';
    const text = `${signPrefix}${date} 洞察 ${score}分\n${quote}\n\n—— 星语`;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  preventBubble() {
  }
});

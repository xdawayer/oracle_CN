const { request, getBaseUrl } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

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
  data: {
    greeting: '早安, 星智用户',
    currentDate: '',
    avatarUrl: '',
    shareData: {
      score: '--',
      quote: '加载中...',
      body: '正在获取今日运势...',
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
      title: '2026 流年大运',
      subtitle: '专属年度星象解读',
      features: [
        { title: '年度总览', desc: '全年运势主题与能量走向' },
        { title: '六大领域', desc: '事业、感情、健康、社交、成长、财运' },
        { title: '季度详解', desc: '四季运势节奏与关键时间点' },
        { title: '开运指南', desc: '幸运元素与能量提升建议' },
      ],
      price: 500,
      note: '约 8000-10000 字深度解读，永久保存',
    },
    isLoadingForecast: true,
    isLoadingRecommendations: true,
    recommendations: [],

    // 流年报告任务状态
    annualTaskStatus: 'none', // none | pending | processing | completed | failed
    annualTaskProgress: 0,
    annualTaskMessage: ''
  },

  onLoad() {
    this.updateDate();
    this.loadUserProfile();
    this.fetchDailyForecast();
    this.initRecommendations();
    this.checkAnnualReportAccess();
  },

  onShow() {
    this.checkAnnualReportAccess();
  },

  onUnload() {
    this._statusPolling = false;
    if (this._statusPollTimer) {
      clearTimeout(this._statusPollTimer);
      this._statusPollTimer = null;
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时跳过缓存
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
      title: quote || `今日运势 ${score}分`,
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

    const avatarUrl = storage.get('user_avatar') || '';
    if (avatarUrl) {
      this.setData({ avatarUrl });
    }
  },

  /** 检查流年报告任务状态 */
  async checkAnnualReportAccess() {
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
      });

      if (result && result.exists) {
        this.setData({
          annualTaskStatus: result.status,
          annualTaskProgress: result.progress || 0,
          annualTaskMessage: result.message || '',
        });

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

  /** 生成与 daily.js 相同格式的 transit 缓存 key，实现互相缓存 */
  getTransitCacheKey(dateStr) {
    if (!this.userProfile) return null;
    const { birthDate, birthTime, birthCity } = this.userProfile;
    return `daily_transit_cache_${birthDate}_${birthTime}_${birthCity}_${dateStr}`;
  },

  /** 首页 homeCard 缓存 key */
  getHomeCardCacheKey(dateStr) {
    if (!this.userProfile) return null;
    const { birthDate, birthTime, birthCity } = this.userProfile;
    return `home_card_cache_${birthDate}_${birthTime}_${birthCity}_${dateStr}`;
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

  async fetchDailyForecast(skipCache) {
    try {
      this.setData({ isLoadingForecast: true });

      if (!this.userProfile) {
        this.setData({
          isLoadingForecast: false,
          shareData: {
            ...this.data.shareData,
            score: '--',
            quote: '请先设置出生信息',
            body: '前往"我的"页面设置您的出生日期、时间和地点，即可获取个性化运势解读。',
            lucky: { color: '--', number: '--', direction: '--' }
          }
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      // 检查 homeCard 缓存（非强制刷新时）
      if (!skipCache) {
        const homeCardCacheKey = this.getHomeCardCacheKey(today);
        const cachedCard = homeCardCacheKey ? storage.get(homeCardCacheKey) : null;
        if (cachedCard && cachedCard.shareData) {
          this.setData({
            isLoadingForecast: false,
            shareData: { ...cachedCard.shareData, date: this.data.shareData.date }
          });
          return;
        }
      }

      const query = this.buildDailyParams(today);
      if (!query) {
        this.setData({ isLoadingForecast: false });
        return;
      }

      const res = await request({ url: `${API_ENDPOINTS.DAILY_TRANSIT}?${query}` });

      if (res && res.transits) {
        // 使用后端计算的评分数据（消除鸡生蛋问题）
        const interpreted = res.interpreted || {};
        const score = interpreted.score || '--';
        const summary = interpreted.summary || '';
        const description = interpreted.description || '';

        // 获取太阳星座
        const sunPos = res.natal && res.natal.positions
          ? res.natal.positions.find(p => p.name === 'Sun')
          : null;
        const sunSign = sunPos ? (SIGN_CN[sunPos.sign] || sunPos.sign) : '';

        // AI 金句优先，后端兜底文案
        const quote = (res.homeCard && res.homeCard.quote) || summary;
        const body = (res.homeCard && res.homeCard.body) || description;

        const shareData = {
          score: String(score),
          quote,
          body,
          sunSign,
          lucky: {
            color: interpreted.luckyColor || '--',
            number: interpreted.luckyNumber || '--',
            direction: interpreted.luckyDirection || '--'
          },
          date: this.data.shareData.date
        };

        this.setData({
          isLoadingForecast: false,
          shareData
        });

        // 缓存 transit 数据（与 daily.js 共享 key 格式）
        const transitCacheKey = this.getTransitCacheKey(today);
        if (transitCacheKey) {
          storage.set(transitCacheKey, res);
        }

        // 缓存 homeCard 数据
        const homeCardCacheKey = this.getHomeCardCacheKey(today);
        if (homeCardCacheKey) {
          storage.set(homeCardCacheKey, { shareData });
        }
      } else {
        this.setData({ isLoadingForecast: false });
      }
    } catch (error) {
      console.error('Fetch daily failed', error);
      this.setData({
        isLoadingForecast: false,
        shareData: {
          ...this.data.shareData,
          score: '--',
          quote: '获取失败',
          body: '无法获取今日运势，请稍后重试。',
          lucky: { color: '--', number: '--', direction: '--' }
        }
      });
    }
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
    // 本地后端无此端点，直接从 storage 构造
    if (this._isLocalBackend()) {
      const profile = storage.get('user_profile');
      const synastryProfiles = storage.get('synastry_profiles') || [];
      return this.normalizeUserStatus({
        isNewUser: false,
        hasBirthChart: !!profile,
        hasUsedSynastry: Array.isArray(synastryProfiles) && synastryProfiles.length > 0,
        lastCBTEntry: null,
        recentActions: []
      });
    }
    try {
      const res = await request({ url: API_ENDPOINTS.USER_STATUS });
      return this.normalizeUserStatus(res);
    } catch (error) {
      console.warn('Fetch user status failed', error);
      const profile = storage.get('user_profile');
      const synastryProfiles = storage.get('synastry_profiles') || [];
      return this.normalizeUserStatus({
        isNewUser: false,
        hasBirthChart: !!profile,
        hasUsedSynastry: Array.isArray(synastryProfiles) && synastryProfiles.length > 0,
        lastCBTEntry: null,
        recentActions: []
      });
    }
  },

  async fetchAstroEvents() {
    const CACHE_KEY = 'astro_events_cache';
    const CACHE_DURATION = 24 * 60 * 60 * 1000;

    const cached = storage.get(CACHE_KEY);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.data || [];
    }

    // 本地后端无此端点
    if (this._isLocalBackend()) {
      return [];
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request({ url: `${API_ENDPOINTS.ASTRO_EVENTS}?date=${today}` });
      if (res && Array.isArray(res.events)) {
        storage.set(CACHE_KEY, {
          data: res.events,
          timestamp: Date.now()
        });
        return res.events;
      }
    } catch (error) {
      console.warn('Fetch astro events failed', error);
    }
    return [];
  },

  generateRecommendations(userStatus, astroEvents) {
    const recs = [];
    const trendingPool = [
      {
        id: 'trending_retrograde',
        title: '水星逆行生存指南',
        subtitle: '高频场景的避坑策略',
        category: '热门内容',
        route: 'wiki',
        icon: '/images/astro-symbols/mercury.svg',
        accentClass: 'accent-gold',
        priority: 5
      },
      {
        id: 'trending_wiki',
        title: '冥王星入水瓶座',
        subtitle: '时代能量的转向提示',
        category: '热门内容',
        route: 'wiki',
        icon: '/images/astro-symbols/pluto.svg',
        accentClass: 'accent-mystic',
        priority: 5
      }
    ];

    const educationPool = [
      {
        id: 'edu_wiki',
        title: '占星入门指南',
        subtitle: '三分钟理解星盘结构',
        category: '教育内容',
        route: 'wiki',
        icon: '/images/icons/study.svg',
        accentClass: 'accent-psycho',
        priority: 4
      },
      {
        id: 'edu_chart',
        title: '认识你的太阳月亮上升',
        subtitle: '核心人格的快速索引',
        category: '教育内容',
        route: 'self',
        icon: '/images/astro-symbols/sun.svg',
        accentClass: 'accent-gold',
        priority: 4
      }
    ];

    if (userStatus.isNewUser) {
      this.setData({
        isLoadingRecommendations: false,
        recommendations: [
          {
            id: 'onboard_chart',
            title: '生成你的本命盘',
            subtitle: '建立专属星盘档案',
            category: '新手引导',
            route: 'self',
            icon: '/images/astro-symbols/sun.svg',
            accentClass: 'accent-gold'
          },
          {
            id: 'onboard_synastry',
            title: '了解双人合盘',
            subtitle: '关系能量地图',
            category: '新手引导',
            route: 'synastry',
            icon: '/images/icons/love.svg',
            accentClass: 'accent-love'
          },
          {
            id: 'onboard_wiki',
            title: '占星入门指南',
            subtitle: '从基础概念开始',
            category: '新手引导',
            route: 'wiki',
            icon: '/images/icons/study.svg',
            accentClass: 'accent-psycho'
          }
        ]
      });
      return;
    }

    if (!userStatus.hasBirthChart) {
      recs.push({
        id: 'chart_gen',
        priority: 10,
        title: '5分钟了解真实的自己',
        subtitle: '生成星盘，开启探索之旅',
        category: '本命盘引导',
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
          subtitle: importantEvent.description || '查看本周星象提醒',
          category: '星象提醒',
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
        title: '查看今日星象细节',
        subtitle: '延伸今日的关键能量',
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
          subtitle: 'CBT日记帮助你梳理思绪',
          category: 'CBT提醒',
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
        subtitle: '双人合盘深度解析',
        category: '社交推荐',
        route: 'synastry',
        icon: '/images/icons/relations.svg',
        accentClass: 'accent-love'
      });
    }

    recs.push(trendingPool[0]);
    recs.push(educationPool[0]);

    recs.sort((a, b) => b.priority - a.priority);
    this.setData({
      isLoadingRecommendations: false,
      recommendations: recs.slice(0, 4)
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

    const DEV_MODE = true;

    try {
      if (!DEV_MODE) {
        const payResult = await request({
          url: '/api/reports/purchase',
          method: 'POST',
          data: { reportType: 'annual' },
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
      console.error('Create task error:', error);
      wx.showToast({ title: '创建任务失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ paymentLoading: false });
    }
  },

  /** 流年报告入口点击处理 */
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
    const text = `${sunSign ? sunSign + ' | ' : ''}${date} 运势 ${score}分\n${quote}\n\n—— 星智 AstroMind`;
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

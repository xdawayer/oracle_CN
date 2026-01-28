const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

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
    cardStyle: '',
    cardTextColor: '#FFFFFF',
    shareData: {
      score: '--',
      summary: '加载中...',
      description: '正在获取今日运势...',
      lucky: {
        color: '--',
        number: '--',
        direction: '--'
      },
      date: ""
    },
    showShareModal: false,
    isLoadingForecast: true,
    isLoadingRecommendations: true,
    recommendations: []
  },

  onLoad() {
    this.updateDate();
    this.loadUserProfile();
    this.fetchDailyForecast();
    this.initRecommendations();
  },

  onPullDownRefresh() {
    Promise.all([
      this.fetchDailyForecast(),
      this.initRecommendations()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  updateDate() {
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;
    
    this.setData({
      currentDate: dateStr,
      'shareData.date': now.toLocaleDateString()
    });
  },

  loadUserProfile() {
    const stored = storage.get('user_profile');
    const profile = { ...DEFAULT_PROFILE, ...(stored || {}) };

    const avatarUrl = storage.get('user_avatar') || '';
    if (avatarUrl) {
      this.setData({ avatarUrl });
    }
    this.userProfile = profile;
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

  async fetchDailyForecast() {
    try {
      this.setData({ isLoadingForecast: true });

      if (!this.userProfile) {
        this.setData({
          isLoadingForecast: false,
          shareData: {
            ...this.data.shareData,
            score: '--',
            summary: '请先设置出生信息',
            description: '前往"我的"页面设置您的出生日期、时间和地点，即可获取个性化运势解读。',
            lucky: { color: '--', number: '--', direction: '--' }
          }
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const query = this.buildDailyParams(today);
      if (!query) {
        this.setData({ isLoadingForecast: false });
        return;
      }

      const res = await request({ url: `${API_ENDPOINTS.DAILY_FORECAST}?${query}` });

      if (res && res.content) {
        const content = res.content;
        
        const overallScore = content.overall_score || 50;
        const themeTitle = content.theme_title || (content.tags && content.tags.length > 0 ? content.tags.join(' · ') : '今日运势');
        
        let description = content.theme_explanation;
        if (!description && content.strategy) {
          description = content.strategy.best_use;
        }
        if (!description) {
          description = content.share_text || '';
        }

        const luckyColors = ['深蓝', '紫色', '金色', '绿色', '红色', '白色', '橙色'];
        const luckyDirections = ['北方', '南方', '东方', '西方', '东北', '东南', '西北', '西南'];
        const randomLuckyNumber = Math.floor(Math.random() * 9) + 1;
        const randomLuckyColor = luckyColors[Math.floor(Math.random() * luckyColors.length)];
        const randomLuckyDirection = luckyDirections[Math.floor(Math.random() * luckyDirections.length)];

        const luckyColorName = content.lucky_color || randomLuckyColor;
        const normalizedColor = COLOR_NAME_MAP[luckyColorName] || luckyColorName;
        const colors = LUCKY_COLOR_MAP[normalizedColor] || LUCKY_COLOR_MAP.default;
        const cardStyle = `background: linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%);`;
        const cardTextColor = LUCKY_TEXT_COLOR_MAP[normalizedColor] || LUCKY_TEXT_COLOR_MAP.default;

        this.setData({
          isLoadingForecast: false,
          cardStyle,
          cardTextColor,
          shareData: {
            score: overallScore.toString(),
            summary: themeTitle,
            description: description,
            lucky: {
              color: luckyColorName,
              number: (content.lucky_number || randomLuckyNumber).toString(),
              direction: content.lucky_direction || randomLuckyDirection
            },
            date: this.data.shareData.date
          }
        });
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
          summary: '获取失败',
          description: '无法获取今日运势，请稍后重试。',
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

  async fetchUserStatus() {
    try {
      const res = await request({ url: API_ENDPOINTS.USER_STATUS });
      return this.normalizeUserStatus(res);
    } catch (error) {
      console.error('Fetch user status failed', error);
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
      console.error('Fetch astro events failed', error);
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

  onChangeTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'daily') {
      wx.switchTab({ url: '/pages/daily/daily' });
    }
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

  showShareModal() {
    this.setData({ showShareModal: true });
  },

  hideShareModal() {
    this.setData({ showShareModal: false });
  },

  onSaveShare() {
    wx.showToast({
      title: '已保存海报',
      icon: 'success'
    });
    this.hideShareModal();
  },
  
  preventBubble() {
  }
});

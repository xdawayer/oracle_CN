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
    recommendations: [
      {
        id: 'wiki',
        image: '/images/wiki-cover.png',
        category: '星象百科',
        title: '水星逆行生存指南',
        route: 'wiki'
      },
      {
        id: 'cbt',
        image: '/images/cbt-cover.png',
        category: '心理疗愈',
        title: '情绪日记与认知重构',
        route: 'cbt'
      }
    ]
  },

  onLoad() {
    this.updateDate();
    this.loadUserProfile();
    this.fetchDailyForecast();
  },

  onPullDownRefresh() {
    this.fetchDailyForecast().then(() => {
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
    let profile = storage.get('user_profile');
    
    if (!profile) {
      profile = {
        birthDate: '1989-10-31',
        birthTime: '22:00',
        birthCity: '中国, 湖南, 娄底',
        timezone: '8',
        lat: 27.7,
        lon: 112.0,
        accuracyLevel: 'city'
      };
    }

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

  onChangeTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'self') {
      wx.switchTab({ url: '/pages/self/self' });
    } else if (tab === 'daily') {
      wx.switchTab({ url: '/pages/daily/daily' });
    }
  },

  onNavigateToDiscovery(e) {
    const route = e.currentTarget.dataset.route;
    
    if (route === 'synastry') {
      wx.switchTab({
        url: '/pages/discovery/discovery'
      });
      return;
    }

    const urlMap = {
      'wiki': '/pages/wiki/wiki',
      'cbt': '/pages/cbt/cbt'
    };
    
    if (urlMap[route]) {
      wx.navigateTo({ url: urlMap[route] });
    }
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

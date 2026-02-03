/**
 * 人生K线页面
 * 展示人生100年的K线图及年度运势分析
 */
const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');
const storage = require('../../utils/storage');

/**
 * 递归清理对象中所有字符串的 Markdown 标记（**、*、#等）
 */
function stripMarkdown(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^#{1,6}\s+/gm, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(stripMarkdown);
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = stripMarkdown(obj[key]);
    }
    return result;
  }
  return obj;
}

// 天干地支
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 星座数据（使用 PNG 图片路径，避免 Unicode 符号在微信小程序中显示为彩色 emoji）
const ZODIAC_SIGNS = [
  { name: '白羊座', icon: '/images/astro-symbols/aries.png', element: 'fire' },
  { name: '金牛座', icon: '/images/astro-symbols/taurus.png', element: 'earth' },
  { name: '双子座', icon: '/images/astro-symbols/gemini.png', element: 'air' },
  { name: '巨蟹座', icon: '/images/astro-symbols/cancer.png', element: 'water' },
  { name: '狮子座', icon: '/images/astro-symbols/leo.png', element: 'fire' },
  { name: '处女座', icon: '/images/astro-symbols/virgo.png', element: 'earth' },
  { name: '天秤座', icon: '/images/astro-symbols/libra.png', element: 'air' },
  { name: '天蝎座', icon: '/images/astro-symbols/scorpio.png', element: 'water' },
  { name: '射手座', icon: '/images/astro-symbols/sagittarius.png', element: 'fire' },
  { name: '摩羯座', icon: '/images/astro-symbols/capricorn.png', element: 'earth' },
  { name: '水瓶座', icon: '/images/astro-symbols/aquarius.png', element: 'air' },
  { name: '双鱼座', icon: '/images/astro-symbols/pisces.png', element: 'water' },
];

Page({
  data: {
    // 用户信息
    userInfo: null,
    birthData: {
      year: 1990,
      month: 6,
      day: 15,
      hour: 12
    },

    // K线数据
    klineData: [],
    visibleData: [],
    natalChart: null,
    isDataFromServer: false,

    // 视图状态
    viewMode: 'chart', // 'chart' | 'report'
    viewRange: { start: 0, end: 50, label: '1-50岁' },
    loading: false,

    // 当前年份数据
    currentYearData: null,

    // 年度详情弹窗
    showYearDetail: false,
    selectedYear: null,
    selectedYearReport: null,
    activeTab: 'overview',

    // 报告章节展开状态（对象形式，WXML 不支持 Array.includes）
    expandedSections: { overview: true },

    // 重要节点列表
    milestones: [],

    // 付费状态
    isUnlocked: false,
    isSubscriber: false,

    // 开发模式 - 生产环境务必设为 false
    devMode: true,

    // 报告内容
    reportContent: {
      overview: '',
      past: '',
      present: '',
      future: '',
      milestone: '',
      letter: ''
    },

    // AI 加载状态
    yearReportLoading: false,
    yearReportError: false,
    lifeScrollLoading: false,
    lifeScrollError: false,

    // Tab 配置
    detailTabs: [
      { id: 'overview', label: '概览' },
      { id: 'career', label: '事业' },
      { id: 'wealth', label: '财运' },
      { id: 'love', label: '感情' },
      { id: 'health', label: '健康' },
      { id: 'monthly', label: '月度' }
    ],

    // 范围选项
    rangeOptions: [
      { label: '1-50岁', start: 0, end: 50 },
      { label: '51-100岁', start: 50, end: 100 },
      { label: '全部', start: 0, end: 100 }
    ]
  },

  onLoad() {
    const userInfo = storage.get('user_profile');
    if (userInfo) {
      const birthDate = userInfo.birthDate || '';
      const parts = birthDate.split('-');
      const birthData = {
        year: parseInt(parts[0]) || 1990,
        month: parseInt(parts[1]) || 6,
        day: parseInt(parts[2]) || 15,
        hour: this.parseTimeToHour(userInfo.birthTime)
      };

      this.setData({ userInfo, birthData }, () => {
        this.generateLocalKLineData();
        this.fetchKLineData();
      });
    } else {
      // 使用默认数据生成预览
      this.generateLocalKLineData();
    }
  },

  onShow() {
    // 页面显示时重绘 Canvas
    if (!this.data.showYearDetail && this.data.klineData.length > 0) {
      this.redrawChart();
    }
  },

  /**
   * 解析时间字符串为小时数
   */
  parseTimeToHour(timeStr) {
    if (!timeStr) return 12;
    const match = timeStr.match(/^(\d{1,2}):/);
    return match ? parseInt(match[1]) : 12;
  },

  /**
   * 本地生成K线数据（快速预览）
   */
  generateLocalKLineData() {
    const { year, month, day } = this.data.birthData;
    const currentYear = new Date().getFullYear();
    const data = [];
    let prevClose = 50;
    const baseSeed = year * 10000 + month * 100 + day;

    // 伪随机函数
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let age = 1; age <= 100; age++) {
      const yr = year + age - 1;
      let score = 50;

      // 土星周期 (29.5年)
      const saturnPhase = (age % 29.5) / 29.5;
      if (Math.abs(saturnPhase) < 0.05 || Math.abs(saturnPhase - 1) < 0.05) {
        score -= 12;
      } else if (Math.abs(saturnPhase - 0.5) < 0.05) {
        score -= 8;
      }

      // 木星周期 (12年)
      const jupiterPhase = (age % 12) / 12;
      if (Math.abs(jupiterPhase) < 0.08 || Math.abs(jupiterPhase - 1) < 0.08) {
        score += 15;
      }

      // 天王星对分 (42岁)
      if (age >= 40 && age <= 44) score -= 8;

      // 波动
      const seed = baseSeed + yr * 7 + age * 13;
      score += (seededRandom(seed) - 0.5) * 25;
      score = Math.max(15, Math.min(90, score));

      // K线数据
      const volatility = 8 + seededRandom(seed + 1000) * 10;
      const open = prevClose;
      const close = score + (seededRandom(seed + 2000) - 0.5) * 10;
      const high = Math.max(score, open, close) + seededRandom(seed + 3000) * volatility;
      const low = Math.min(score, open, close) - seededRandom(seed + 4000) * volatility;

      const isSaturnReturn = Math.abs(age - 29) <= 1 || Math.abs(age - 59) <= 1;
      const isJupiterReturn = age % 12 <= 1 || age % 12 >= 11;
      const isUranusOpposition = age >= 40 && age <= 44;

      data.push({
        year: yr,
        age,
        ganzhi: this.getYearGanZhi(yr),
        open: Math.round(Math.max(10, Math.min(95, open))),
        close: Math.round(Math.max(10, Math.min(95, close))),
        high: Math.round(Math.max(15, Math.min(100, high))),
        low: Math.round(Math.max(5, Math.min(90, low))),
        score: Math.round(score),
        trend: close >= open ? 'bull' : 'bear',
        isCurrentYear: yr === currentYear,
        isSaturnReturn,
        isJupiterReturn,
        isUranusOpposition
      });

      prevClose = close;
    }

    const currentYearData = data.find(d => d.year === currentYear);
    const milestones = data.filter(d => d.isSaturnReturn || d.isUranusOpposition).slice(0, 5);
    const visibleData = data.slice(this.data.viewRange.start, this.data.viewRange.end);

    // 计算本命盘
    const natalChart = this.calculateNatalChart(year, month, day, this.data.birthData.hour);

    this.setData({
      klineData: data,
      visibleData,
      currentYearData,
      milestones,
      natalChart
    });
  },

  /**
   * 计算本命盘
   */
  calculateNatalChart(year, month, day, hour) {
    // 太阳星座
    const sunDates = [[20,19],[19,18],[21,20],[20,20],[21,21],[21,22],[23,22],[23,22],[23,22],[23,21],[22,21],[22,19]];
    let sunIdx = month - 1;
    if (day < sunDates[sunIdx][0]) sunIdx = (sunIdx + 11) % 12;
    const sunSign = ZODIAC_SIGNS[sunIdx];

    // 月亮星座（简化）
    const moonIdx = (year * 7 + month * 3 + day) % 12;
    const moonSign = ZODIAC_SIGNS[moonIdx];

    // 上升星座（简化）
    const ascIdx = Math.floor(hour / 2) % 12;
    const ascendant = ZODIAC_SIGNS[ascIdx];

    return { sunSign, moonSign, ascendant };
  },

  /**
   * 获取干支
   */
  getYearGanZhi(year) {
    return {
      stem: STEMS[(year - 4) % 10],
      branch: BRANCHES[(year - 4) % 12],
      full: STEMS[(year - 4) % 10] + BRANCHES[(year - 4) % 12]
    };
  },

  /**
   * 从后端获取K线数据
   */
  async fetchKLineData() {
    if (!this.data.userInfo) return;

    this.setData({ loading: true });

    try {
      const { birthDate, birthTime } = this.data.userInfo;
      const params = `birthDate=${encodeURIComponent(birthDate || '')}&birthTime=${encodeURIComponent(birthTime || '')}`;

      const res = await request({
        url: `${API_ENDPOINTS.KLINE_GENERATE}?${params}`
      });

      if (res && res.klineData) {
        const currentYear = new Date().getFullYear();
        const currentYearData = res.klineData.find(d => d.year === currentYear);
        const milestones = res.klineData.filter(d => d.isSaturnReturn || d.isUranusOpposition).slice(0, 5);
        const visibleData = res.klineData.slice(this.data.viewRange.start, this.data.viewRange.end);

        this.setData({
          klineData: res.klineData,
          visibleData,
          currentYearData,
          milestones,
          natalChart: res.natalChart || this.data.natalChart,
          isDataFromServer: true,
          loading: false
        });

        // 后端数据加载完成后，触发人生长卷 AI 生成
        this.fetchLifeScrollReport();
      }
    } catch (err) {
      console.error('获取K线数据失败:', err);
      this.setData({ loading: false });
      // 显示错误提示，但不影响本地数据预览
      wx.showToast({ title: '数据同步失败，显示本地预览', icon: 'none', duration: 2000 });
    }
  },

  /**
   * 切换视图模式
   */
  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });

    // 切换到报告视图时，如果内容为空且有用户信息，触发加载
    if (mode === 'report' && !this.data.reportContent.overview && !this.data.lifeScrollLoading && !this.data.lifeScrollError && this.data.userInfo) {
      this.fetchLifeScrollReport();
    }
  },

  /**
   * 跳转到个人资料页
   */
  goToProfile() {
    wx.navigateTo({ url: '/pages/me/me' });
  },

  /**
   * 切换视图范围
   */
  onRangeChange(e) {
    const range = e.currentTarget.dataset.range;
    const visibleData = this.data.klineData.slice(range.start, range.end);
    this.setData({
      viewRange: range,
      visibleData
    }, () => {
      this.redrawChart();
    });
  },

  /**
   * 重绘图表
   */
  redrawChart() {
    const chartComponent = this.selectComponent('#klineChart');
    if (chartComponent) {
      setTimeout(() => chartComponent.redraw(), 50);
    }
  },

  /**
   * K线点击事件
   */
  onYearClick(e) {
    const { yearData } = e.detail;
    this.showYearDetailModal(yearData);
  },

  /**
   * 点击当前年份卡片
   */
  onCurrentYearClick() {
    if (this.data.currentYearData) {
      this.showYearDetailModal(this.data.currentYearData);
    }
  },

  /**
   * 点击里程碑
   */
  onMilestoneClick(e) {
    const year = e.currentTarget.dataset.year;
    const yearData = this.data.klineData.find(d => d.year === year);
    if (yearData) {
      this.showYearDetailModal(yearData);
    }
  },

  /**
   * 显示年度详情弹窗（先显示 loading，再从后端获取 AI 报告）
   */
  showYearDetailModal(yearData) {
    this.setData({
      selectedYear: yearData,
      selectedYearReport: null,
      showYearDetail: true,
      activeTab: 'overview',
      yearReportLoading: true,
      yearReportError: false
    });
    this.fetchYearReport(yearData);
  },

  /**
   * 从后端获取年度 AI 报告
   */
  async fetchYearReport(yearData) {
    if (!this.data.userInfo) {
      this.setData({ yearReportLoading: false });
      this.closeYearDetail();
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    try {
      const { birthDate, birthTime } = this.data.userInfo;
      const params = `birthDate=${encodeURIComponent(birthDate || '')}&birthTime=${encodeURIComponent(birthTime || '')}&year=${yearData.year}`;

      const res = await request({
        url: `${API_ENDPOINTS.KLINE_YEAR_REPORT}?${params}`,
        timeout: 120000
      });

      if (res && res.requiresPayment && !this.data.devMode) {
        // 需要付费
        this.setData({ yearReportLoading: false });
        wx.showModal({
          title: '需要订阅',
          content: '年度深度报告为订阅会员专享内容，订阅后可查看所有年度报告。',
          confirmText: '了解VIP',
          cancelText: '关闭',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.closeYearDetail();
              wx.navigateTo({ url: '/pages/me/me' });
            }
          }
        });
        return;
      }

      if (res && res.report) {
        this.setData({
          selectedYearReport: stripMarkdown(res.report),
          yearReportLoading: false,
          yearReportError: false
        });
      } else {
        this.setData({ yearReportLoading: false, yearReportError: true });
      }
    } catch (err) {
      console.error('年度报告获取失败:', err);
      this.setData({ yearReportLoading: false, yearReportError: true });
    }
  },

  /**
   * 从后端获取人生长卷 AI 报告
   */
  async fetchLifeScrollReport() {
    if (!this.data.userInfo) return;

    this.setData({ lifeScrollLoading: true, lifeScrollError: false });

    try {
      const { birthDate, birthTime } = this.data.userInfo;
      const params = `birthDate=${encodeURIComponent(birthDate || '')}&birthTime=${encodeURIComponent(birthTime || '')}`;

      const res = await request({
        url: `${API_ENDPOINTS.KLINE_LIFE_SCROLL}?${params}`,
        timeout: 180000
      });

      if (res && res.requiresPayment) {
        this.setData({ lifeScrollLoading: false });
        return;
      }

      if (res && res.report) {
        this.setData({
          reportContent: stripMarkdown(res.report),
          lifeScrollLoading: false,
          lifeScrollError: false
        });
      } else {
        this.setData({ lifeScrollLoading: false, lifeScrollError: true });
      }
    } catch (err) {
      console.error('人生长卷获取失败:', err);
      this.setData({ lifeScrollLoading: false, lifeScrollError: true });
    }
  },

  /**
   * 重试年度报告
   */
  retryYearReport() {
    if (this.data.selectedYear) {
      this.setData({ yearReportLoading: true, yearReportError: false });
      this.fetchYearReport(this.data.selectedYear);
    }
  },

  /**
   * 重试人生长卷
   */
  retryLifeScroll() {
    this.fetchLifeScrollReport();
  },

  /**
   * 关闭年度详情弹窗
   */
  closeYearDetail() {
    this.setData({ showYearDetail: false }, () => {
      setTimeout(() => this.redrawChart(), 50);
    });
  },

  /**
   * 切换详情Tab
   */
  onDetailTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  /**
   * 切换报告章节展开
   */
  toggleSection(e) {
    const section = e.currentTarget.dataset.section;
    const key = `expandedSections.${section}`;
    this.setData({
      [key]: !this.data.expandedSections[section]
    });
  },

  /**
   * 锁定章节点击
   */
  onLockedSectionClick(e) {
    const section = e.currentTarget.dataset.section;
    const sectionNames = {
      future: '未来三十载',
      milestone: '人生里程碑',
      letter: '予未来之我'
    };
    const name = sectionNames[section] || '该章节';

    wx.showModal({
      title: `「${name}」尚未解锁`,
      content: '解锁完整命书即可查看全部章节内容，包括未来运势预测、人生里程碑、给未来自己的寄语。',
      confirmText: '立即解锁',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.onUnlockReport();
        }
      }
    });
  },

  /**
   * 解锁付费内容
   */
  async onUnlockReport() {
    // 开发模式：直接解锁
    if (this.data.devMode) {
      this.setData({
        isUnlocked: true,
        expandedSections: { overview: true, past: true, present: true, future: true, milestone: true, letter: true }
      });
      wx.showToast({ title: '已解锁完整报告', icon: 'success' });
      return;
    }

    // 检查用户登录状态
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    // TODO: 正式版接入支付
    wx.showModal({
      title: '解锁完整报告',
      content: '人生K线完整报告包含：\n• 未来30年运势详解\n• 人生里程碑预测\n• 给未来的你\n\n订阅VIP会员可自动解锁所有报告。',
      confirmText: '了解VIP',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/me/me' });
        }
      }
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 阻止冒泡
   */
  preventBubble() {}
});

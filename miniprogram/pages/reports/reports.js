const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');

/** 检查是否已登录 */
const isLoggedIn = () => {
  const token = storage.get('access_token');
  return !!token;
};

const TYPE_TEXT_MAP = {
  synastry: '关系分析',
  daily: '每日洞察',
  natal: '深度解读',
  synthetica: '探索实验',
  'natal-report': '本命解读',
  'love-topic': '爱情专题',
  'career-topic': '事业专题',
  'wealth-topic': '财富专题',
};

const getTypeText = (type) => TYPE_TEXT_MAP[type] || '分析报告';

const getTypeClass = (type) => {
  if (type === 'synastry') return 'tag-synastry';
  if (type === 'daily') return 'tag-daily';
  if (type === 'natal' || type === 'natal-report') return 'tag-natal';
  if (type && type.endsWith('-topic')) return 'tag-natal';
  return 'tag-default';
};

/** 将 modules+meta 格式转换为 sections 数组 */
const modulesToSections = (modules, meta) => {
  if (!modules || typeof modules !== 'object') return [];
  const entries = Object.entries(modules);
  return entries
    .map(([id, content]) => {
      const m = (meta && meta[id]) || {};
      return {
        id,
        title: m.name || id,
        content: typeof content === 'string' ? content : (content && content.text) || '',
        order: m.order || 999,
      };
    })
    .sort((a, b) => a.order - b.order);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

Page({
  data: {
    loading: true,
    reports: [],
    selectedReport: null,
    needLogin: false,
  },

  onLoad() {
    this.checkAndFetch();
  },

  onShow() {
    // 返回页面时重新检查登录状态
    if (this.data.needLogin && isLoggedIn()) {
      this.checkAndFetch();
    }
  },

  /** 检查登录状态并获取数据 */
  checkAndFetch() {
    if (!isLoggedIn()) {
      this.setData({
        loading: false,
        needLogin: true,
        reports: [],
      });
      return;
    }
    this.setData({ needLogin: false });
    this.fetchReports();
  },

  async fetchReports() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/api/reports' });
      // Map list data from { reports: [...] }
      const rawReports = res.reports || (Array.isArray(res) ? res : []);

      const reports = rawReports.map(item => ({
        ...item,
        typeText: getTypeText(item.type),
        typeClass: getTypeClass(item.type),
        dateFormatted: formatDate(item.generatedAt || item.date),
        summary: ''
      }));

      this.setData({
        reports,
        loading: false
      });
    } catch (err) {
      logger.error('Failed to fetch reports', err);
      // 如果是认证错误，显示登录提示
      if (err.message && err.message.includes('refresh token')) {
        this.setData({
          reports: [],
          loading: false,
          needLogin: true,
        });
        return;
      }
      this.setData({
        reports: [],
        loading: false
      });
    }
  },

  /** 跳转到登录/个人中心 */
  goToLogin() {
    wx.switchTab({ url: '/pages/me/me' });
  },

  async onSelectReport(e) {
    const reportItem = e.currentTarget.dataset.report;
    if (!reportItem || !reportItem.id) return;

    wx.showLoading({ title: '加载中' });
    
    try {
      const res = await request({ url: `/api/reports/${reportItem.id}` });
      
      // Map details from { content, title, type, generatedAt }
      // Assume content contains the structured data needed for the view
      let detailData = res.content;
      // If content is a stringified JSON, parse it (API safety)
      if (typeof detailData === 'string') {
        try {
          detailData = JSON.parse(detailData);
        } catch (e) {
          logger.error('Parse content error', e);
        }
      }

      let normalizedContent;
      if (detailData && detailData.sections) {
        // 旧格式：直接使用 sections 数组
        normalizedContent = {
          ...detailData,
          sections: detailData.sections.map(section => ({
            ...section,
            advice: Array.isArray(section.advice) ? section.advice.join('；') : section.advice,
          })),
        };
      } else if (detailData && detailData.modules) {
        // 新格式（专题报告）：将 modules+meta 转为 sections
        normalizedContent = {
          ...detailData,
          sections: modulesToSections(detailData.modules, detailData.meta),
        };
      } else {
        normalizedContent = detailData;
      }

      const selectedReport = {
        ...res,
        content: normalizedContent || {}, 
        date: formatDate(res.generatedAt || res.date),
        typeText: getTypeText(res.type),
        typeClass: getTypeClass(res.type),
        summary: detailData && detailData.summary ? detailData.summary : ''
      };

      this.setData({ selectedReport });
    } catch (err) {
      logger.error('Failed to load report detail', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onBack() {
    if (this.data.selectedReport) {
      this.setData({ selectedReport: null });
    } else {
      wx.navigateBack();
    }
  }
});

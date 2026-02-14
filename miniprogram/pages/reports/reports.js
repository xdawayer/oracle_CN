const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');
const { markdownToHtml } = require('../../utils/markdown');

const isLoggedIn = () => !!storage.get('access_token');

const TYPE_TEXT_MAP = {
  synastry: '关系分析',
  daily: '每日洞察',
  natal: '深度解读',
  synthetica: '探索实验',
  'natal-report': '本命解读',
  'love-topic': '爱情专题',
  'career-topic': '事业专题',
  'wealth-topic': '财富专题',
  annual: '年度报告',
  monthly: '月度报告',
};

const getTypeText = (type) => TYPE_TEXT_MAP[type] || '分析报告';

const TYPE_CLASS_MAP = {
  synastry: 'tag-synastry',
  daily: 'tag-daily',
  natal: 'tag-natal',
  'natal-report': 'tag-natal',
  'love-topic': 'tag-love-topic',
  'career-topic': 'tag-career-topic',
  'wealth-topic': 'tag-wealth-topic',
  annual: 'tag-annual',
  monthly: 'tag-monthly',
};

const getTypeClass = (type) => TYPE_CLASS_MAP[type] || 'tag-default';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

/**
 * 将 modules+meta 格式转为渲染用的模块数组
 * 每个模块包含 { id, title, htmlContent, order }
 */
const buildModuleList = (modules, meta) => {
  if (!modules || typeof modules !== 'object') return [];
  return Object.entries(modules)
    .map(([id, content]) => {
      const m = (meta && meta[id]) || {};
      const raw = typeof content === 'string'
        ? content
        : (content && (content.content || content.text)) || '';
      return {
        id,
        title: m.name || id,
        htmlContent: markdownToHtml(raw),
        order: m.order != null ? m.order : 999,
      };
    })
    .sort((a, b) => a.order - b.order);
};

/**
 * 将旧格式 sections 数组转为渲染用的模块数组
 */
const buildSectionList = (sections) => {
  if (!Array.isArray(sections)) return [];
  return sections.map((section, idx) => {
    const parts = [];
    if (section.content) parts.push(section.content);
    if (Array.isArray(section.highlights) && section.highlights.length > 0) {
      parts.push(section.highlights.map(h => `- ${h}`).join('\n'));
    }
    if (section.advice) {
      const adviceText = Array.isArray(section.advice) ? section.advice.join('；') : section.advice;
      parts.push(`**建议**：${adviceText}`);
    }
    return {
      id: section.id || `section-${idx}`,
      title: section.title || '',
      htmlContent: markdownToHtml(parts.join('\n\n')),
      rating: section.rating || 0,
      order: idx,
    };
  });
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
    if (this.data.needLogin && isLoggedIn()) {
      this.checkAndFetch();
    }
  },

  checkAndFetch() {
    if (!isLoggedIn()) {
      this.setData({ loading: false, needLogin: true, reports: [] });
      return;
    }
    this.setData({ needLogin: false });
    this.fetchReports();
  },

  async fetchReports() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/api/reports' });
      const rawReports = res.reports || (Array.isArray(res) ? res : []);
      const reports = rawReports.map(item => ({
        ...item,
        typeText: getTypeText(item.type),
        typeClass: getTypeClass(item.type),
        dateFormatted: formatDate(item.generatedAt || item.date),
      }));
      this.setData({ reports, loading: false });
    } catch (err) {
      logger.error('Failed to fetch reports', err);
      if (err.message && err.message.includes('refresh token')) {
        this.setData({ reports: [], loading: false, needLogin: true });
        return;
      }
      this.setData({ reports: [], loading: false });
    }
  },

  goToLogin() {
    wx.switchTab({ url: '/pages/me/me' });
  },

  async onSelectReport(e) {
    const reportItem = e.currentTarget.dataset.report;
    if (!reportItem || !reportItem.id) return;

    wx.showLoading({ title: '加载中' });

    try {
      const res = await request({ url: `/api/reports/${reportItem.id}` });

      let detailData = res.content;
      if (typeof detailData === 'string') {
        try { detailData = JSON.parse(detailData); } catch (e) { logger.error('Parse content error', e); }
      }

      // 构建模块列表（兼容新旧两种格式）
      let moduleList = [];
      if (detailData && detailData.modules) {
        moduleList = buildModuleList(detailData.modules, detailData.meta);
      } else if (detailData && detailData.sections) {
        moduleList = buildSectionList(detailData.sections);
      }

      const selectedReport = {
        ...res,
        title: (detailData && detailData.title) || res.title || '',
        moduleList,
        date: formatDate(res.generatedAt || res.date),
        typeText: getTypeText(res.type),
        typeClass: getTypeClass(res.type),
        moduleCount: moduleList.length,
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
  },
});

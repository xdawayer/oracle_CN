/**
 * 通用报告展示页面
 *
 * 通过 URL 参数 reportType 确定报告类型，动态加载模块元数据和内容。
 * 支持异步任务轮询、Markdown 渲染、渐进式内容展示。
 */

const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

/**
 * HTML 转义函数，防止 XSS 攻击
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown 转 HTML 转换器
 * 支持标题、段落、粗体、斜体、列表、表格
 */
function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // 首个子标题不加额外间距，后续子标题加上分隔间距
  let headingCount = 0;

  // 子标题分隔：在非首个子标题前插入单行空白（rich-text 中 margin 不可靠，用实际元素占位）
  const spacer = '<div style="display:block;height:28rpx;"></div>';

  const styles = {
    h1: 'font-size:32rpx;color:#2c2c2c;font-weight:600;margin:24rpx 0 16rpx;padding-bottom:12rpx;line-height:1.6;display:block;border-bottom:1rpx solid #eee;',
    h2: 'font-size:30rpx;color:#2c2c2c;font-weight:600;margin:0 0 12rpx;line-height:1.6;display:block;',
    h2_first: 'font-size:30rpx;color:#2c2c2c;font-weight:600;margin:20rpx 0 12rpx;line-height:1.6;display:block;',
    h3: 'font-size:30rpx;color:#333;font-weight:600;margin:0 0 10rpx;line-height:1.6;display:block;',
    h3_first: 'font-size:30rpx;color:#333;font-weight:600;margin:20rpx 0 10rpx;line-height:1.6;display:block;',
    h4: 'font-size:28rpx;color:#444;font-weight:500;margin:0 0 8rpx;line-height:1.6;display:block;',
    h4_first: 'font-size:28rpx;color:#444;font-weight:500;margin:16rpx 0 8rpx;line-height:1.6;display:block;',
    p: 'margin:12rpx 0;line-height:1.8;font-size:28rpx;color:#555;display:block;',
    ul: 'margin:12rpx 0;padding-left:36rpx;display:block;list-style-type:disc;',
    ol: 'margin:12rpx 0;padding-left:36rpx;display:block;list-style-type:decimal;',
    li: 'margin:8rpx 0;line-height:1.8;font-size:28rpx;color:#555;display:list-item;',
    table: 'width:100%;border-collapse:collapse;margin:20rpx 0;font-size:24rpx;display:table;table-layout:fixed;',
    th: 'border:1rpx solid #ddd;padding:16rpx 12rpx;text-align:center;background:#f8f8f8;color:#333;font-weight:500;font-size:24rpx;word-break:break-all;letter-spacing:1rpx;',
    td: 'border:1rpx solid #ddd;padding:14rpx 10rpx;text-align:center;color:#666;font-size:24rpx;word-break:break-all;vertical-align:middle;letter-spacing:2rpx;',
    strong: 'color:#2c2c2c;font-weight:600;',
    em: 'font-style:italic;color:#666;',
  };

  let html = markdown;

  // 处理表格
  html = html.replace(/\|(.+)\|\n\|[-:\|\s]+\|\n((?:\|.+\|\n?)+)/g, (_, header, body) => {
    const headerCells = header.split('|')
      .filter(c => c.trim())
      .map(c => `<th style="${styles.th}">${escapeHtml(c.trim())}</th>`)
      .join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|')
        .filter(c => c.trim())
        .map(c => `<td style="${styles.td}">${escapeHtml(c.trim())}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table style="${styles.table}"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // 处理标题（h2/h3 非首个前插入空行+分隔线，首个保留正常 margin）
  html = html.replace(/^\s*####\s+(.+)$/gm, (_, content) => {
    headingCount++;
    if (headingCount > 1) {
      return `${spacer}<h4 style="${styles.h4}">${escapeHtml(content.trim())}</h4>`;
    }
    return `<h4 style="${styles.h4_first}">${escapeHtml(content.trim())}</h4>`;
  });
  html = html.replace(/^\s*###\s+(.+)$/gm, (_, content) => {
    headingCount++;
    if (headingCount > 1) {
      return `${spacer}<h3 style="${styles.h3}">${escapeHtml(content.trim())}</h3>`;
    }
    return `<h3 style="${styles.h3_first}">${escapeHtml(content.trim())}</h3>`;
  });
  html = html.replace(/^\s*##\s+(.+)$/gm, (_, content) => {
    headingCount++;
    if (headingCount > 1) {
      return `${spacer}<h2 style="${styles.h2}">${escapeHtml(content.trim())}</h2>`;
    }
    return `<h2 style="${styles.h2_first}">${escapeHtml(content.trim())}</h2>`;
  });
  html = html.replace(/^\s*#\s+(.+)$/gm, (_, content) => `<h1 style="${styles.h1}">${escapeHtml(content.trim())}</h1>`);

  // 处理粗体和斜体
  html = html.replace(/\*\*\*([^\s*][^*]*?[^\s*])\*\*\*/g, `<strong style="${styles.strong}"><em style="${styles.em}">$1</em></strong>`);
  html = html.replace(/___([^\s_][^_]*?[^\s_])___/g, `<strong style="${styles.strong}"><em style="${styles.em}">$1</em></strong>`);
  html = html.replace(/\*\*([^\s*][^*]*?[^\s*])\*\*/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/__([^\s_][^_]*?[^\s_])__/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/\*([^\s*][^*]*?[^\s*])\*/g, `<em style="${styles.em}">$1</em>`);
  html = html.replace(/\*\*([^\s*])\*\*/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/\*([^\s*])\*/g, `<em style="${styles.em}">$1</em>`);

  // 处理列表
  const lines = html.split('\n');
  const processed = [];
  let listItems = [];
  let listType = null;
  let paragraphContent = [];

  const flushParagraph = () => {
    if (paragraphContent.length > 0) {
      processed.push(`<p style="${styles.p}">${paragraphContent.join('<br/>')}</p>`);
      paragraphContent = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const listStyle = listType === 'ul' ? styles.ul : styles.ol;
      processed.push(`<${listType} style="${listStyle}">${listItems.join('')}</${listType}>`);
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isHtmlElement = trimmed.startsWith('<h') ||
                          trimmed.startsWith('<table') ||
                          trimmed.startsWith('<div') ||
                          trimmed.startsWith('</');
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (ulMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(`<li style="${styles.li}">${ulMatch[1]}</li>`);
    } else if (olMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(`<li style="${styles.li}">${olMatch[1]}</li>`);
    } else if (isHtmlElement) {
      flushParagraph();
      flushList();
      processed.push(line);
    } else {
      flushList();
      paragraphContent.push(trimmed);
    }
  }

  flushParagraph();
  flushList();

  return processed.join('');
}

/** 报告类型配置（标题、描述） */
const REPORT_TYPE_CONFIG = {
  'natal-report': {
    title: '核心人格解读',
    desc: '专属于你的全维度人格解析',
  },
  annual: {
    title: '2026 年度报告',
    desc: '专属于你的年度成长解读',
  },
  monthly: {
    title: '月度深度解读',
    desc: '30天节奏与行动指南',
  },
  'love-topic': {
    title: '爱情专题深度报告',
    desc: '恋爱人格、理想伴侣与感情模式',
  },
  'career-topic': {
    title: '事业专题深度报告',
    desc: '职业天赋、职场人际与事业潜能',
  },
  'wealth-topic': {
    title: '财富专题深度报告',
    desc: '金钱关系、财富潜力与理财心理',
  },
};

Page({
  data: {
    loading: true,
    hasContent: false,
    error: null,
    progress: 0,
    progressText: '准备中...',

    // 报告类型与配置
    reportType: '',
    reportTitle: '深度解读',
    reportDesc: '',

    // 任务状态
    taskStatus: 'none',
    taskMessage: '',

    // 动态模块列表（从 meta API 获取）
    moduleList: [],
    modules: {},
    moduleStatus: {},

    birth: null,
  },

  _pollTimer: null,
  POLL_INTERVAL: 3000,

  onLoad(options) {
    const reportType = options.reportType || 'natal-report';

    // 验证 reportType 是否在已知列表中
    if (!REPORT_TYPE_CONFIG[reportType]) {
      wx.showToast({ title: '未知的报告类型', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const config = REPORT_TYPE_CONFIG[reportType];

    this.setData({
      reportType,
      reportTitle: config.title,
      reportDesc: config.desc,
    });

    // 设置导航栏标题
    wx.setNavigationBarTitle({ title: config.title });

    // 获取用户出生信息
    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const birthProfile = {
      date: userProfile.birthDate,
      time: userProfile.birthTime || '12:00',
      city: userProfile.birthCity || '',
      lat: userProfile.lat,
      lon: userProfile.lon,
      timezone: userProfile.timezone || 'Asia/Shanghai',
      accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };

    this.setData({ birth: birthProfile });

    // 加载模块元数据，然后检查任务状态
    this.loadModuleMeta().then(() => {
      this.checkTaskAndLoadContent();
    });
  },

  onShow() {
    if (this.data.taskStatus === 'processing') {
      this._startPolling();
    }
  },

  onHide() {
    this._stopPolling();
  },

  onUnload() {
    this._stopPolling();
  },

  /** 加载报告模块元数据 */
  async loadModuleMeta() {
    const { reportType } = this.data;

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_META,
        method: 'GET',
        data: { reportType },
      });

      if (result && result.moduleIds && result.moduleMeta) {
        const moduleList = result.moduleIds.map(id => ({
          id,
          name: result.moduleMeta[id]?.name || id,
        }));

        const moduleStatus = {};
        moduleList.forEach(m => {
          moduleStatus[m.id] = 'pending';
        });

        this.setData({ moduleList, moduleStatus });
      }
    } catch (error) {
      console.error('Load module meta failed:', error);
      // 使用硬编码 fallback 模块列表
      const FALLBACK_MODULES = {
        'natal-report': [
          { id: 'overview', name: '人格总览' },
          { id: 'love', name: '爱情与亲密关系' },
          { id: 'career', name: '事业与人生方向' },
          { id: 'emotion', name: '情感与内在世界' },
          { id: 'mind', name: '思维与沟通方式' },
          { id: 'wealth', name: '财富与资源' },
          { id: 'health', name: '身心健康' },
          { id: 'soul', name: '人生课题与灵魂成长' },
        ],
        annual: [
          { id: 'overview', name: '年度总览' },
          { id: 'career', name: '事业财运' },
          { id: 'love', name: '感情关系' },
          { id: 'health', name: '身心健康' },
          { id: 'social', name: '人际社交' },
          { id: 'growth', name: '学习成长' },
          { id: 'q1', name: '第一季度详解' },
          { id: 'q2', name: '第二季度详解' },
          { id: 'q3', name: '第三季度详解' },
          { id: 'q4', name: '第四季度详解' },
          { id: 'lucky', name: '成长建议' },
        ],
        monthly: [
          { id: 'tone', name: '月度总基调' },
          { id: 'dimensions', name: '分维度分析' },
          { id: 'rhythm', name: '上中下旬节奏指南' },
          { id: 'lunar', name: '新月满月指南' },
          { id: 'dates', name: '关键日期速查表' },
          { id: 'actions', name: '月度行动清单' },
        ],
        'love-topic': [
          { id: 'personality', name: '恋爱人格画像' },
          { id: 'partner', name: '理想伴侣与关系模式' },
          { id: 'growth', name: '关系成长课题' },
          { id: 'forecast', name: '未来12个月感情趋势' },
        ],
        'career-topic': [
          { id: 'talent', name: '天赋与职业方向' },
          { id: 'workplace', name: '职场人际与领导力' },
          { id: 'mission', name: '人生使命与蜕变' },
          { id: 'forecast', name: '未来12个月事业趋势' },
        ],
        'wealth-topic': [
          { id: 'money-relation', name: '你与金钱的关系' },
          { id: 'potential', name: '财富潜力与增长路径' },
          { id: 'blindspot', name: '金钱盲区与理财建议' },
          { id: 'forecast', name: '未来12个月财富趋势' },
        ],
      };
      const fallback = FALLBACK_MODULES[this.data.reportType] || [];
      if (fallback.length > 0) {
        const moduleStatus = {};
        fallback.forEach(m => { moduleStatus[m.id] = 'pending'; });
        this.setData({ moduleList: fallback, moduleStatus });
      }
    }
  },

  /** 检查任务状态并加载内容 */
  async checkTaskAndLoadContent() {
    const { birth, reportType } = this.data;

    this.setData({
      loading: true,
      progressText: '正在检查任务状态...',
    });

    try {
      const statusResult = await request({
        url: API_ENDPOINTS.REPORT_STATUS,
        method: 'GET',
        data: {
          reportType,
          birth: JSON.stringify(birth),
        },
      });

      if (!statusResult || !statusResult.exists) {
        this.setData({
          loading: false,
          taskStatus: 'none',
          error: '报告任务不存在，请返回重新解锁',
        });
        return;
      }

      this.setData({
        taskStatus: statusResult.status,
        progress: statusResult.progress || 0,
        taskMessage: statusResult.message || '',
      });

      if (statusResult.status === 'completed' || statusResult.status === 'processing') {
        await this.loadReportContent();

        if (statusResult.status === 'processing') {
          this._startPolling();
        }
      } else if (statusResult.status === 'failed') {
        this.setData({
          loading: false,
          error: '报告生成失败，请返回重试',
        });
      } else if (statusResult.status === 'pending') {
        this.setData({
          loading: true,
          progressText: '任务等待中...',
        });
        this._startPolling();
      }
    } catch (error) {
      console.error('Check task status failed:', error);
      this.setData({
        loading: false,
        error: '检查任务状态失败: ' + (error.message || '网络错误'),
      });
    }
  },

  /** 加载报告内容 */
  async loadReportContent() {
    const { birth, reportType, moduleStatus, moduleList } = this.data;

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_CONTENT,
        method: 'GET',
        data: {
          reportType,
          birth: JSON.stringify(birth),
        },
      });

      if (result && result.modules) {
        const rawModules = result.modules;
        const completedModules = result.completedModules || [];

        // Markdown → HTML
        const modules = {};
        for (const [key, content] of Object.entries(rawModules)) {
          if (content && typeof content === 'string') {
            modules[key] = markdownToHtml(content);
          } else if (content && typeof content === 'object') {
            const text = content.content || content.text || JSON.stringify(content, null, 2);
            modules[key] = markdownToHtml(text);
          } else {
            modules[key] = '';
          }
        }

        // 更新模块状态
        const newModuleStatus = { ...moduleStatus };
        completedModules.forEach(id => {
          newModuleStatus[id] = 'completed';
        });

        const hasContent = completedModules.length > 0;
        const totalModules = moduleList.length || Object.keys(result.meta || {}).length || 1;
        const progress = Math.round((completedModules.length / totalModules) * 100);

        this.setData({
          loading: this.data.taskStatus === 'processing',
          hasContent,
          modules,
          moduleStatus: newModuleStatus,
          progress,
          progressText: progress === 100 ? '报告已生成完成' : `已完成 ${completedModules.length}/${totalModules} 个模块`,
        });
      } else {
        this.setData({
          loading: this.data.taskStatus === 'processing',
          progressText: '正在生成中...',
        });
      }
    } catch (error) {
      console.error('Load report content failed:', error);
      this.setData({
        loading: this.data.taskStatus === 'processing',
        progressText: '加载内容失败，继续等待...',
      });
    }
  },

  /** 开始轮询（递归 setTimeout 防止异步堆叠） */
  _startPolling() {
    this._stopPolling();
    this._polling = true;
    this._pollOnce();
  },

  async _pollOnce() {
    if (!this._polling) return;

    const { birth, reportType } = this.data;

    try {
      const statusResult = await request({
        url: API_ENDPOINTS.REPORT_STATUS,
        method: 'GET',
        data: {
          reportType,
          birth: JSON.stringify(birth),
        },
      });

      if (statusResult && statusResult.exists) {
        this.setData({
          taskStatus: statusResult.status,
          progress: statusResult.progress || 0,
          taskMessage: statusResult.message || '',
          progressText: statusResult.message || `已完成 ${statusResult.progress || 0}%`,
        });

        if (statusResult.status === 'completed' || statusResult.status === 'processing') {
          await this.loadReportContent();
        }

        if (statusResult.status === 'completed' || statusResult.status === 'failed') {
          this._polling = false;
          this.setData({ loading: false });

          if (statusResult.status === 'completed') {
            wx.showToast({ title: '报告生成完成', icon: 'success' });
          } else if (statusResult.status === 'failed') {
            this.setData({
              error: '部分模块生成失败，可以稍后重试',
            });
          }
          return;
        }
      }
    } catch (error) {
      console.error('Poll status failed:', error);
    }

    // 继续下一轮轮询
    if (this._polling) {
      this._pollTimer = setTimeout(() => this._pollOnce(), this.POLL_INTERVAL);
    }
  },

  /** 停止轮询 */
  _stopPolling() {
    this._polling = false;
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
  },

  /** 重试按钮（防抖） */
  async onRetry() {
    if (this._retrying) return;
    this._retrying = true;

    const { birth, reportType } = this.data;

    wx.showLoading({ title: '正在重试...' });

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_RETRY,
        method: 'POST',
        data: { reportType, birth },
      });

      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          error: null,
          taskStatus: 'processing',
          loading: true,
          progressText: '重试中...',
        });
        this._startPolling();
        wx.showToast({ title: '重试任务已启动', icon: 'success' });
      } else {
        wx.showToast({ title: result?.error || '重试失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '重试失败', icon: 'none' });
    } finally {
      this._retrying = false;
    }
  },

  /** 返回上一页 */
  onBack() {
    wx.navigateBack();
  },
});

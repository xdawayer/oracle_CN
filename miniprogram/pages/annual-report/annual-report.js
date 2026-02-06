/**
 * 2026 年度报告页面
 *
 * 使用异步任务 API 获取报告内容
 * 支持 Markdown 内容渲染
 */

const { request } = require('../../utils/request');
const storage = require('../../utils/storage');

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
 * 简单的 Markdown 转 HTML 转换器
 * 支持标题、段落、粗体、斜体、列表、表格
 * 使用内联样式确保在 rich-text 中正确渲染
 */
function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // 首个子标题不加额外间距，后续子标题加分隔线和额外间距
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

  // 处理表格（需要在其他处理之前）
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

  // 处理粗体和斜体（使用更精确的正则，避免匹配乘法符号等）
  // 粗斜体：***text*** 或 ___text___
  html = html.replace(/\*\*\*([^\s*][^*]*?[^\s*])\*\*\*/g, `<strong style="${styles.strong}"><em style="${styles.em}">$1</em></strong>`);
  html = html.replace(/___([^\s_][^_]*?[^\s_])___/g, `<strong style="${styles.strong}"><em style="${styles.em}">$1</em></strong>`);
  // 粗体：**text** 或 __text__
  html = html.replace(/\*\*([^\s*][^*]*?[^\s*])\*\*/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/__([^\s_][^_]*?[^\s_])__/g, `<strong style="${styles.strong}">$1</strong>`);
  // 斜体：*text*（要求前后不是空格，避免匹配乘法）
  html = html.replace(/\*([^\s*][^*]*?[^\s*])\*/g, `<em style="${styles.em}">$1</em>`);
  // 处理单字符的粗体/斜体
  html = html.replace(/\*\*([^\s*])\*\*/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/\*([^\s*])\*/g, `<em style="${styles.em}">$1</em>`);

  // 处理列表 - 收集连续的列表项后统一包装
  const lines = html.split('\n');
  const processed = [];
  let listItems = [];
  let listType = null; // 'ul' 或 'ol'
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

    // 检查是否是已处理的 HTML 元素
    const isHtmlElement = trimmed.startsWith('<h') ||
                          trimmed.startsWith('<table') ||
                          trimmed.startsWith('<div') ||
                          trimmed.startsWith('</');

    // 检查是否是无序列表项
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    // 检查是否是有序列表项
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (ulMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') {
        flushList();
      }
      listType = 'ul';
      // 不转义，因为内容可能包含已处理的粗体/斜体 HTML（数据来自后端 AI，可信）
      listItems.push(`<li style="${styles.li}">${ulMatch[1]}</li>`);
    } else if (olMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') {
        flushList();
      }
      listType = 'ol';
      // 不转义，因为内容可能包含已处理的粗体/斜体 HTML（数据来自后端 AI，可信）
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

  // 处理剩余内容
  flushParagraph();
  flushList();

  return processed.join('');
}

/** 模块配置 */
const MODULE_LIST = [
  { id: 'overview', name: '年度总览' },
  { id: 'career', name: '事业财运' },
  { id: 'love', name: '感情关系' },
  { id: 'health', name: '身心健康' },
  { id: 'social', name: '人际社交' },
  { id: 'growth', name: '学习成长' },
  { id: 'q1', name: '第一季度' },
  { id: 'q2', name: '第二季度' },
  { id: 'q3', name: '第三季度' },
  { id: 'q4', name: '第四季度' },
  { id: 'lucky', name: '成长建议' },
];

Page({
  data: {
    loading: true,
    hasContent: false,
    error: null,
    progress: 0,
    progressText: '准备中...',

    // 任务状态
    taskStatus: 'none', // none | pending | processing | completed | failed
    taskMessage: '',

    moduleList: MODULE_LIST,
    modules: {},
    moduleStatus: {},

    birth: null,
  },

  /** 轮询定时器 */
  _pollTimer: null,

  /** 轮询间隔（毫秒） */
  POLL_INTERVAL: 3000,

  onLoad(options) {
    // 获取用户出生信息
    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 转换为后端 API 期望的格式
    const birthProfile = {
      date: userProfile.birthDate,
      time: userProfile.birthTime || '12:00',
      city: userProfile.birthCity || '',
      lat: userProfile.lat,
      lon: userProfile.lon,
      timezone: userProfile.timezone || 'Asia/Shanghai',
      accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };

    // 初始化模块状态
    const moduleStatus = {};
    MODULE_LIST.forEach((m) => {
      moduleStatus[m.id] = 'pending';
    });

    this.setData({
      birth: birthProfile,
      moduleStatus,
    });

    // 检查任务状态并加载内容
    this.checkTaskAndLoadContent();
  },

  onShow() {
    // 如果正在处理中，继续轮询
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

  /** 检查任务状态并加载内容 */
  async checkTaskAndLoadContent() {
    const { birth } = this.data;

    this.setData({
      loading: true,
      progressText: '正在检查任务状态...',
    });

    try {
      // 查询任务状态
      const statusResult = await request({
        url: '/api/annual-task/status',
        method: 'GET',
        data: { birth: JSON.stringify(birth) },
      });

      if (!statusResult || !statusResult.exists) {
        // 任务不存在，提示用户
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
        // 任务已完成或正在进行，获取已有内容
        await this.loadReportContent();

        // 如果还在处理中，继续轮询
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
    const { birth, moduleStatus } = this.data;

    try {
      const result = await request({
        url: '/api/annual-task/content',
        method: 'GET',
        data: { birth: JSON.stringify(birth) },
      });

      if (result && result.modules) {
        const rawModules = result.modules;
        const completedModules = result.completedModules || [];

        // 将 Markdown 内容转换为 HTML（用于 rich-text 组件）
        const modules = {};
        for (const [key, content] of Object.entries(rawModules)) {
          if (content && typeof content === 'string') {
            modules[key] = markdownToHtml(content);
          } else if (content && typeof content === 'object') {
            // 兼容旧格式：如果是对象，尝试提取文本内容
            const text = content.content || content.text || JSON.stringify(content, null, 2);
            modules[key] = markdownToHtml(text);
          } else {
            modules[key] = '';
          }
        }

        // 更新模块状态
        const newModuleStatus = { ...moduleStatus };
        completedModules.forEach((id) => {
          newModuleStatus[id] = 'completed';
        });

        const hasContent = completedModules.length > 0;
        const progress = Math.round((completedModules.length / MODULE_LIST.length) * 100);

        this.setData({
          loading: this.data.taskStatus === 'processing',
          hasContent,
          modules,
          moduleStatus: newModuleStatus,
          progress,
          progressText: progress === 100 ? '报告已生成完成' : `已完成 ${completedModules.length}/${MODULE_LIST.length} 个模块`,
        });
      } else {
        this.setData({
          loading: this.data.taskStatus === 'processing',
          progressText: '正在生成中...',
        });
      }
    } catch (error) {
      console.error('Load report content failed:', error);
      // 不设置 error，允许继续轮询
      this.setData({
        loading: this.data.taskStatus === 'processing',
        progressText: '加载内容失败，继续等待...',
      });
    }
  },

  /** 开始轮询 */
  _startPolling() {
    this._stopPolling();

    this._pollTimer = setInterval(async () => {
      const { birth } = this.data;

      try {
        // 查询任务状态
        const statusResult = await request({
          url: '/api/annual-task/status',
          method: 'GET',
          data: { birth: JSON.stringify(birth) },
        });

        if (statusResult && statusResult.exists) {
          this.setData({
            taskStatus: statusResult.status,
            progress: statusResult.progress || 0,
            taskMessage: statusResult.message || '',
            progressText: statusResult.message || `已完成 ${statusResult.progress || 0}%`,
          });

          // 如果有新的已完成模块，加载内容
          if (statusResult.status === 'completed' || statusResult.status === 'processing') {
            await this.loadReportContent();
          }

          // 如果任务完成或失败，停止轮询
          if (statusResult.status === 'completed' || statusResult.status === 'failed') {
            this._stopPolling();

            if (statusResult.status === 'completed') {
              wx.showToast({ title: '报告生成完成', icon: 'success' });
            } else if (statusResult.status === 'failed') {
              this.setData({
                error: '部分模块生成失败，可以稍后重试',
              });
            }
          }
        }
      } catch (error) {
        console.error('Poll status failed:', error);
        // 继续轮询，不停止
      }
    }, this.POLL_INTERVAL);
  },

  /** 停止轮询 */
  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  /** 重试按钮 */
  async onRetry() {
    const { birth } = this.data;

    wx.showLoading({ title: '正在重试...' });

    try {
      const result = await request({
        url: '/api/annual-task/retry',
        method: 'POST',
        data: { birth },
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
    }
  },

  /** 返回上一页 */
  onBack() {
    wx.navigateBack();
  },
});

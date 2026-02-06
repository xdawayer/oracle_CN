const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

// 专题报告元数据（用于支付弹窗展示）
const TOPIC_REPORT_META = {
  'love-topic': {
    title: '爱情专题深度报告',
    subtitle: '专属恋爱深度解读',
    features: [
      { title: '恋爱人格分析', desc: '深层心理揭示你的爱情模式' },
      { title: '理想伴侣画像', desc: '性格中隐藏的灵魂伴侣线索' },
      { title: '情感成长指南', desc: '亲密关系中的课题与蜕变方向' },
      { title: '感情趋势预测', desc: '未来一年的恋爱关键节点' },
    ],
    price: 500,
    note: '约 5000-8000 字深度解读，永久保存',
  },
  'career-topic': {
    title: '事业专题深度报告',
    subtitle: '专属职场深度解读',
    features: [
      { title: '职业天赋分析', desc: '性格驱动力揭示你的事业方向' },
      { title: '职场人际风格', desc: '团队协作与领导力的心理密码' },
      { title: '使命与发展路径', desc: '使命感指引的人生事业蓝图' },
      { title: '事业趋势预测', desc: '未来一年的职场关键机遇' },
    ],
    price: 500,
    note: '约 5000-8000 字深度解读，永久保存',
  },
  'wealth-topic': {
    title: '财富专题深度报告',
    subtitle: '专属财富深度解读',
    features: [
      { title: '金钱关系解读', desc: '深层价值观揭示你的财富观' },
      { title: '财富潜力分析', desc: '性格深处的财富潜力密码' },
      { title: '理财盲点洞察', desc: '性格中隐藏的财务风险信号' },
      { title: '财运趋势预测', desc: '未来一年的财富关键节点' },
    ],
    price: 500,
    note: '约 5000-8000 字深度解读，永久保存',
  },
};

Page({
  data: {
    features: [
      { id: 'kline', title: '人生K线', desc: '成长起伏趋势', route: 'kline', colorClass: 'bg-indigo', icon: '/images/icons/career.svg' },
      { id: 'pairing', title: '性格配对', desc: '契合度指数', route: 'pairing', colorClass: 'bg-rose', icon: '/images/icons/love.svg' },
      { id: 'chart', title: '专业图谱', desc: '性格/周期/趋势', route: 'chart', colorClass: 'bg-purple', icon: '/images/astro-symbols/sun.svg' },
      { id: 'cbt', title: '心情日记', desc: '记录心情与 AI 解读', route: 'cbt', colorClass: 'bg-emerald', icon: '/images/icons/health.svg' },
      { id: 'ask', title: 'AI 问答', desc: 'AI 深度咨询', route: 'ask', colorClass: 'bg-violet', icon: '/images/icons/relations.svg' },
      { id: 'wiki', title: '知识百科', desc: '系统化知识库', route: 'wiki', colorClass: 'bg-blue', icon: '/images/icons/study.svg' }
    ],
    // 专题报告状态
    loveTopicStatus: 'none',
    loveTopicProgress: 0,
    careerTopicStatus: 'none',
    careerTopicProgress: 0,
    wealthTopicStatus: 'none',
    wealthTopicProgress: 0,
    // 支付弹窗状态
    showPayment: false,
    paymentLoading: false,
    currentReportType: '',
    paymentMeta: null, // 当前弹窗显示的报告元数据
  },

  _topicPolling: false,
  _topicPollTimer: null,

  navToSynastry() {
    wx.navigateTo({ url: '/pages/synastry/synastry' });
  },

  onShow() {
    const entry = storage.get('discovery_entry');
    if (entry === 'synastry') {
      storage.remove('discovery_entry');
      wx.navigateTo({ url: '/pages/synastry/synastry' });
    }
    this.checkTopicReportStatuses();
  },

  onHide() {
    this._stopTopicReportPolling();
  },

  onUnload() {
    this._stopTopicReportPolling();
  },

  navToSynthetica() {
    wx.navigateTo({ url: '/pages/synthetica/synthetica' });
  },

  navToFeature(e) {
    const route = e.currentTarget.dataset.route;
    wx.navigateTo({ url: `/pages/${route}/${route}` });
  },

  // ========== 专题报告逻辑 ==========

  _getBirthData() {
    const userProfile = storage.get('user_profile');
    if (!userProfile || !userProfile.birthDate) return null;
    return {
      date: userProfile.birthDate,
      time: userProfile.birthTime || '12:00',
      city: userProfile.birthCity || '',
      lat: userProfile.lat,
      lon: userProfile.lon,
      timezone: userProfile.timezone || 'Asia/Shanghai',
      accuracy: userProfile.accuracyLevel === 'approximate' ? 'approximate' : 'exact',
    };
  },

  async checkTopicReportStatuses() {
    const birthData = this._getBirthData();
    if (!birthData) return;

    const types = ['love-topic', 'career-topic', 'wealth-topic'];
    const stateKeys = {
      'love-topic': { status: 'loveTopicStatus', progress: 'loveTopicProgress' },
      'career-topic': { status: 'careerTopicStatus', progress: 'careerTopicProgress' },
      'wealth-topic': { status: 'wealthTopicStatus', progress: 'wealthTopicProgress' },
    };

    let hasProcessing = false;

    for (const reportType of types) {
      try {
        const result = await request({
          url: API_ENDPOINTS.REPORT_STATUS,
          method: 'GET',
          data: { reportType, birth: JSON.stringify(birthData) },
        });

        if (result && result.exists) {
          this.setData({
            [stateKeys[reportType].status]: result.status,
            [stateKeys[reportType].progress]: result.progress || 0,
          });
          if (result.status === 'processing') hasProcessing = true;
        } else {
          this.setData({
            [stateKeys[reportType].status]: 'none',
            [stateKeys[reportType].progress]: 0,
          });
        }
      } catch (error) {
        console.log(`Check ${reportType} status:`, error?.statusCode || error);
        this.setData({ [stateKeys[reportType].status]: 'none' });
      }
    }

    if (hasProcessing) {
      this._startTopicReportPolling();
    }
  },

  onTopicReportTap(e) {
    const reportType = e.currentTarget.dataset.type;
    if (!reportType) return;

    const statusMap = {
      'love-topic': this.data.loveTopicStatus,
      'career-topic': this.data.careerTopicStatus,
      'wealth-topic': this.data.wealthTopicStatus,
    };
    const status = statusMap[reportType] || 'none';

    switch (status) {
      case 'none':
        this.showPaymentSheet(reportType);
        break;
      case 'pending':
      case 'processing':
      case 'completed':
        wx.navigateTo({ url: `/pages/report/report?reportType=${reportType}` });
        break;
      case 'failed':
        wx.showModal({
          title: '生成失败',
          content: '报告生成过程中出现错误，是否重试？',
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this.retryTopicReport(reportType);
          },
        });
        break;
      default:
        this.showPaymentSheet(reportType);
    }
  },

  // ========== 支付弹窗逻辑 ==========

  showPaymentSheet(reportType) {
    const meta = TOPIC_REPORT_META[reportType];
    if (!meta) return;
    if (wx.hideTabBar) {
      wx.hideTabBar({ animation: false });
    }
    this.setData({
      showPayment: true,
      currentReportType: reportType,
      paymentMeta: meta,
    });
  },

  closePayment() {
    if (wx.showTabBar) {
      wx.showTabBar({ animation: false });
    }
    this.setData({
      showPayment: false,
      paymentLoading: false,
    });
  },

  async handlePay() {
    const reportType = this.data.currentReportType;
    if (!reportType) return;

    this.setData({ paymentLoading: true });

    const birthData = this._getBirthData();
    if (!birthData) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      this.setData({ paymentLoading: false });
      return;
    }

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_CREATE,
        method: 'POST',
        data: { reportType, birth: birthData, lang: 'zh' },
      });

      if (result && result.success) {
        // 关闭弹窗
        this.closePayment();

        const stateKeys = {
          'love-topic': 'loveTopicStatus',
          'career-topic': 'careerTopicStatus',
          'wealth-topic': 'wealthTopicStatus',
        };
        this.setData({ [stateKeys[reportType]]: result.status });

        if (result.isNew) {
          wx.showModal({
            title: '任务已创建',
            content: '报告将在后台生成，预计需要数分钟。\n\n生成完成后可在此页面查看。',
            showCancel: false,
            confirmText: '知道了',
          });
          this._startTopicReportPolling();
        } else if (result.status === 'completed') {
          wx.navigateTo({ url: `/pages/report/report?reportType=${reportType}` });
        } else if (result.status === 'processing') {
          wx.showToast({ title: '报告正在生成中...', icon: 'loading' });
          this._startTopicReportPolling();
        }
      } else {
        wx.showToast({ title: result?.error || '创建任务失败', icon: 'none' });
      }
    } catch (error) {
      console.error(`Create ${reportType} task error:`, error);
      wx.showToast({ title: '创建任务失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ paymentLoading: false });
    }
  },

  async retryTopicReport(reportType) {
    const birthData = this._getBirthData();
    if (!birthData) {
      wx.showToast({ title: '请先完善出生信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在重试...' });

    try {
      const result = await request({
        url: API_ENDPOINTS.REPORT_RETRY,
        method: 'POST',
        data: { reportType, birth: birthData },
      });

      wx.hideLoading();

      if (result && result.success) {
        const stateKeys = {
          'love-topic': 'loveTopicStatus',
          'career-topic': 'careerTopicStatus',
          'wealth-topic': 'wealthTopicStatus',
        };
        this.setData({ [stateKeys[reportType]]: 'processing' });
        wx.showToast({ title: '重试任务已启动', icon: 'success' });
        this._startTopicReportPolling();
      } else {
        wx.showToast({ title: result?.error || '重试失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '重试失败', icon: 'none' });
    }
  },

  // ========== 轮询机制 ==========

  _startTopicReportPolling() {
    if (this._topicPollTimer) {
      clearTimeout(this._topicPollTimer);
    }
    this._topicPolling = true;
    this._pollTopicOnce();
  },

  async _pollTopicOnce() {
    if (!this._topicPolling) return;

    await this.checkTopicReportStatuses();

    const anyProcessing = ['loveTopicStatus', 'careerTopicStatus', 'wealthTopicStatus']
      .some(k => this.data[k] === 'processing');

    if (!anyProcessing) {
      this._topicPolling = false;
      this._topicPollTimer = null;
      const anyCompleted = ['loveTopicStatus', 'careerTopicStatus', 'wealthTopicStatus']
        .some(k => this.data[k] === 'completed');
      if (anyCompleted) {
        wx.showToast({ title: '专题报告已生成', icon: 'success' });
      }
      return;
    }

    if (this._topicPolling) {
      this._topicPollTimer = setTimeout(() => this._pollTopicOnce(), 5000);
    }
  },

  _stopTopicReportPolling() {
    this._topicPolling = false;
    if (this._topicPollTimer) {
      clearTimeout(this._topicPollTimer);
      this._topicPollTimer = null;
    }
  },
});

const { request, requestStream } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

const GOALS = [
  { id: 'career', label: '事业发展与财富' },
  { id: 'love', label: '感情婚恋关系' },
  { id: 'growth', label: '个人成长与自我认知' },
  { id: 'social', label: '人际关系与社交' },
  { id: 'health', label: '健康与生活平衡' },
];

const SUGGESTED_QUESTIONS = {
  'career': [
    '我的职业天赋和潜能在哪些领域？',
    '目前的工作是否符合我的本命能量？',
    '如何突破当前的职业瓶颈？',
    '适合我的领导风格和团队角色是什么？',
    '创业或跳槽的时机如何判断？',
    '如何平衡事业野心与内在需求？',
    '我的财富模式有什么特点？',
    '哪些行业或方向更适合长期发展？',
    '职场人际关系的核心课题是什么？',
    '如何将星盘中的挑战转化为事业优势？'
  ],
  'love': [
    '我在亲密关系中的核心需求是什么？',
    '什么样的伴侣特质与我最契合？',
    '我的依恋模式对感情有什么影响？',
    '如何识别和疗愈感情中的投射？',
    '当前感情状态的根本议题是什么？',
    '如何在关系中保持个人边界？',
    '我对伴侣的期待是否现实？',
    '感情中反复出现的模式说明什么？',
    '如何在亲密关系中实现共同成长？',
    '单身期是在为我准备什么功课？'
  ],
  'growth': [
    '我的本命盘揭示了怎样的人生主题？',
    '内心深处最核心的恐惧是什么？',
    '如何认识和整合我的阴影面？',
    '我的防御机制是如何形成的？',
    '哪些童年经历塑造了现在的我？',
    '我的灵魂这一生要学习什么课题？',
    '如何找到真正的自我价值感？',
    '目前人生阶段的核心发展任务是什么？',
    '如何活出更真实的自己？',
    '内在的矛盾冲突该如何调和？'
  ],
  'social': [
    '我在社交中的能量模式是什么？',
    '为什么某些关系总让我感到消耗？',
    '如何识别真正的朋友和贵人？',
    '我的沟通方式有什么盲点？',
    '如何在社交中保持能量边界？',
    '家庭关系中的核心课题是什么？',
    '如何处理与权威人物的关系？',
    '我的社交恐惧或焦虑从何而来？',
    '如何建立真正滋养的人际连接？',
    '团队协作中如何发挥我的优势？'
  ],
  'health': [
    '我的身心能量有什么特点？',
    '压力和情绪如何影响我的身体？',
    '什么样的生活节奏最适合我？',
    '如何建立可持续的健康习惯？',
    '我的睡眠和休息模式需要注意什么？',
    '哪些身体信号需要特别关注？',
    '如何找到适合自己的运动方式？',
    '情绪健康和身体健康的关联是什么？',
    '如何在忙碌中保持身心平衡？',
    '我的能量周期有什么规律？'
  ]
};

Page({
  data: {
    inputValue: '',
    inputFocus: false,
    isLoading: false,
    goals: GOALS,
    currentGoalIndex: 0,
    currentGoalId: 'career',
    currentGoalLabel: '事业发展与财富',
    currentSuggestions: SUGGESTED_QUESTIONS['career'],

    // 全屏报告状态
    showReport: false,
    reportLoading: false,
    reportData: null,
    reportQuestion: '',
    reportCategory: '',

    // 星盘数据（用于报告内展示）
    reportChartData: null,
    reportTransitData: null
  },

  onLoad(options) {
    this.userProfile = storage.get('user_profile');
    if (!this.userProfile) {
      wx.showToast({
        title: '请先完善个人资料',
        icon: 'none',
        duration: 2000
      });
    }

    // 从配对页面跳转过来
    if (options && options.from === 'pairing') {
      this.pairingContext = {
        signA: options.signA,
        signB: options.signB,
        signAName: decodeURIComponent(options.signAName || ''),
        signBName: decodeURIComponent(options.signBName || ''),
        animalA: decodeURIComponent(options.animalA || ''),
        animalB: decodeURIComponent(options.animalB || ''),
        score: options.score,
        summary: decodeURIComponent(options.summary || '')
      };

      this.setData({
        currentGoalId: 'love',
        currentGoalLabel: '感情婚恋关系',
        currentGoalIndex: 1,
        currentSuggestions: [
          `${this.pairingContext.signAName}和${this.pairingContext.signBName}吵架会怎样？`,
          '我们日常相处最容易在什么事上闹别扭？',
          '怎么让我们的关系越来越好？',
          '我们性格上最大的差异是什么？',
          '长期在一起需要注意什么坑？'
        ]
      });
    }
  },

  onGoalChange(e) {
    const index = parseInt(e.detail.value);
    const selectedGoal = this.data.goals[index];
    this.setData({
      currentGoalIndex: index,
      currentGoalId: selectedGoal.id,
      currentGoalLabel: selectedGoal.label,
      currentSuggestions: SUGGESTED_QUESTIONS[selectedGoal.id]
    });
  },

  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  onSuggestionClick(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    this.setData({ inputValue: text, inputFocus: true });
  },

  onSend() {
    const text = this.data.inputValue.trim();
    if (!text) return;
    this.sendMessage(text);
  },

  async sendMessage(text) {
    if (this.data.isLoading) return;
    if (!this.userProfile) {
      wx.showToast({
        title: '请先在"我的"页面完善资料',
        icon: 'none'
      });
      return;
    }

    const { currentGoalId, currentGoalLabel } = this.data;

    this.setData({
      inputValue: '',
      isLoading: true,
      showReport: true,
      reportLoading: true,
      reportQuestion: text,
      reportCategory: currentGoalLabel,
      reportData: null,
      reportChartData: null,
      reportTransitData: null
    });

    const birth = {
      date: this.userProfile.birthDate,
      time: this.userProfile.birthTime || '12:00',
      city: this.userProfile.birthCity,
      lat: this.userProfile.lat,
      lon: this.userProfile.lon,
      timezone: this.userProfile.timezone,
      accuracy: this.userProfile.accuracyLevel || 'approximate'
    };

    const requestData = {
      birth,
      question: text,
      category: currentGoalId,
      context: currentGoalLabel,
      lang: 'zh'
    };

    if (this.pairingContext) {
      requestData.pairingContext = this.pairingContext;
    }

    // 使用流式请求，逐步渲染 AI 内容
    let streamText = '';
    let _flushTimer = null;
    const FLUSH_INTERVAL = 100; // 每 100ms 最多刷新一次 UI

    const flushToUI = (force) => {
      if (_flushTimer && !force) return; // 已有定时器等待中
      if (force && _flushTimer) {
        clearTimeout(_flushTimer);
        _flushTimer = null;
      }
      if (force) {
        this.setData({ reportData: streamText, reportLoading: false });
        return;
      }
      _flushTimer = setTimeout(() => {
        _flushTimer = null;
        this.setData({ reportData: streamText, reportLoading: false });
      }, FLUSH_INTERVAL);
    };

    this._streamTask = requestStream({
      url: `${API_ENDPOINTS.ASK}/stream`,
      method: 'POST',
      data: requestData,
      onMeta: (meta) => {
        this.setData({
          reportChartData: meta.chart || null,
          reportTransitData: meta.transits || null
        });
      },
      onChunk: (chunk) => {
        streamText += chunk;
        flushToUI(false);
      },
      onDone: () => {
        if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
        this.setData({
          reportData: streamText,
          reportLoading: false,
          isLoading: false
        });
        this._streamTask = null;
      },
      onError: (err) => {
        console.error('Ask Stream Error:', err);
        // 如果流式未获得任何内容，降级为非流式请求
        if (!streamText) {
          this._fallbackNonStream(requestData);
        } else {
          // 已有部分内容，显示已获取的部分
          this.setData({
            reportData: streamText,
            reportLoading: false,
            isLoading: false
          });
          this._streamTask = null;
        }
      }
    });
  },

  async _fallbackNonStream(requestData) {
    try {
      const res = await request({
        url: API_ENDPOINTS.ASK,
        method: 'POST',
        data: requestData
      });

      if (res && res.content) {
        const reportData = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
        this.setData({
          reportData,
          reportChartData: res.chart || null,
          reportTransitData: res.transits || null,
          reportLoading: false
        });
      } else {
        throw new Error('No content received');
      }
    } catch (error) {
      console.error('Ask AI Fallback Error:', error);
      wx.showToast({
        title: '星象连接中断，请稍后再试',
        icon: 'none'
      });
      this.setData({
        showReport: false,
        reportLoading: false,
        reportData: null
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  closeReport() {
    // 取消进行中的流式请求
    if (this._streamTask) {
      this._streamTask.abort();
      this._streamTask = null;
    }
    this.setData({
      showReport: false,
      reportLoading: false,
      reportData: null,
      reportChartData: null,
      reportTransitData: null,
      reportQuestion: '',
      reportCategory: ''
    });
  }
});

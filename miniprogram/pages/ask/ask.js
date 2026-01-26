const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

const GOALS = [
  { id: 'career', label: '财运事业' },
  { id: 'love', label: '婚恋关系' },
  { id: 'study', label: '学业考试' },
  { id: 'health', label: '健康平安' },
  { id: 'social', label: '人际关系' },
  { id: 'growth', label: '心理成长' },
];

const SUGGESTED_QUESTIONS = {
  'career': [
    '近期职场发展顺遂吗？', '什么时候适合跳槽？', '如何提升财富积累？', '创业时机成熟了吗？',
    '领导对我的看法如何？', '如何化解职场小人？', '今年有加薪机会吗？', '第二职业的发展前景？',
    '目前的投资理财建议？', '如何缓解当下的工作焦虑？'
  ],
  'love': [
    '我的正缘什么时候出现？', '和现任的契合度如何？', '如何改善目前的感情状态？', '前任会复合吗？',
    '对方对我是真心的吗？', '什么时候适合结婚？', '感情中的核心障碍是什么？', '如何吸引心仪的对象？',
    '目前的冷战如何化解？', '未来婚姻生活的发展趋势？'
  ],
  'study': [
    '近期考试运势如何？', '如何提高学习效率？', '考研或出国留学的建议？', '选专业或跨行业的方向？',
    '如何有效克服考试焦虑？', '老师或导师的助力如何？', '深造还是就业的抉择？', '学术瓶颈如何突破？',
    '适合在哪个城市发展学业？', '基础薄弱如何快速追赶？'
  ],
  'health': [
    '最近身心状态如何？', '需要注意哪些潜在健康问题？', '如何改善睡眠质量？', '近期适合远行旅游吗？',
    '运动健身的专业建议？', '情绪压力大的根源在哪？', '如何保持能量平衡？', '家庭成员的健康状况？',
    '日常作息调整建议？', '平安出行的特别提醒？'
  ],
  'social': [
    '如何化解社交恐惧？', '身边的朋友谁是贵人？', '如何处理与室友的矛盾？', '如何提升个人影响力？',
    '如何建立深度的友谊？', '近期有社交惊喜吗？', '如何拒绝不合理的请求？', '如何看清一个人的真实面目？',
    '和长辈的沟通瓶颈如何化解？', '合作方的信任度分析？'
  ],
  'growth': [
    '我潜意识里的核心恐惧？', '如何建立真正的自信心？', '我的人生使命是什么？', '如何处理原生家庭阴影？',
    '当下的迷茫如何化解？', '如何提升直觉力和洞察力？', '我需要学习的灵魂课题？', '如何面对失败和挫折？',
    '如何找到内在的平静？', '我的天赋潜能在哪？'
  ]
};

Page({
  data: {
    messages: [
      { role: 'model', text: '你好，我是你的AI星象顾问。请在上方选择你的咨询目标，我会为你提供最专业的指引。' }
    ],
    inputValue: '',
    isLoading: false,
    goals: GOALS,
    currentGoalIndex: 0,
    currentGoalId: 'career',
    currentGoalLabel: '财运事业',
    currentSuggestions: SUGGESTED_QUESTIONS['career'],
    scrollTop: 0,
    toView: '',
    paddingBottom: 0
  },

  onLoad() {
    this.userProfile = storage.get('user_profile');
    if (!this.userProfile) {
      wx.showToast({
        title: '请先完善个人资料',
        icon: 'none',
        duration: 2000
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
    this.sendMessage(text);
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

    const { messages, currentGoalId, currentGoalLabel } = this.data;

    const userMsg = { role: 'user', text };
    const newMessages = [...messages, userMsg];

    this.setData({
      messages: newMessages,
      inputValue: '',
      isLoading: true,
      toView: `msg-${newMessages.length - 1}`
    });

    try {
      const birth = {
        date: this.userProfile.birthDate,
        time: this.userProfile.birthTime || '12:00',
        city: this.userProfile.birthCity,
        lat: this.userProfile.lat,
        lon: this.userProfile.lon,
        timezone: this.userProfile.timezone,
        accuracy: this.userProfile.accuracyLevel || 'approximate'
      };

      const res = await request({
        url: API_ENDPOINTS.ASK,
        method: 'POST',
        data: {
          birth,
          question: text,
          category: currentGoalId,
          context: currentGoalLabel,
          lang: 'zh'
        }
      });

      if (res && res.content) {
        const aiMsg = {
          role: 'model',
          text: res.content,
          chartData: res.chartData || null // 如果后端返回星盘数据
        };
        const updatedMessages = [...newMessages, aiMsg];
        this.setData({
          messages: updatedMessages,
          toView: `msg-${updatedMessages.length - 1}`
        });
      } else {
        throw new Error('No content received');
      }

    } catch (error) {
      console.error('Ask AI Error:', error);
      const errorMsg = { role: 'model', text: '抱歉，星象连接中断，请稍后再试。' };
      const updatedMessages = [...newMessages, errorMsg];
      this.setData({
        messages: updatedMessages,
        toView: `msg-${updatedMessages.length - 1}`
      });
    } finally {
      this.setData({
        isLoading: false
      });
    }
  }
});

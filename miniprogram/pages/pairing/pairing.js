const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');
const logger = require('../../utils/logger');

const ZODIAC_SIGNS = [
  { id: 'aries', name: '3.21 - 4.19', emoji: 'ARI', element: 'fire' },
  { id: 'taurus', name: '4.20 - 5.20', emoji: 'TAU', element: 'earth' },
  { id: 'gemini', name: '5.21 - 6.21', emoji: 'GEM', element: 'air' },
  { id: 'cancer', name: '6.22 - 7.22', emoji: 'CAN', element: 'water' },
  { id: 'leo', name: '7.23 - 8.22', emoji: 'LEO', element: 'fire' },
  { id: 'virgo', name: '8.23 - 9.22', emoji: 'VIR', element: 'earth' },
  { id: 'libra', name: '9.23 - 10.23', emoji: 'LIB', element: 'air' },
  { id: 'scorpio', name: '10.24 - 11.22', emoji: 'SCO', element: 'water' },
  { id: 'sagittarius', name: '11.23 - 12.21', emoji: 'SAG', element: 'fire' },
  { id: 'capricorn', name: '12.22 - 1.19', emoji: 'CAP', element: 'earth' },
  { id: 'aquarius', name: '1.20 - 2.18', emoji: 'AQU', element: 'air' },
  { id: 'pisces', name: '2.19 - 3.20', emoji: 'PIS', element: 'water' },
];

const ZODIAC_MATCH_DATA = {
  'aries': { best: ['leo', 'sagittarius', 'gemini'], poor: ['taurus', 'virgo', 'scorpio'] },
  'taurus': { best: ['virgo', 'capricorn', 'cancer'], poor: ['aries', 'gemini', 'sagittarius'] },
  'gemini': { best: ['libra', 'aquarius', 'aries'], poor: ['taurus', 'cancer', 'scorpio'] },
  'cancer': { best: ['scorpio', 'pisces', 'taurus'], poor: ['gemini', 'leo', 'sagittarius'] },
  'leo': { best: ['aries', 'sagittarius', 'gemini'], poor: ['cancer', 'virgo', 'capricorn'] },
  'virgo': { best: ['taurus', 'capricorn', 'cancer'], poor: ['aries', 'leo', 'libra'] },
  'libra': { best: ['gemini', 'aquarius', 'leo'], poor: ['taurus', 'virgo', 'scorpio'] },
  'scorpio': { best: ['cancer', 'pisces', 'virgo'], poor: ['gemini', 'libra', 'aries'] },
  'sagittarius': { best: ['aries', 'leo', 'libra'], poor: ['taurus', 'cancer', 'scorpio'] },
  'capricorn': { best: ['taurus', 'virgo', 'scorpio'], poor: ['gemini', 'leo', 'sagittarius'] },
  'aquarius': { best: ['gemini', 'libra', 'sagittarius'], poor: ['cancer', 'virgo', 'capricorn'] },
  'pisces': { best: ['cancer', 'scorpio', 'capricorn'], poor: ['aries', 'leo', 'libra'] }
};

Page({
  data: {
    zodiacSigns: ZODIAC_SIGNS,

    signAIndex: 0,
    signBIndex: 1,

    step: 1,
    loading: false,
    aiLoading: false,
    finalData: null,
    aiData: null,
    iconErrorA: false,
    iconErrorB: false
  },

  onLoad() {
  },

  bindSignAChange(e) {
    this.setData({ signAIndex: parseInt(e.detail.value), iconErrorA: false });
  },
  bindSignBChange(e) {
    this.setData({ signBIndex: parseInt(e.detail.value), iconErrorB: false });
  },

  onIconErrorA() {
    this.setData({ iconErrorA: true });
  },

  onIconErrorB() {
    this.setData({ iconErrorB: true });
  },

  // 前端快速预计算（作为兜底和即时反馈）
  calculateQuickResult() {
    const signA = ZODIAC_SIGNS[this.data.signAIndex];
    const signB = ZODIAC_SIGNS[this.data.signBIndex];

    let score = 65;
    const dims = {
      emotional: 60,
      personality: 60,
      communication: 60,
      potential: 60,
      rhythm: 60,
      values: 60
    };

    const match = ZODIAC_MATCH_DATA[signA.id];
    if (match.best.includes(signB.id)) {
      score += 20;
      dims.emotional += 30;
      dims.communication += 25;
      dims.personality += 15;
    } else if (match.poor.includes(signB.id)) {
      score -= 10;
      dims.potential -= 20;
      dims.rhythm -= 10;
    } else {
      score += 5;
      dims.personality += 10;
      dims.values += 10;
    }

    const finalScore = Math.min(98, Math.max(50, score));
    Object.keys(dims).forEach(k => {
      dims[k] = Math.min(100, Math.max(35, dims[k]));
    });

    return {
      score: finalScore,
      dimensions: [
        { key: 'emotional', label: '情感共鸣', score: dims.emotional, desc: '' },
        { key: 'personality', label: '性格互补', score: dims.personality, desc: '' },
        { key: 'communication', label: '沟通默契', score: dims.communication, desc: '' },
        { key: 'potential', label: '长期潜力', score: dims.potential, desc: '' },
        { key: 'rhythm', label: '生活节奏', score: dims.rhythm, desc: '' },
        { key: 'values', label: '价值观', score: dims.values, desc: '' }
      ],
      analysis: '',
      tips: [],
      signA,
      signB
    };
  },

  handleMatch() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    const quickResult = this.calculateQuickResult();

    // 立即切换到报告页面，显示快速预计算结果
    this.setData({
      step: 2,
      loading: false,
      aiLoading: true,
      finalData: quickResult,
      aiData: null
    });

    wx.setNavigationBarTitle({ title: '配对报告' });

    // 异步请求 AI 深度分析
    this.fetchAIAnalysis(quickResult);
  },

  async fetchAIAnalysis(quickResult) {
    try {
      const res = await request({
        url: API_ENDPOINTS.PAIRING,
        method: 'POST',
        data: {
          signA: quickResult.signA.id,
          signB: quickResult.signB.id
        }
      });

      if (res && res.content) {
        const aiContent = res.content;
        // 用 AI 结果替换维度描述、分析文字和建议
        // 以 quickResult 维度为基准合并，防止 AI 返回数量不一致
        const aiDims = aiContent.dimensions || [];
        const merged = {
          ...quickResult,
          score: aiContent.score || quickResult.score,
          dimensions: quickResult.dimensions.map((qd, i) => {
            const ad = aiDims[i];
            return ad
              ? { ...qd, score: ad.score || qd.score, desc: ad.desc || '' }
              : qd;
          }),
          analysis: aiContent.analysis || '',
          tips: aiContent.tips || []
        };

        this.setData({
          finalData: merged,
          aiData: aiContent,
          aiLoading: false
        });
      } else {
        this.setData({ aiLoading: false });
      }
    } catch (error) {
      logger.error('Pairing AI Error:', error);
      this.setData({ aiLoading: false });
    }
  },

  goBack() {
    this.setData({
      step: 1,
      finalData: null,
      aiData: null,
      aiLoading: false
    });
    wx.setNavigationBarTitle({ title: '性格速配' });
  },

  goToAsk() {
    const { finalData, aiData } = this.data;
    if (!finalData) return;

    const summary = aiData
      ? (aiData.analysis || '').substring(0, 100)
      : `性格配对契合度${finalData.score}%`;

    const params = [
      `from=pairing`,
      `signA=${finalData.signA.id}`,
      `signB=${finalData.signB.id}`,
      `signAName=${encodeURIComponent(finalData.signA.name)}`,
      `signBName=${encodeURIComponent(finalData.signB.name)}`,
      `score=${finalData.score}`,
      `summary=${encodeURIComponent(summary)}`
    ].join('&');

    wx.navigateTo({
      url: `/pages/ask/ask?${params}`
    });
  }
});

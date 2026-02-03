const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');

const ZODIAC_SIGNS = [
  { id: 'aries', name: '白羊座', emoji: 'ARI', element: 'fire' },
  { id: 'taurus', name: '金牛座', emoji: 'TAU', element: 'earth' },
  { id: 'gemini', name: '双子座', emoji: 'GEM', element: 'air' },
  { id: 'cancer', name: '巨蟹座', emoji: 'CAN', element: 'water' },
  { id: 'leo', name: '狮子座', emoji: 'LEO', element: 'fire' },
  { id: 'virgo', name: '处女座', emoji: 'VIR', element: 'earth' },
  { id: 'libra', name: '天秤座', emoji: 'LIB', element: 'air' },
  { id: 'scorpio', name: '天蝎座', emoji: 'SCO', element: 'water' },
  { id: 'sagittarius', name: '射手座', emoji: 'SAG', element: 'fire' },
  { id: 'capricorn', name: '摩羯座', emoji: 'CAP', element: 'earth' },
  { id: 'aquarius', name: '水瓶座', emoji: 'AQU', element: 'air' },
  { id: 'pisces', name: '双鱼座', emoji: 'PIS', element: 'water' },
];

const ANIMAL_SIGNS = [
  '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'
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

const ANIMAL_BONUS = {
  '鼠': ['龙', '猴', '牛'], '牛': ['鼠', '蛇', '鸡'], '虎': ['马', '狗', '猪'],
  '兔': ['羊', '狗', '猪'], '龙': ['鼠', '猴', '鸡'], '蛇': ['牛', '鸡', '猴'],
  '马': ['虎', '羊', '狗'], '羊': ['兔', '马', '猪'], '猴': ['鼠', '龙', '蛇'],
  '鸡': ['牛', '龙', '蛇'], '狗': ['虎', '兔', '马'], '猪': ['虎', '兔', '羊']
};

Page({
  data: {
    zodiacSigns: ZODIAC_SIGNS,
    animalSigns: ANIMAL_SIGNS,

    signAIndex: 0,
    animalAIndex: 0,
    signBIndex: 1,
    animalBIndex: 1,

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
  bindAnimalAChange(e) {
    this.setData({ animalAIndex: parseInt(e.detail.value) });
  },
  bindSignBChange(e) {
    this.setData({ signBIndex: parseInt(e.detail.value), iconErrorB: false });
  },
  bindAnimalBChange(e) {
    this.setData({ animalBIndex: parseInt(e.detail.value) });
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
    const animalA = ANIMAL_SIGNS[this.data.animalAIndex];
    const signB = ZODIAC_SIGNS[this.data.signBIndex];
    const animalB = ANIMAL_SIGNS[this.data.animalBIndex];

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

    if (ANIMAL_BONUS[animalA] && ANIMAL_BONUS[animalA].includes(animalB)) {
      score += 8;
      dims.potential += 15;
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
      signB,
      animalA,
      animalB
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
          signB: quickResult.signB.id,
          animalA: quickResult.animalA,
          animalB: quickResult.animalB
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
      console.error('Pairing AI Error:', error);
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
    wx.setNavigationBarTitle({ title: '星缘速配' });
  },

  goToAsk() {
    const { finalData, aiData } = this.data;
    if (!finalData) return;

    const summary = aiData
      ? (aiData.analysis || '').substring(0, 100)
      : `${finalData.signA.name}与${finalData.signB.name}的配对契合度${finalData.score}%`;

    const params = [
      `from=pairing`,
      `signA=${finalData.signA.id}`,
      `signB=${finalData.signB.id}`,
      `signAName=${encodeURIComponent(finalData.signA.name)}`,
      `signBName=${encodeURIComponent(finalData.signB.name)}`,
      `animalA=${encodeURIComponent(finalData.animalA)}`,
      `animalB=${encodeURIComponent(finalData.animalB)}`,
      `score=${finalData.score}`,
      `summary=${encodeURIComponent(summary)}`
    ].join('&');

    wx.navigateTo({
      url: `/pages/ask/ask?${params}`
    });
  }
});

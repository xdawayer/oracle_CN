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
    
    loading: false,
    loadingText: '同步星盘数据...',
    showResult: false,
    finalData: null
  },

  onLoad() {
  },

  onBack() {
    wx.navigateBack();
  },

  bindSignAChange(e) {
    this.setData({ signAIndex: parseInt(e.detail.value) });
  },
  bindAnimalAChange(e) {
    this.setData({ animalAIndex: parseInt(e.detail.value) });
  },
  bindSignBChange(e) {
    this.setData({ signBIndex: parseInt(e.detail.value) });
  },
  bindAnimalBChange(e) {
    this.setData({ animalBIndex: parseInt(e.detail.value) });
  },

  calculateResult() {
    const signA = ZODIAC_SIGNS[this.data.signAIndex];
    const animalA = ANIMAL_SIGNS[this.data.animalAIndex];
    const signB = ZODIAC_SIGNS[this.data.signBIndex];
    const animalB = ANIMAL_SIGNS[this.data.animalBIndex];

    let score = 65;
    const dims = {
      emotional: 60,
      personality: 60,
      communication: 60,
      potential: 60
    };

    const match = ZODIAC_MATCH_DATA[signA.id];
    if (match.best.includes(signB.id)) {
      score += 20;
      dims.emotional += 30;
      dims.communication += 25;
    } else if (match.poor.includes(signB.id)) {
      score -= 10;
      dims.potential -= 20;
    } else {
      score += 5;
      dims.personality += 10;
    }

    if (ANIMAL_BONUS[animalA] && ANIMAL_BONUS[animalA].includes(animalB)) {
      score += 8;
      dims.potential += 15;
    }

    const finalScore = Math.min(98, Math.max(50, score));

    Object.keys(dims).forEach(k => {
      dims[k] = Math.min(100, Math.max(35, dims[k]));
    });

    const isHighScore = finalScore >= 85;
    const analysisText = isHighScore
      ? `你们的能量场在接触的一瞬间便产生了某种“跨越时空的既视感”。${signA.name}与${signB.name}的结合，往往在价值观上有着天然的共振，即便是在沉默中，你们也能感知到对方的频率。属${animalA}与属${animalB}的生肖加持，让这段关系多了一层“天注定”的稳固感。`
      : `这是一段充满“挑战性魅力”的关系。你们在某些核心层面上存在差异，但这正是吸引力产生的根源。虽然在${dims.communication < 60 ? '日常沟通中可能存在某些微妙的错位' : '生活习惯上需要更多的耐心'}，但只要愿意尝试站在对方的视角看世界，这段关系将带来巨大的自我突破。`;

    return {
      score: finalScore,
      dims,
      signA,
      signB,
      animalA,
      animalB,
      analysisText
    };
  },

  handleMatch() {
    if (this.data.loading) return;

    this.setData({ 
      loading: true,
      loadingText: '正在计算...'
    });

    const result = this.calculateResult();
    this.setData({
      finalData: result,
      loading: false,
      showResult: true
    });
  },

  closeResult() {
    this.setData({ showResult: false });
  }
});

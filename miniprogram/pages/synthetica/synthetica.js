const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');

const PLANETS = [
  { id: 'sun', name: '太阳', tier: 1 },
  { id: 'moon', name: '月亮', tier: 1 },
  { id: 'mercury', name: '水星', tier: 2 },
  { id: 'venus', name: '金星', tier: 2 },
  { id: 'mars', name: '火星', tier: 2 },
  { id: 'jupiter', name: '木星', tier: 3 },
  { id: 'saturn', name: '土星', tier: 3 },
  { id: 'uranus', name: '天王星', tier: 4 },
  { id: 'neptune', name: '海王星', tier: 4 },
  { id: 'pluto', name: '冥王星', tier: 4 },
  { id: 'chiron', name: '凯龙星', tier: 4 },
  { id: 'north_node', name: '北交点', tier: 3 },
];
const SIGNS = [
  { id: 'aries', name: '白羊座' },
  { id: 'taurus', name: '金牛座' },
  { id: 'gemini', name: '双子座' },
  { id: 'cancer', name: '巨蟹座' },
  { id: 'leo', name: '狮子座' },
  { id: 'virgo', name: '处女座' },
  { id: 'libra', name: '天秤座' },
  { id: 'scorpio', name: '天蝎座' },
  { id: 'sagittarius', name: '射手座' },
  { id: 'capricorn', name: '摩羯座' },
  { id: 'aquarius', name: '水瓶座' },
  { id: 'pisces', name: '双鱼座' },
];
const HOUSES = Array.from({ length: 12 }, (_, i) => {
  const id = `h${i + 1}`;
  const archetypes = [
    '自我与外在呈现',
    '价值与资源',
    '沟通与学习',
    '家庭与根基',
    '创造与恋爱',
    '日常与健康',
    '关系与合作',
    '亲密与转化',
    '远行与信念',
    '事业与使命',
    '社群与愿景',
    '潜意识与疗愈',
  ];
  return { id, name: `第 ${i + 1} 宫`, archetype: archetypes[i] };
});
const ASPECT_TYPES = [
  { id: 'conjunction', name: '合相 (0°)', category: 'FUSION' },
  { id: 'sextile', name: '六合 (60°)', category: 'FLOW' },
  { id: 'square', name: '刑相位 (90°)', category: 'FRICTION' },
  { id: 'trine', name: '拱相位 (120°)', category: 'FLOW' },
  { id: 'opposition', name: '对分相 (180°)', category: 'FRICTION' },
];
const CONTEXTS = [
  { id: 'LOVE', label: '爱情关系' },
  { id: 'CAREER', label: '事业发展' },
  { id: 'SELF', label: '自我认知' },
  { id: 'HEALING', label: '心灵疗愈' },
  { id: 'TIMING', label: '时机选择' },
  { id: 'SOCIAL', label: '人际社交' },
];

Page({
  data: {
    PLANETS,
    SIGNS,
    HOUSES,
    ASPECT_TYPES,
    CONTEXTS,
    
    planetIndex: 0,
    signIndex: 0,
    houseIndex: 0,
    contextIndex: 2,

    params: {
      planet: PLANETS[0],
      sign: SIGNS[0],
      house: HOUSES[0],
      context: CONTEXTS[2],
      aspects: [],
    },

    viewState: 'idle',
    result: null,
    error: ''
  },

  onLoad() {
  },

  onContextChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      contextIndex: idx,
      'params.context': CONTEXTS[idx]
    });
  },

  onPlanetChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      planetIndex: idx,
      'params.planet': PLANETS[idx]
    });
  },

  onSignChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      signIndex: idx,
      'params.sign': SIGNS[idx]
    });
  },

  onHouseChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      houseIndex: idx,
      'params.house': HOUSES[idx]
    });
  },

  addAspect() {
    const newAspect = { 
      typeIndex: 0, 
      targetIndex: 1,
      type: ASPECT_TYPES[0],
      target: PLANETS[1]
    };
    const aspects = [...this.data.params.aspects, newAspect];
    this.setData({ 'params.aspects': aspects });
  },

  removeAspect(e) {
    const index = e.currentTarget.dataset.index;
    const aspects = this.data.params.aspects.filter((_, i) => i !== index);
    this.setData({ 'params.aspects': aspects });
  },

  onAspectTypeChange(e) {
    const index = e.currentTarget.dataset.index;
    const typeIdx = parseInt(e.detail.value);
    const aspects = [...this.data.params.aspects];
    
    aspects[index].typeIndex = typeIdx;
    aspects[index].type = ASPECT_TYPES[typeIdx];
    
    this.setData({ 'params.aspects': aspects });
  },

  onAspectTargetChange(e) {
    const index = e.currentTarget.dataset.index;
    const targetIdx = parseInt(e.detail.value);
    const aspects = [...this.data.params.aspects];
    
    aspects[index].targetIndex = targetIdx;
    aspects[index].target = PLANETS[targetIdx];
    
    this.setData({ 'params.aspects': aspects });
  },

  async handleGenerate() {
    if (this.data.viewState === 'loading') return;

    this.setData({ viewState: 'loading', result: null, error: '' });

    const { params } = this.data;
    try {
      const payload = {
        planet: params.planet,
        sign: params.sign,
        house: params.house,
        context: params.context.id,
        aspects: params.aspects.map(item => ({
          planet: item.target,
          aspect: item.type,
        })),
        lang: 'zh'
      };

      const res = await request({
        url: API_ENDPOINTS.SYNTHETICA_GENERATE,
        method: 'POST',
        data: payload
      });

      const content = res && res.content ? res.content : res;

      // 兼容新旧两种数据格式
      let result = null;
      if (content && (content.report_title || content.synthesis || content.modules)) {
        // 新格式：直接使用
        result = content;
      } else if (content && (content.overview || content.planet_analysis)) {
        // 旧格式：转换为新格式
        const modules = [];
        if (content.planet_analysis) {
          modules.push({
            headline: '行星落座解读',
            analysis: content.planet_analysis.interpretation || '',
            shadow_side: '',
            actionable_advice: ''
          });
        }
        if (content.life_theme) {
          modules.push({
            headline: content.life_theme.title || '人生主题',
            analysis: content.life_theme.description || '',
            shadow_side: '',
            actionable_advice: ''
          });
        }
        if (content.practical_guidance) {
          modules.push({
            headline: '实用指南',
            analysis: (content.practical_guidance.strengths || []).join('；'),
            shadow_side: (content.practical_guidance.challenges || []).join('；'),
            actionable_advice: content.practical_guidance.advice || ''
          });
        }
        result = {
          report_title: content.overview?.title || '星象解析',
          synthesis: content.overview?.summary || '',
          modules
        };
      }

      if (result) {
        this.setData({ result, viewState: 'report' });
      } else {
        throw new Error('No content');
      }

    } catch (err) {
      console.error(err);
      this.setData({ error: '解析失败，请稍后重试。', viewState: 'error' });
      wx.showToast({ title: '连接中断', icon: 'none' });
    }
  },

  closeReport() {
    this.setData({ viewState: 'idle' });
  }
});

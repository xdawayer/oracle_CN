const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');

const CHART_TYPES = [
  { id: 'natal', label: '本命盘 (Natal Chart)', desc: '核心性格、天赋与人生底色', dual: false },
  { id: 'synastry', label: '合盘 - 比较盘 (Synastry)', desc: '两人关系的互动与磨合分析', dual: true },
  { id: 'transit', label: '行运盘 (Transit)', desc: '当前星象对个人的实时影响', dual: false },
  { id: 'composite', label: '合盘 - 组合盘 (Composite)', desc: '两人作为共同体的命运走向', dual: true },
  { id: 'davison', label: '合盘 - 时空盘 (Davison)', desc: '关系的中长期演化轨迹', dual: true },
  { id: 'solar_return', label: '推运 - 太阳返照 (Solar Return)', desc: '生日起算的年度运势规划', dual: false },
  { id: 'pro_secondary', label: '推运 - 次限盘 (Secondary)', desc: '长期的心理状态与内在演化', dual: false },
  { id: 'pro_tertiary', label: '推运 - 三限盘 (Tertiary)', desc: '短期的情绪波动与事件预警', dual: false },
];

Page({
  data: {
    chartTypes: CHART_TYPES,
    selectedTypeIndex: 0,
    selectedType: CHART_TYPES[0],
    
    personA: {
      name: '',
      date: '',
      time: '',
      city: ''
    },
    personB: {
      name: '',
      date: '',
      time: '',
      city: ''
    },

    loading: false,
    result: null,
    resultKind: ''
  },

  onLoad() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      'personA.date': today,
      'personB.date': today,
      'personA.time': '12:00',
      'personB.time': '12:00'
    });
  },

  onBack() {
    wx.navigateBack();
  },

  handleTypeChange(e) {
    const idx = e.detail.value;
    const type = this.data.chartTypes[idx];
    this.setData({
      selectedTypeIndex: idx,
      selectedType: type,
      result: null
    });
  },
  
  handleInput(e) {
    const { field, person } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`${person}.${field}`]: value
    });
  },

  resetResult() {
    this.setData({ result: null, resultKind: '' });
  },

  async generateChart() {
    const { selectedType, personA, personB } = this.data;
    const isDual = selectedType.dual;

    if (!personA.name || !personA.city) {
      wx.showToast({ title: '请完善甲方资料', icon: 'none' });
      return;
    }
    
    if (isDual && (!personB.name || !personB.city)) {
      wx.showToast({ title: '请完善乙方资料', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      let endpoint = API_ENDPOINTS.NATAL_CHART;
      let query = '';
      const buildParams = (person, prefix = '') => {
        const params = [];
        if (person.date) {
          params.push(`${prefix}Date=${encodeURIComponent(person.date)}`);
        }
        if (person.time) {
          params.push(`${prefix}Time=${encodeURIComponent(person.time)}`);
        }
        if (person.city) {
          params.push(`${prefix}City=${encodeURIComponent(person.city)}`);
        }
        params.push(`${prefix}Accuracy=exact`);
        return params;
      };

      if (isDual) {
        endpoint = API_ENDPOINTS.SYNASTRY_TECHNICAL;
        const params = [...buildParams(personA, 'a'), ...buildParams(personB, 'b')];
        query = params.join('&');
      } else {
        query = buildParams(personA).join('&');
      }

      const res = await request({
        url: `${endpoint}?${query}`,
        method: 'GET'
      });
      
      this.setData({
        result: isDual ? res.technical : res.chart,
        resultKind: isDual ? 'synastry' : 'natal'
      });

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '排盘失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});

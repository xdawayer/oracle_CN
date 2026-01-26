const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');

Page({
  data: {
    step: 1,
    nameA: '',
    nameB: '',
    relation: 'romantic',
    resultReady: false,
    activeTab: 'overview',
    loading: false,

    openDropdown: null,

    showManager: false,
    managerMode: 'list',
    profiles: [],
    formData: {
      id: '',
      name: '',
      birthDate: '',
      birthTime: '',
      birthCity: '',
      currentCity: '',
      timezone: '',
      accuracy: ''
    },

    relations: [
      { id: 'romantic', label: '恋人' },
      { id: 'spouse', label: '配偶' },
      { id: 'friend', label: '朋友' },
      { id: 'colleague', label: '同事' },
      { id: 'family', label: '家人' }
    ],
    resultTabs: [
      { id: 'overview', label: '综述' },
      { id: 'natal_a', label: '本命A' },
      { id: 'natal_b', label: '本命B' },
      { id: 'syn_ab', label: '对比盘AB' },
      { id: 'syn_ba', label: '对比盘BA' },
      { id: 'composite', label: '组合盘' }
    ],

    overviewData: {
      score: null,
      keywords: [],
      scores: [],
      growthTask: null,
      summary: '',
      disclaimer: ''
    },
    tabContents: {},
    currentSectionText: '',
    currentSectionTitle: '',

    // 星盘数据
    synastryChartData: {
      innerPositions: [],
      outerPositions: [],
      aspects: [],
      houseCusps: []
    }
  },

  onLoad() {
    this.loadProfiles();
  },

  onBack() {
    wx.navigateBack();
  },

  loadProfiles() {
    const profiles = storage.get('synastry_profiles', []);
    this.setData({ profiles: Array.isArray(profiles) ? profiles : [] });
  },

  openManager() {
    this.setData({ showManager: true, managerMode: 'list' });
  },

  closeManager() {
    this.setData({ showManager: false });
  },

  preventProp() {
  },

  setListMode() {
    this.setData({ managerMode: 'list' });
  },

  startCreate() {
    this.setData({
      managerMode: 'form',
      formData: { id: '', name: '', birthDate: '', birthTime: '', birthCity: '', currentCity: '', timezone: '', accuracy: '' }
    });
  },

  startEdit(e) {
    const profile = e.currentTarget.dataset.profile;
    this.setData({
      managerMode: 'form',
      formData: { ...profile }
    });
  },

  deleteProfile(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除这个档案吗？',
      success: (res) => {
        if (res.confirm) {
          const newProfiles = this.data.profiles.filter(p => p.id !== id);
          this.setData({ profiles: newProfiles });
          storage.set('synastry_profiles', newProfiles);
        }
      }
    });
  },

  onFormName(e) { this.setData({ 'formData.name': e.detail.value }); },
  onFormDate(e) { this.setData({ 'formData.birthDate': e.detail.value }); },
  onFormTime(e) { this.setData({ 'formData.birthTime': e.detail.value }); },
  onFormCity(e) { this.setData({ 'formData.birthCity': e.detail.value }); },
  onFormCurrentCity(e) { this.setData({ 'formData.currentCity': e.detail.value }); },

  saveProfile() {
    const { formData, profiles, nameA, nameB } = this.data;
    if (!formData.name || !formData.birthDate) return;

    let newProfiles = [...profiles];
    if (formData.id) {
      newProfiles = newProfiles.map(p => p.id === formData.id ? formData : p);
    } else {
      const newP = { ...formData, id: Date.now().toString() };
      newProfiles.push(newP);
      
      if (!nameA) this.setData({ nameA: newP.name });
      else if (!nameB) this.setData({ nameB: newP.name });
    }

    this.setData({ profiles: newProfiles, managerMode: 'list' });
    storage.set('synastry_profiles', newProfiles);
  },

  onInputA(e) {
    this.profileA = null;
    this.setData({ nameA: e.detail.value });
  },
  onInputB(e) {
    this.profileB = null;
    this.setData({ nameB: e.detail.value });
  },
  
  onFocusA() { this.setData({ openDropdown: 'A' }); },
  onFocusB() { this.setData({ openDropdown: 'B' }); },

  toggleDropdownA() {
    this.setData({ openDropdown: this.data.openDropdown === 'A' ? null : 'A' });
  },
  toggleDropdownB() {
    this.setData({ openDropdown: this.data.openDropdown === 'B' ? null : 'B' });
  },

  closeDropdown() {
    this.setData({ openDropdown: null });
  },

  selectProfileA(e) {
    const profile = e.currentTarget.dataset.profile;
    if (profile.name === this.data.nameB) {
      wx.showToast({ title: '不能选同一人', icon: 'none' });
      return;
    }
    this.profileA = profile;
    this.setData({ nameA: profile.name, openDropdown: null });
  },

  selectProfileB(e) {
    const profile = e.currentTarget.dataset.profile;
    if (profile.name === this.data.nameA) {
      wx.showToast({ title: '不能选同一人', icon: 'none' });
      return;
    }
    this.profileB = profile;
    this.setData({ nameB: profile.name, openDropdown: null });
  },

  setRelation(e) {
    this.setData({ relation: e.currentTarget.dataset.id });
  },

  resolveProfileByName(name) {
    if (!name) return null;
    return this.data.profiles.find(profile => profile.name === name) || null;
  },

  buildBirthParams(profile, prefix) {
    const params = [];
    params.push(`${prefix}Date=${encodeURIComponent(profile.birthDate || '')}`);
    params.push(`${prefix}City=${encodeURIComponent(profile.birthCity || '')}`);
    if (profile.birthTime) params.push(`${prefix}Time=${encodeURIComponent(profile.birthTime)}`);
    if (profile.timezone) params.push(`${prefix}Timezone=${encodeURIComponent(profile.timezone)}`);
    if (profile.lat !== undefined) params.push(`${prefix}Lat=${encodeURIComponent(profile.lat)}`);
    if (profile.lon !== undefined) params.push(`${prefix}Lon=${encodeURIComponent(profile.lon)}`);
    const accuracy = profile.accuracy || profile.accuracyLevel || 'approximate';
    params.push(`${prefix}Accuracy=${encodeURIComponent(accuracy)}`);
    return params;
  },

  buildSynastryQuery(tabId) {
    const { nameA, nameB, relation, relations } = this.data;
    const relationLabel = relations.find(r => r.id === relation)?.label || '关系';
    const profileA = this.resolveProfileByName(nameA) || this.profileA;
    const profileB = this.resolveProfileByName(nameB) || this.profileB;

    if (!profileA || !profileB) {
      return null;
    }

    const params = [
      ...this.buildBirthParams(profileA, 'a'),
      ...this.buildBirthParams(profileB, 'b'),
      `nameA=${encodeURIComponent(nameA)}`,
      `nameB=${encodeURIComponent(nameB)}`,
      `relationType=${encodeURIComponent(relationLabel)}`,
      'lang=zh'
    ];
    if (tabId) params.push(`tab=${encodeURIComponent(tabId)}`);
    return params.join('&');
  },

  ensureProfilesReady() {
    const { nameA, nameB } = this.data;
    const profileA = this.resolveProfileByName(nameA) || this.profileA;
    const profileB = this.resolveProfileByName(nameB) || this.profileB;
    if (!profileA || !profileB) {
      wx.showToast({ title: '请先在档案中创建并选择双方资料', icon: 'none' });
      return null;
    }
    if (!profileA.birthDate || !profileA.birthCity || !profileB.birthDate || !profileB.birthCity) {
      wx.showToast({ title: '请完善双方出生信息', icon: 'none' });
      return null;
    }
    return { profileA, profileB };
  },

  parseOverview(content) {
    const overview = content && content.overview ? content.overview : {};
    const scores = Array.isArray(overview.compatibility_scores) ? overview.compatibility_scores : [];
    const scoreValue = scores.length
      ? Math.round(scores.reduce((sum, item) => sum + (item.score || 0), 0) / scores.length)
      : null;
    return {
      score: scoreValue,
      keywords: Array.isArray(overview.keywords) ? overview.keywords : [],
      scores,
      growthTask: overview.growth_task || null,
      summary: content && content.conclusion ? content.conclusion.summary : '',
      disclaimer: content && content.conclusion ? content.conclusion.disclaimer : ''
    };
  },

  // 准备对比盘数据
  prepareSynastryChartData(result) {
    if (!result || !result.natal_a || !result.natal_b) {
      return {
        innerPositions: [],
        outerPositions: [],
        aspects: [],
        houseCusps: []
      };
    }

    // 内环：A的本命盘
    const innerPositions = result.natal_a.positions || [];

    // 外环：B的本命盘
    const outerPositions = result.natal_b.positions || [];

    // 相位：跨盘相位（A vs B）
    const aspects = result.synastry_aspects || [];

    // 宫位：A的宫位
    const houseCusps = result.natal_a.houseCusps || [];

    return {
      innerPositions,
      outerPositions,
      aspects,
      houseCusps
    };
  },

  formatTabContent(tabId, content) {
    if (!content || typeof content !== 'object') return '';

    if (tabId === 'natal_a' || tabId === 'natal_b') {
      const sections = [];
      if (content.temperament) {
        sections.push(`气质结构\n元素倾向：${content.temperament.elements || ''}\n模式倾向：${content.temperament.modalities || ''}\n画像：${content.temperament.portrait || ''}`);
      }
      if (content.core_triangle) {
        sections.push(`核心三角\n太阳：${content.core_triangle.sun || ''}\n月亮：${content.core_triangle.moon || ''}\n上升：${content.core_triangle.rising || ''}\n总结：${content.core_triangle.summary || ''}`);
      }
      if (content.configurations) {
        const houses = content.configurations.houses || {};
        sections.push(`关系配置\n金星：${content.configurations.venus || ''}\n火星：${content.configurations.mars || ''}\n水星：${content.configurations.mercury || ''}\n五宫：${houses.h5 || ''}\n七宫：${houses.h7 || ''}\n八宫：${houses.h8 || ''}`);
      }
      if (content.key_script) {
        sections.push(`关键脚本\n爱之风格：${content.key_script.love_style || ''}\n模式：${content.key_script.pattern || ''}\n冲突角色：${content.key_script.conflict_role || ''}\n修复方式：${content.key_script.repair_method || ''}`);
      }
      return sections.join('\n\n');
    }

    if (tabId === 'syn_ab' || tabId === 'syn_ba') {
      const sections = [];
      if (content.summary) sections.push(`关系摘要\n${content.summary}`);
      if (Array.isArray(content.keywords)) sections.push(`关键词\n${content.keywords.join(' / ')}`);
      if (content.sensitivity_panel) {
        const panel = content.sensitivity_panel;
        sections.push(`敏感点\n月亮：${panel.moon ? panel.moon.need : ''}\n金星：${panel.venus ? panel.venus.need : ''}\n火星：${panel.mars ? panel.mars.need : ''}\n水星：${panel.mercury ? panel.mercury.need : ''}`);
      }
      if (Array.isArray(content.main_items)) {
        const items = content.main_items.map(item => `• ${item.evidence || ''}\n  体验：${item.subjective || ''}\n  反应：${item.reaction || ''}`);
        sections.push(`互动亮点\n${items.join('\n')}`);
      }
      return sections.join('\n\n');
    }

    if (tabId === 'composite') {
      const sections = [];
      if (content.temperament) {
        sections.push(`关系气质\n主导：${content.temperament.dominant || ''}\n模式：${content.temperament.mode || ''}\n隐喻：${content.temperament.analogy || ''}`);
      }
      if (content.core) {
        sections.push(`核心结构\n太阳：${content.core.sun || ''}\n月亮：${content.core.moon || ''}\n上升：${content.core.rising || ''}`);
      }
      if (content.daily) {
        sections.push(`日常互动\n水星：${content.daily.mercury || ''}\n金星：${content.daily.venus || ''}\n火星：${content.daily.mars || ''}`);
      }
      if (content.synthesis) {
        sections.push(`综合影响\n关系重点：${content.synthesis.house_focus || ''}\n对A影响：${content.synthesis.impact_on_a || ''}\n对B影响：${content.synthesis.impact_on_b || ''}`);
      }
      return sections.join('\n\n');
    }

    return JSON.stringify(content, null, 2);
  },

  async handleAnalyze() {
    const { nameA, nameB } = this.data;
    if (!nameA || !nameB) return;
    if (nameA === nameB) {
      wx.showToast({ title: '不能是同一人', icon: 'none' });
      return;
    }
    const ready = this.ensureProfilesReady();
    if (!ready) return;

    this.setData({ loading: true });
    try {
      const query = this.buildSynastryQuery('overview');
      if (!query) {
        wx.showToast({ title: '请先选择双方档案', icon: 'none' });
        return;
      }
      const res = await request({ url: `${API_ENDPOINTS.SYNASTRY}?${query}` });
      const overviewData = this.parseOverview(res.content || {});

      // 准备星盘数据
      const synastryChartData = this.prepareSynastryChartData(res);

      this.setData({
        resultReady: true,
        step: 2,
        activeTab: 'overview',
        overviewData,
        synastryChartData,
        tabContents: { overview: res.content || {} },
        currentSectionText: '',
        currentSectionTitle: ''
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '分析失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async switchTab(e) {
    const tabId = e.currentTarget.dataset.id;
    if (!tabId) return;
    if (tabId === 'overview') {
      this.setData({ activeTab: 'overview', currentSectionText: '', currentSectionTitle: '' });
      return;
    }

    const cached = this.data.tabContents[tabId];
    if (cached) {
      const text = this.formatTabContent(tabId, cached);
      const title = this.data.resultTabs.find(tab => tab.id === tabId)?.label || '';
      this.setData({ activeTab: tabId, currentSectionText: text, currentSectionTitle: title });
      return;
    }

    this.setData({ loading: true });
    try {
      const query = this.buildSynastryQuery(tabId);
      if (!query) return;
      const res = await request({ url: `${API_ENDPOINTS.SYNASTRY}?${query}` });
      const updatedTabs = { ...this.data.tabContents, [tabId]: res.content || {} };
      const text = this.formatTabContent(tabId, res.content || {});
      const title = this.data.resultTabs.find(tab => tab.id === tabId)?.label || '';
      this.setData({
        tabContents: updatedTabs,
        activeTab: tabId,
        currentSectionText: text,
        currentSectionTitle: title
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  reset() {
    this.setData({
      step: 1,
      resultReady: false,
      activeTab: 'overview',
      overviewData: { score: null, keywords: [], scores: [], growthTask: null, summary: '', disclaimer: '' },
      tabContents: {},
      currentSectionText: '',
      currentSectionTitle: ''
    });
  }
});

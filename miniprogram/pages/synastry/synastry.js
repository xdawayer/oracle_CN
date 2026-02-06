const { request, requestStream } = require('../../utils/request');
const storage = require('../../utils/storage');
const { API_ENDPOINTS } = require('../../services/api');
const { searchCities, formatCityDisplay, autoMatchCity, getCityCoordinates } = require('../../utils/city-search');

const SELF_PROFILE_ID = 'self_profile';
const CITY_SEARCH_DEBOUNCE = 300;

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
      { id: 'natal_a', label: '人格A' },
      { id: 'natal_b', label: '人格B' },
      { id: 'syn_ab', label: '对比AB' },
      { id: 'syn_ba', label: '对比BA' },
      { id: 'composite', label: '组合分析' }
    ],

    overviewData: {
      score: null,
      relationshipType: '',
      dimensions: [],
      coreDynamic: null,
      bestMatch: null,
      needsWork: null,
      summary: ''
    },
    tabContents: {},
    currentSectionText: '',
    currentSectionTitle: '',
    currentSectionCards: [],

    // 懒加载状态
    preloadQueue: [],       // 预加载队列
    preloadingTab: null,    // 正在预加载的 tab
    tabLoadStatus: {},      // 各 tab 加载状态: 'pending' | 'loading' | 'loaded' | 'error'

    // 图谱数据 - 分别存储不同类型的图谱
    chartDataA: { positions: [], aspects: [], houseCusps: [] },       // A 的人格图谱
    chartDataB: { positions: [], aspects: [], houseCusps: [] },       // B 的人格图谱
    synastryChartAB: { innerPositions: [], outerPositions: [], aspects: [], houseCusps: [] },  // 对比盘 A-B
    synastryChartBA: { innerPositions: [], outerPositions: [], aspects: [], houseCusps: [] },  // 对比盘 B-A
    compositeChart: { positions: [], aspects: [], houseCusps: [] },   // 组合分析

    // 深度解读 overlay
    showDeepOverlay: false,
    deepOverlayData: null,
    deepOverlayLoading: false,

    // 城市搜索相关
    birthCitySuggestions: [],
    currentCitySuggestions: [],
    showBirthCitySuggestions: false,
    showCurrentCitySuggestions: false
  },

  // 深度解读内容缓存
  deepContentCache: {},

  // 防抖定时器
  birthCitySearchTimer: null,
  currentCitySearchTimer: null,
  // 选中的城市对象
  selectedBirthCity: null,
  selectedCurrentCity: null,

  onLoad() {
    this.loadProfiles();
  },

  loadProfiles() {
    const profiles = storage.get('synastry_profiles', []);
    const userProfile = storage.get('user_profile') || {};
    const normalized = Array.isArray(profiles) ? profiles : [];
    const selfProfile = this.buildSelfProfile(userProfile);

    let mergedProfiles = normalized.filter(profile => profile.id !== SELF_PROFILE_ID && !profile.isSelf);
    if (selfProfile) {
      const existingSelf = normalized.find(profile => profile.id === SELF_PROFILE_ID || profile.isSelf);
      const mergedSelf = { ...existingSelf, ...selfProfile, id: SELF_PROFILE_ID, isSelf: true };
      mergedProfiles = [mergedSelf, ...mergedProfiles];
    }

    this.setData({ profiles: mergedProfiles });
    storage.set('synastry_profiles', mergedProfiles);

    if (!this.data.nameA && selfProfile) {
      this.profileA = selfProfile;
      this.setData({ nameA: selfProfile.name });
    }
  },

  buildSelfProfile(userProfile) {
    const normalizedProfile = userProfile && typeof userProfile === 'object' ? userProfile : {
      birthDate: '1989-10-31',
      birthTime: '22:00',
      birthCity: '中国, 湖南, 娄底',
      timezone: '8',
      lat: 27.7,
      lon: 112.0,
      accuracyLevel: 'city'
    };
    const name = normalizedProfile.name || '我';
    return {
      id: SELF_PROFILE_ID,
      name,
      birthDate: normalizedProfile.birthDate || '',
      birthTime: normalizedProfile.birthTime || '',
      birthCity: normalizedProfile.birthCity || '',
      currentCity: normalizedProfile.currentCity || '',
      timezone: normalizedProfile.timezone || '',
      accuracy: normalizedProfile.accuracy || normalizedProfile.accuracyLevel || '',
      lat: normalizedProfile.lat,
      lon: normalizedProfile.lon,
      isSelf: true
    };
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
    this.selectedBirthCity = null;
    this.selectedCurrentCity = null;
    this.setData({
      managerMode: 'form',
      formData: { id: '', name: '', birthDate: '', birthTime: '', birthCity: '', currentCity: '', timezone: '', accuracy: '', lat: undefined, lon: undefined },
      birthCitySuggestions: [],
      currentCitySuggestions: [],
      showBirthCitySuggestions: false,
      showCurrentCitySuggestions: false
    });
  },

  startEdit(e) {
    const profile = e.currentTarget.dataset.profile;
    this.selectedBirthCity = null;
    this.selectedCurrentCity = null;
    this.setData({
      managerMode: 'form',
      formData: { ...profile },
      birthCitySuggestions: [],
      currentCitySuggestions: [],
      showBirthCitySuggestions: false,
      showCurrentCitySuggestions: false
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

  // 出生城市输入处理（带防抖搜索）
  onFormCityInput(e) {
    const value = e.detail.value;
    this.setData({
      'formData.birthCity': value,
      // 变更城市时清空经纬度与时区，避免携带旧值
      'formData.lat': '',
      'formData.lon': '',
      'formData.timezone': ''
    });
    this.selectedBirthCity = null;

    // 防抖处理
    if (this.birthCitySearchTimer) {
      clearTimeout(this.birthCitySearchTimer);
    }

    if (!value || !value.trim()) {
      this.setData({
        birthCitySuggestions: [],
        showBirthCitySuggestions: false
      });
      return;
    }

    this.birthCitySearchTimer = setTimeout(() => {
      const results = searchCities(value, 5);
      this.setData({
        birthCitySuggestions: results,
        showBirthCitySuggestions: true
      });
    }, CITY_SEARCH_DEBOUNCE);
  },

  // 出生城市输入框获得焦点
  onBirthCityFocus() {
    const { birthCity } = this.data.formData;
    if (birthCity && birthCity.trim()) {
      const results = searchCities(birthCity, 5);
      this.setData({
        birthCitySuggestions: results,
        showBirthCitySuggestions: true
      });
    }
  },

  // 出生城市输入框失去焦点
  onBirthCityBlur() {
    // 延迟关闭，以便点击事件能够触发
    setTimeout(() => {
      // 如果没有选中城市，尝试自动匹配
      if (!this.selectedBirthCity && this.data.formData.birthCity) {
        const { city, displayText } = autoMatchCity(this.data.formData.birthCity);
        if (city) {
          this.selectedBirthCity = city;
          const coords = getCityCoordinates(city);
          this.setData({
            'formData.birthCity': displayText,
            'formData.lat': coords.lat,
            'formData.lon': coords.lon,
            'formData.timezone': coords.timezone
          });
        }
      }
      this.setData({ showBirthCitySuggestions: false });
    }, 200);
  },

  // 选择出生城市
  selectBirthCity(e) {
    const city = e.currentTarget.dataset.city;
    if (!city) return;

    this.selectedBirthCity = city;
    const displayText = formatCityDisplay(city);
    const coords = getCityCoordinates(city);

    this.setData({
      'formData.birthCity': displayText,
      'formData.lat': coords.lat,
      'formData.lon': coords.lon,
      'formData.timezone': coords.timezone,
      birthCitySuggestions: [],
      showBirthCitySuggestions: false
    });
  },

  // 当前城市输入处理（带防抖搜索）
  onFormCurrentCityInput(e) {
    const value = e.detail.value;
    this.setData({ 'formData.currentCity': value });
    this.selectedCurrentCity = null;

    // 防抖处理
    if (this.currentCitySearchTimer) {
      clearTimeout(this.currentCitySearchTimer);
    }

    if (!value || !value.trim()) {
      this.setData({
        currentCitySuggestions: [],
        showCurrentCitySuggestions: false
      });
      return;
    }

    this.currentCitySearchTimer = setTimeout(() => {
      const results = searchCities(value, 5);
      this.setData({
        currentCitySuggestions: results,
        showCurrentCitySuggestions: true
      });
    }, CITY_SEARCH_DEBOUNCE);
  },

  // 当前城市输入框获得焦点
  onCurrentCityFocus() {
    const { currentCity } = this.data.formData;
    if (currentCity && currentCity.trim()) {
      const results = searchCities(currentCity, 5);
      this.setData({
        currentCitySuggestions: results,
        showCurrentCitySuggestions: true
      });
    }
  },

  // 当前城市输入框失去焦点
  onCurrentCityBlur() {
    // 延迟关闭，以便点击事件能够触发
    setTimeout(() => {
      // 如果没有选中城市，尝试自动匹配
      if (!this.selectedCurrentCity && this.data.formData.currentCity) {
        const { city, displayText } = autoMatchCity(this.data.formData.currentCity);
        if (city) {
          this.selectedCurrentCity = city;
          this.setData({ 'formData.currentCity': displayText });
        }
      }
      this.setData({ showCurrentCitySuggestions: false });
    }, 200);
  },

  // 选择当前城市
  selectCurrentCity(e) {
    const city = e.currentTarget.dataset.city;
    if (!city) return;

    this.selectedCurrentCity = city;
    const displayText = formatCityDisplay(city);

    this.setData({
      'formData.currentCity': displayText,
      currentCitySuggestions: [],
      showCurrentCitySuggestions: false
    });
  },

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
    const lat = profile.lat;
    const lon = profile.lon;
    if (lat !== undefined && lat !== null && lat !== '' && Number.isFinite(Number(lat))) {
      params.push(`${prefix}Lat=${encodeURIComponent(lat)}`);
    }
    if (lon !== undefined && lon !== null && lon !== '' && Number.isFinite(Number(lon))) {
      params.push(`${prefix}Lon=${encodeURIComponent(lon)}`);
    }
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

  buildTechnicalQuery() {
    const { nameA, nameB } = this.data;
    const profileA = this.resolveProfileByName(nameA) || this.profileA;
    const profileB = this.resolveProfileByName(nameB) || this.profileB;

    if (!profileA || !profileB) {
      return null;
    }

    const params = [
      ...this.buildBirthParams(profileA, 'a'),
      ...this.buildBirthParams(profileB, 'b')
    ];
    return params.join('&');
  },

  // 构建 /full 端点的查询参数（不含 tab 参数）
  buildFullQuery() {
    return this.buildSynastryQuery(null);
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
    // 新格式：直接解析顶层字段
    if (content && content.overall_score !== undefined) {
      const fiveDimensions = Array.isArray(content.five_dimensions) ? content.five_dimensions : [];
      return {
        score: content.overall_score || null,
        relationshipType: content.relationship_type || '',
        dimensions: fiveDimensions.map(d => ({
          name: d.name || '',
          score: d.score || 0,
          desc: d.description || ''
        })),
        coreDynamic: content.core_dynamic || null,
        // 新字段名：best_match / needs_work，兼容旧字段名 sweet_spot / growth_edge
        bestMatch: content.best_match || content.sweet_spot || null,
        needsWork: content.needs_work || content.growth_edge || null,
        summary: content.one_line_summary || ''
      };
    }

    // 旧格式兼容
    const overview = content && content.overview ? content.overview : {};
    const scores = Array.isArray(overview.compatibility_scores) ? overview.compatibility_scores : [];
    const scoreValue = scores.length
      ? Math.round(scores.reduce((sum, item) => sum + (item.score || 0), 0) / scores.length)
      : null;
    return {
      score: scoreValue,
      relationshipType: '',
      dimensions: scores.map(s => ({ name: s.dim || '', score: s.score || 0, desc: s.desc || '' })),
      coreDynamic: null,
      bestMatch: null,
      needsWork: overview.growth_task || null,
      summary: content && content.conclusion ? content.conclusion.summary : ''
    };
  },

  // 计算宫位尖
  calculateHouseCusps(positions) {
    const ascendant = positions.find(p => p.name === 'Ascendant');
    if (ascendant && ascendant.sign) {
      const signIndex = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].indexOf(ascendant.sign);
      if (signIndex >= 0) {
        const ascLongitude = signIndex * 30 + (ascendant.degree || 0) + (ascendant.minute || 0) / 60;
        return Array.from({ length: 12 }, (_, i) => ((ascLongitude + i * 30) % 360 + 360) % 360);
      }
    }
    return [];
  },

  // 准备所有图谱数据
  prepareAllChartData(result) {
    const technical = result?.technical;
    const emptyChart = { positions: [], aspects: [], houseCusps: [] };
    const emptySynastry = { innerPositions: [], outerPositions: [], aspects: [], houseCusps: [] };

    if (!technical) {
      return {
        chartDataA: emptyChart,
        chartDataB: emptyChart,
        synastryChartAB: emptySynastry,
        synastryChartBA: emptySynastry,
        compositeChart: emptyChart
      };
    }

    const natalA = technical.natal_a || {};
    const natalB = technical.natal_b || {};
    const synAB = technical.syn_ab || {};
    const synBA = technical.syn_ba || {};
    const composite = technical.composite || {};

    // A 的人格图谱
    const positionsA = natalA.planets || [];
    const aspectsA = natalA.aspects || [];
    const houseCuspsA = this.calculateHouseCusps(positionsA);

    // B 的人格图谱
    const positionsB = natalB.planets || [];
    const aspectsB = natalB.aspects || [];
    const houseCuspsB = this.calculateHouseCusps(positionsB);

    // 对比盘 A-B（A 为内环）
    const outerPositionsAB = positionsB.map(p => ({
      ...p,
      name: p.name && !p.name.startsWith('B-') ? `B-${p.name}` : p.name
    }));
    const aspectsAB = (synAB.aspects || []).map(a => ({
      ...a,
      planet2: a.planet2 && !a.planet2.startsWith('B-') ? `B-${a.planet2}` : a.planet2
    }));

    // 对比盘 B-A（B 为内环）
    const outerPositionsBA = positionsA.map(p => ({
      ...p,
      name: p.name && !p.name.startsWith('B-') ? `B-${p.name}` : p.name
    }));
    // synBA 相位：如果后端提供了 syn_ba 数据则直接使用，否则从 syn_ab 翻转
    const rawBA = synBA.aspects || null;
    const aspectsBA = rawBA
      ? rawBA.map(a => ({
          ...a,
          // 内环为 B，外环为 A（外环统一用 B- 标记）
          planet1: a.planet2,
          planet2: a.planet1 && !a.planet1.startsWith('B-') ? `B-${a.planet1}` : a.planet1
        }))
      : (synAB.aspects || []).map(a => ({
          ...a,
          // 内环为 B，外环为 A（外环统一用 B- 标记）
          planet1: a.planet2,
          planet2: a.planet1 && !a.planet1.startsWith('B-') ? `B-${a.planet1}` : a.planet1
        }));

    // 组合分析（中点盘）
    const compositePositions = composite.planets || [];
    const compositeAspects = composite.aspects || [];
    const compositeHouseCusps = this.calculateHouseCusps(compositePositions);

    return {
      chartDataA: { positions: positionsA, aspects: aspectsA, houseCusps: houseCuspsA },
      chartDataB: { positions: positionsB, aspects: aspectsB, houseCusps: houseCuspsB },
      synastryChartAB: { innerPositions: positionsA, outerPositions: outerPositionsAB, aspects: aspectsAB, houseCusps: houseCuspsA },
      synastryChartBA: { innerPositions: positionsB, outerPositions: outerPositionsBA, aspects: aspectsBA, houseCusps: houseCuspsB },
      compositeChart: { positions: compositePositions, aspects: compositeAspects, houseCusps: compositeHouseCusps }
    };
  },

  // 从 /full 端点响应中准备图谱数据
  // fullRes 格式: { chartA: { positions }, chartB: { positions }, synastryCore: { aspects, houseOverlays } }
  prepareChartDataFromFullResponse(fullRes) {
    const emptyChart = { positions: [], aspects: [], houseCusps: [] };
    const emptySynastry = { innerPositions: [], outerPositions: [], aspects: [], houseCusps: [] };

    if (!fullRes || !fullRes.chartA || !fullRes.chartB) {
      return {
        chartDataA: emptyChart,
        chartDataB: emptyChart,
        synastryChartAB: emptySynastry,
        synastryChartBA: emptySynastry,
        compositeChart: emptyChart
      };
    }

    const positionsA = fullRes.chartA.positions || [];
    const positionsB = fullRes.chartB.positions || [];
    const synastryAspects = (fullRes.synastryCore && fullRes.synastryCore.aspects) || [];
    const houseCuspsA = this.calculateHouseCusps(positionsA);
    const houseCuspsB = this.calculateHouseCusps(positionsB);

    // A 的人格图谱（/full 不含个人相位，留空）
    const chartDataA = { positions: positionsA, aspects: [], houseCusps: houseCuspsA };
    // B 的人格图谱
    const chartDataB = { positions: positionsB, aspects: [], houseCusps: houseCuspsB };

    // 对比盘 A-B（A 为内环，B 为外环）
    const outerPositionsAB = positionsB.map(function(p) {
      return Object.assign({}, p, {
        name: p.name && !p.name.startsWith('B-') ? 'B-' + p.name : p.name
      });
    });
    const aspectsAB = synastryAspects.map(function(a) {
      return Object.assign({}, a, {
        planet2: a.planet2 && !a.planet2.startsWith('B-') ? 'B-' + a.planet2 : a.planet2
      });
    });

    // 对比盘 B-A（B 为内环，A 为外环）
    const outerPositionsBA = positionsA.map(function(p) {
      return Object.assign({}, p, {
        name: p.name && !p.name.startsWith('B-') ? 'B-' + p.name : p.name
      });
    });
    const aspectsBA = synastryAspects.map(function(a) {
      return Object.assign({}, a, {
        // 内环为 B，外环为 A（外环统一用 B- 标记）
        planet1: a.planet2,
        planet2: a.planet1 && !a.planet1.startsWith('B-') ? 'B-' + a.planet1 : a.planet1
      });
    });

    return {
      chartDataA: chartDataA,
      chartDataB: chartDataB,
      synastryChartAB: { innerPositions: positionsA, outerPositions: outerPositionsAB, aspects: aspectsAB, houseCusps: houseCuspsA },
      synastryChartBA: { innerPositions: positionsB, outerPositions: outerPositionsBA, aspects: aspectsBA, houseCusps: houseCuspsB },
      // /full 端点不含组合分析数据，初始为空，等 composite tab 加载时补充
      compositeChart: emptyChart
    };
  },

  formatTabContent(tabId, content) {
    if (!content || typeof content !== 'object') return { text: '', cards: [] };

    // 新格式：人格图谱（中国本土化）
    if (tabId === 'natal_a' || tabId === 'natal_b') {
      if (content.love_persona) {
        return this.formatNatalCards(content);
      }
      // 旧格式兼容
      return { text: '', cards: [] };
    }

    // 新格式：比较盘（中国本土化）
    if (tabId === 'syn_ab' || tabId === 'syn_ba') {
      if (content.chemistry || content.feeling_for_a) {
        return this.formatCompareCards(content);
      }
      return { text: '', cards: [] };
    }

    // 新格式：组合分析（中国本土化）
    if (tabId === 'composite') {
      if (content.cp_type) {
        return this.formatCompositeCards(content);
      }
      return { text: '', cards: [] };
    }

    return { text: '', cards: [] };
  },

  // 人格图谱卡片化
  formatNatalCards(content) {
    const cards = [];

    if (content.love_persona) {
      const p = content.love_persona;
      cards.push({
        title: p.title || '恋爱人设',
        type: 'persona',
        dimensionKey: 'love_persona',
        highlight: p.type || '',
        content: p.content || '',
        astroBasis: p.astro_basis || '',
        tags: p.tags || [],
        color: 'warm'
      });
    }
    if (content.needs_and_gives) {
      const n = content.needs_and_gives;
      cards.push({
        title: n.title || '想要的和能给的',
        type: 'needs',
        dimensionKey: 'needs_and_gives',
        needs: n.needs || [],
        gives: n.gives || [],
        content: n.content || '',
        astroBasis: n.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.fight_mode) {
      const f = content.fight_mode;
      cards.push({
        title: f.title || '吵架模式',
        type: 'fight',
        dimensionKey: 'fight_mode',
        highlight: f.style || '',
        trigger: f.trigger || '',
        content: f.content || '',
        astroBasis: f.astro_basis || '',
        color: 'alert'
      });
    }
    if (content.lifestyle) {
      const l = content.lifestyle;
      cards.push({
        title: l.title || '过日子风格',
        type: 'lifestyle',
        dimensionKey: 'lifestyle',
        moneyAttitude: l.money_attitude || '',
        livingHabit: l.living_habit || '',
        content: l.content || '',
        astroBasis: l.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.family_view) {
      const fv = content.family_view;
      cards.push({
        title: fv.title || '家庭观念',
        type: 'family',
        dimensionKey: 'family_view',
        marriageAttitude: fv.marriage_attitude || '',
        content: fv.content || '',
        astroBasis: fv.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.warning) {
      const w = content.warning;
      cards.push({
        title: w.title || '雷区提醒',
        type: 'warning',
        dimensionKey: 'warning',
        mines: w.mines || [],
        content: w.content || '',
        astroBasis: w.astro_basis || '',
        color: 'alert'
      });
    }
    if (content.one_sentence) {
      cards.push({
        title: '一句话总结',
        type: 'summary',
        content: content.one_sentence,
        color: 'emphasis'
      });
    }

    return { text: '', cards };
  },

  // 比较盘卡片化
  formatCompareCards(content) {
    const cards = [];

    // syn_ab 格式（title 从 AI 返回数据读取，支持不同关系类型）
    if (content.chemistry) {
      cards.push({
        title: content.chemistry.title || '来电指数',
        type: 'score',
        dimensionKey: 'chemistry',
        score: content.chemistry.score,
        content: content.chemistry.content || '',
        astroBasis: content.chemistry.astro_basis || '',
        signals: content.chemistry.key_signals || [],
        color: 'warm'
      });
    }
    if (content.communication) {
      cards.push({
        title: content.communication.title || '聊得来指数',
        type: 'score',
        dimensionKey: 'communication',
        score: content.communication.score,
        content: content.communication.content || '',
        astroBasis: content.communication.astro_basis || '',
        highlights: content.communication.highlights || [],
        color: 'neutral'
      });
    }
    if (content.money_view) {
      cards.push({
        title: content.money_view.title || '消费观匹配',
        type: 'score',
        dimensionKey: 'money_view',
        score: content.money_view.score,
        highlight: content.money_view.match_type || '',
        content: content.money_view.content || '',
        astroBasis: content.money_view.astro_basis || '',
        tips: content.money_view.tips || [],
        color: 'neutral'
      });
    }
    if (content.daily_life) {
      cards.push({
        title: content.daily_life.title || '过日子合拍度',
        type: 'match',
        dimensionKey: 'daily_life',
        score: content.daily_life.score,
        content: content.daily_life.content || '',
        astroBasis: content.daily_life.astro_basis || '',
        matchAreas: content.daily_life.match_areas || [],
        gapAreas: content.daily_life.gap_areas || [],
        color: 'neutral'
      });
    }
    if (content.conflict_mode) {
      cards.push({
        title: content.conflict_mode.title || '吵架和好模式',
        type: 'score',
        dimensionKey: 'conflict_mode',
        score: content.conflict_mode.score,
        highlight: content.conflict_mode.fight_pattern || '',
        content: content.conflict_mode.content || '',
        astroBasis: content.conflict_mode.astro_basis || '',
        tips: content.conflict_mode.peace_tips || [],
        color: 'alert'
      });
    }
    if (content.family_merge) {
      cards.push({
        title: content.family_merge.title || '家庭融合难度',
        type: 'score',
        dimensionKey: 'family_merge',
        score: content.family_merge.score,
        highlight: content.family_merge.difficulty_level || '',
        content: content.family_merge.content || '',
        astroBasis: content.family_merge.astro_basis || '',
        issues: content.family_merge.potential_issues || [],
        color: 'neutral'
      });
    }
    if (content.longevity) {
      cards.push({
        title: content.longevity.title || '长久指数',
        type: 'score',
        dimensionKey: 'longevity',
        score: content.longevity.score,
        content: content.longevity.content || '',
        astroBasis: content.longevity.astro_basis || '',
        factors: content.longevity.stability_factors || [],
        color: 'warm'
      });
    }
    if (content.warnings) {
      cards.push({
        title: content.warnings.title || '踩坑预警',
        type: 'warning',
        dimensionKey: 'warnings',
        dangerZones: content.warnings.danger_zones || [],
        content: content.warnings.content || '',
        astroBasis: content.warnings.astro_basis || '',
        mustAvoid: content.warnings.must_avoid || '',
        color: 'alert'
      });
    }
    if (content.overall) {
      cards.push({
        title: '总评',
        type: 'overall',
        dimensionKey: 'overall',
        score: content.overall.score,
        verdict: content.overall.verdict || '',
        relationshipType: content.overall.relationship_type || '',
        color: 'emphasis'
      });
    }

    // syn_ba 格式（B 视角，title 从 AI 返回数据读取）
    if (content.feeling_for_a) {
      cards.push({
        title: content.feeling_for_a.title || '对 ta 的感觉',
        type: 'score',
        dimensionKey: 'feeling_for_a',
        score: content.feeling_for_a.score,
        content: content.feeling_for_a.content || '',
        astroBasis: content.feeling_for_a.astro_basis || '',
        highlight: content.feeling_for_a.what_attracts || '',
        color: 'warm'
      });
    }
    if (content.being_understood) {
      cards.push({
        title: content.being_understood.title || 'ta 懂不懂你',
        type: 'score',
        dimensionKey: 'being_understood',
        score: content.being_understood.score,
        highlight: content.being_understood.understanding_level || '',
        content: content.being_understood.content || '',
        astroBasis: content.being_understood.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.chat_experience) {
      cards.push({
        title: content.chat_experience.title || '聊天体验',
        type: 'score',
        dimensionKey: 'chat_experience',
        score: content.chat_experience.score,
        content: content.chat_experience.content || '',
        astroBasis: content.chat_experience.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.money_gap) {
      cards.push({
        title: content.money_gap.title || '消费观差异',
        type: 'score',
        dimensionKey: 'money_gap',
        score: content.money_gap.score,
        content: content.money_gap.content || '',
        astroBasis: content.money_gap.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.living_comfort) {
      cards.push({
        title: content.living_comfort.title || '过日子舒适度',
        type: 'score',
        dimensionKey: 'living_comfort',
        score: content.living_comfort.score,
        content: content.living_comfort.content || '',
        astroBasis: content.living_comfort.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.after_fight) {
      cards.push({
        title: content.after_fight.title || '吵架后你的感受',
        type: 'score',
        dimensionKey: 'after_fight',
        score: content.after_fight.score,
        highlight: content.after_fight.fight_pattern || '',
        content: content.after_fight.content || '',
        astroBasis: content.after_fight.astro_basis || '',
        color: 'alert'
      });
    }
    if (content.family_fit) {
      cards.push({
        title: content.family_fit.title || 'ta 的家庭好不好处',
        type: 'score',
        dimensionKey: 'family_fit',
        score: content.family_fit.score,
        highlight: content.family_fit.difficulty || '',
        content: content.family_fit.content || '',
        astroBasis: content.family_fit.astro_basis || '',
        color: 'neutral'
      });
    }
    if (content.longevity_feel) {
      cards.push({
        title: content.longevity_feel.title || '跟 ta 能长久吗',
        type: 'score',
        dimensionKey: 'longevity_feel',
        score: content.longevity_feel.score,
        content: content.longevity_feel.content || '',
        astroBasis: content.longevity_feel.astro_basis || '',
        color: 'warm'
      });
    }
    if (content.overall_for_b) {
      // 去掉 AI 可能残留的"建议："/"建议你："前缀，前端已有标签
      const rawAdvice = (content.overall_for_b.advice_for_b || '').replace(/^建议[你：]*[:：]\s*/g, '');
      cards.push({
        title: '给你的建议',
        type: 'overall',
        dimensionKey: 'overall_for_b',
        score: content.overall_for_b.score,
        verdict: content.overall_for_b.verdict || '',
        advice: rawAdvice,
        color: 'emphasis'
      });
    }

    return { text: '', cards };
  },

  // 组合分析卡片化
  formatCompositeCards(content) {
    const cards = [];

    if (content.cp_type) {
      const cp = content.cp_type;
      cards.push({
        title: cp.title || 'CP 人设',
        type: 'persona',
        dimensionKey: 'cp_type',
        highlight: cp.type || '',
        content: cp.content || '',
        astroBasis: cp.astro_basis || '',
        tags: cp.tags || [],
        color: 'warm'
      });
    }
    if (content.together_vibe) {
      const tv = content.together_vibe;
      cards.push({
        title: tv.title || '在一起的感觉',
        type: 'vibe',
        dimensionKey: 'together_vibe',
        vibeWords: tv.vibe_words || '',
        content: tv.content || '',
        astroBasis: tv.astro_basis || '',
        likeWhat: tv.like_what || '',
        color: 'neutral'
      });
    }
    if (content.show_love_style) {
      cards.push({
        title: content.show_love_style.title || '撒狗粮方式',
        type: 'style',
        dimensionKey: 'show_love_style',
        highlight: content.show_love_style.style || '',
        content: content.show_love_style.content || '',
        astroBasis: content.show_love_style.astro_basis || '',
        color: 'warm'
      });
    }
    if (content.work_together) {
      const wt = content.work_together;
      cards.push({
        title: wt.title || '一起搞事业',
        type: 'work',
        dimensionKey: 'work_together',
        highlight: wt.teamwork_style || '',
        content: wt.content || '',
        astroBasis: wt.astro_basis || '',
        goodAt: wt.good_at || '',
        color: 'neutral'
      });
    }
    if (content.crisis_mode) {
      const cm = content.crisis_mode;
      cards.push({
        title: cm.title || '熬过难关的能力',
        type: 'crisis',
        dimensionKey: 'crisis_mode',
        highlight: cm.resilience_level || '',
        content: cm.content || '',
        astroBasis: cm.astro_basis || '',
        testScenario: cm.test_scenario || '',
        color: 'neutral'
      });
    }
    if (content.relationship_test) {
      const rt = content.relationship_test;
      cards.push({
        title: rt.title || '这段关系的考验',
        type: 'test',
        dimensionKey: 'relationship_test',
        challenge: rt.main_challenge || '',
        content: rt.content || '',
        astroBasis: rt.astro_basis || '',
        reward: rt.reward || '',
        color: 'alert'
      });
    }
    if (content.summary) {
      cards.push({
        title: '总结',
        type: 'summary',
        oneLiner: content.summary.one_liner || '',
        metaphor: content.summary.metaphor || '',
        color: 'emphasis'
      });
    }

    return { text: '', cards };
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
      const fullQuery = this.buildFullQuery();
      const technicalQuery = this.buildTechnicalQuery();
      if (!fullQuery) {
        wx.showToast({ title: '请先选择双方档案', icon: 'none' });
        return;
      }

      // 初始化加载状态，先显示页面框架
      const tabLoadStatus = {
        overview: 'loading',
        coreDynamics: 'loading',
        highlights: 'loading',
        natal_a: 'pending',
        natal_b: 'pending',
        syn_ab: 'pending',
        syn_ba: 'pending',
        composite: 'pending'
      };

      this.setData({
        resultReady: true,
        step: 2,
        activeTab: 'overview',
        overviewData: null,
        tabContents: {},
        currentSectionText: '',
        currentSectionTitle: '',
        currentSectionCards: [],
        tabLoadStatus,
        preloadQueue: ['natal_a', 'natal_b', 'syn_ab', 'syn_ba', 'composite'],
        preloadingTab: null
      });

      // 并行发起 /technical（快，~50ms）和 /full（慢，含 AI）
      let technicalRes = null;
      const technicalPromise = technicalQuery
        ? request({ url: `${API_ENDPOINTS.SYNASTRY_TECHNICAL}?${technicalQuery}` }).catch(err => {
            console.warn('[Synastry] /technical failed:', err);
            return null;
          })
        : Promise.resolve(null);

      const canChunked = wx.canIUse && wx.canIUse('request.object.enableChunked');
      let streamSuccess = false;

      const fullPromise = canChunked
        ? new Promise((resolve) => {
            const streamState = {
              overview: null,
              coreDynamics: null,
              highlights: null
            };

            requestStream({
              url: `${API_ENDPOINTS.SYNASTRY_FULL_STREAM}?${fullQuery}`,
              method: 'GET',
              onMeta: (meta) => {
                if (!technicalRes && meta && meta.chartA && meta.chartB) {
                  const chartData = this.prepareChartDataFromFullResponse({
                    chartA: meta.chartA,
                    chartB: meta.chartB,
                    synastryCore: meta.synastryCore || {}
                  });
                  this.setData(chartData);
                }
              },
              onModule: (evt) => {
                if (!evt || !evt.moduleId) return;
                const tabContents = { ...(this.data.tabContents || {}) };
                const statusUpdate = {};

                if (evt.moduleId === 'overview') {
                  const overviewContent = evt.content || {};
                  const overviewData = this.parseOverview(overviewContent);
                  tabContents.overview = overviewContent;
                  statusUpdate['tabLoadStatus.overview'] = overviewContent ? 'loaded' : 'error';
                  this.setData(Object.assign({ overviewData, tabContents }, statusUpdate));
                  streamState.overview = overviewContent;
                  if (overviewContent) streamSuccess = true;
                } else if (evt.moduleId === 'coreDynamics') {
                  tabContents.coreDynamics = evt.content || {};
                  statusUpdate['tabLoadStatus.coreDynamics'] = evt.content ? 'loaded' : 'error';
                  this.setData(Object.assign({ tabContents }, statusUpdate));
                  streamState.coreDynamics = evt.content;
                } else if (evt.moduleId === 'highlights') {
                  tabContents.highlights = evt.content || {};
                  statusUpdate['tabLoadStatus.highlights'] = evt.content ? 'loaded' : 'error';
                  this.setData(Object.assign({ tabContents }, statusUpdate));
                  streamState.highlights = evt.content;
                }

                // streamSuccess 仅以 overview 成功为准
              },
              onDone: () => {
                const statusUpdate = {};
                if (!streamState.overview) statusUpdate['tabLoadStatus.overview'] = 'error';
                if (!streamState.coreDynamics) statusUpdate['tabLoadStatus.coreDynamics'] = 'error';
                if (!streamState.highlights) statusUpdate['tabLoadStatus.highlights'] = 'error';
                if (Object.keys(statusUpdate).length > 0) {
                  this.setData(statusUpdate);
                }
                resolve(streamSuccess ? streamState : null);
              },
              onError: (err) => {
                console.warn('[Synastry] /full/stream failed:', err);
                resolve(null);
              }
            });
          })
        : request({ url: `${API_ENDPOINTS.SYNASTRY_FULL}?${fullQuery}` }).catch(err => {
            console.warn('[Synastry] /full failed:', err);
            return null;
          });

      // /technical 先到 → 立即渲染图谱图表
      technicalRes = await technicalPromise;
      if (technicalRes) {
        const allChartData = this.prepareAllChartData(technicalRes);
        this.setData(allChartData);
      }

      // /full 到达 → 填充 AI 内容
      const fullRes = await fullPromise;
      let fullSuccess = false;

      if (fullRes && !canChunked) {
        try {
          // 从 /full 响应中提取图谱数据（如果 /technical 之前失败，用 /full 的数据补充）
          const chartData = technicalRes ? {} : this.prepareChartDataFromFullResponse(fullRes);

          // 解析 overview 内容
          const overviewContent = fullRes.overview || {};
          const overviewData = this.parseOverview(overviewContent);

          const tabContents = { overview: overviewContent };
          const statusUpdate = { 'tabLoadStatus.overview': 'loaded' };

          if (fullRes.coreDynamics) {
            tabContents.coreDynamics = fullRes.coreDynamics;
            statusUpdate['tabLoadStatus.coreDynamics'] = 'loaded';
          } else {
            statusUpdate['tabLoadStatus.coreDynamics'] = 'error';
          }

          if (fullRes.highlights) {
            tabContents.highlights = fullRes.highlights;
            statusUpdate['tabLoadStatus.highlights'] = 'loaded';
          } else {
            statusUpdate['tabLoadStatus.highlights'] = 'error';
          }

          this.setData(Object.assign({
            overviewData,
            tabContents
          }, chartData, statusUpdate));

          fullSuccess = true;
        } catch (parseErr) {
          console.error('[Synastry] Failed to parse /full response:', parseErr);
        }
      } else if (fullRes && canChunked) {
        fullSuccess = true;
      }

      // /full 失败时，回退到单个 /synastry AI 调用
      if (!fullSuccess) {
        await this.handleAnalyzeFallback(technicalRes);
      }

      // 启动后台预加载其他 tab
      this.startPreloading();
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '分析失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // /full 失败时的 fallback：调用单个 /synastry AI 端点获取 overview
  async handleAnalyzeFallback(technicalRes) {
    // /full 失败意味着 coreDynamics 和 highlights 不可用，清理其状态
    this.setData({
      'tabLoadStatus.coreDynamics': 'error',
      'tabLoadStatus.highlights': 'error'
    });

    const query = this.buildSynastryQuery('overview');
    if (!query) return;

    try {
      const res = await request({ url: `${API_ENDPOINTS.SYNASTRY}?${query}` });
      const overviewData = this.parseOverview(res.content || {});

      // 如果技术数据之前为空，用 AI 返回的 technical 数据补充图谱
      let chartUpdate = {};
      if (!technicalRes && res.technical) {
        chartUpdate = this.prepareAllChartData(res);
      }

      this.setData({
        overviewData,
        ...chartUpdate,
        tabContents: { overview: res.content || {} },
        'tabLoadStatus.overview': 'loaded'
      });
    } catch (aiErr) {
      console.error('[Synastry] AI fallback failed:', aiErr);
      this.setData({ 'tabLoadStatus.overview': 'error' });
      wx.showToast({ title: '综述加载失败', icon: 'none' });
    }
  },

  // 启动后台预加载
  startPreloading() {
    if (this.data.preloadingTab) return; // 已有预加载任务
    this.preloadNextTab();
  },

  // 预加载下一个 tab
  async preloadNextTab() {
    const { preloadQueue, tabContents, tabLoadStatus } = this.data;

    // 找到下一个需要预加载的 tab
    const nextTab = preloadQueue.find(tab =>
      !tabContents[tab] && tabLoadStatus[tab] === 'pending'
    );

    if (!nextTab) {
      this.setData({ preloadingTab: null });
      return;
    }

    this.setData({
      preloadingTab: nextTab,
      [`tabLoadStatus.${nextTab}`]: 'loading'
    });

    try {
      const query = this.buildSynastryQuery(nextTab);
      if (!query) {
        this.setData({ [`tabLoadStatus.${nextTab}`]: 'error' });
        this.preloadNextTab();
        return;
      }

      const res = await request({ url: `${API_ENDPOINTS.SYNASTRY}?${query}` });

      // 更新缓存
      this.setData({
        [`tabContents.${nextTab}`]: res.content || {},
        [`tabLoadStatus.${nextTab}`]: 'loaded',
        preloadingTab: null
      });

      // 继续预加载下一个
      this.preloadNextTab();
    } catch (err) {
      console.error(`[Synastry] Preload ${nextTab} failed:`, err);
      this.setData({
        [`tabLoadStatus.${nextTab}`]: 'error',
        preloadingTab: null
      });
      // 继续预加载下一个（失败后稍等再试）
      setTimeout(() => this.preloadNextTab(), 200);
    }
  },

  // 优先加载指定 tab（用户点击时）
  prioritizeTab(tabId) {
    const { preloadQueue, tabLoadStatus } = this.data;

    // 如果该 tab 还在队列中且未开始加载，移到队首
    if (tabLoadStatus[tabId] === 'pending') {
      const newQueue = [tabId, ...preloadQueue.filter(t => t !== tabId)];
      this.setData({ preloadQueue: newQueue });
    }
  },

  async switchTab(e) {
    const tabId = e.currentTarget.dataset.id;
    if (!tabId) return;
    if (tabId === 'overview') {
      this.setData({ activeTab: 'overview', currentSectionText: '', currentSectionTitle: '', currentSectionCards: [] });
      return;
    }

    const title = this.data.resultTabs.find(tab => tab.id === tabId)?.label || '';
    const cached = this.data.tabContents[tabId];

    // 如果已缓存，直接显示
    if (cached) {
      const { text, cards } = this.formatTabContent(tabId, cached);
      this.setData({ activeTab: tabId, currentSectionText: text, currentSectionTitle: title, currentSectionCards: cards });
      return;
    }

    // 检查当前加载状态
    const loadStatus = this.data.tabLoadStatus[tabId];

    // 正在后台预加载中，等待完成
    if (loadStatus === 'loading' && this.data.preloadingTab === tabId) {
      this.setData({ activeTab: tabId, loading: true, currentSectionText: '', currentSectionTitle: title, currentSectionCards: [] });
      // 轮询等待预加载完成
      this.waitForPreload(tabId);
      return;
    }

    // 优先加载此 tab
    this.prioritizeTab(tabId);

    // 主动加载
    this.setData({ activeTab: tabId, loading: true, currentSectionText: '', currentSectionTitle: title, currentSectionCards: [] });
    try {
      const query = this.buildSynastryQuery(tabId);
      if (!query) {
        wx.showToast({ title: '档案信息不完整', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      this.setData({ [`tabLoadStatus.${tabId}`]: 'loading' });
      const res = await request({ url: `${API_ENDPOINTS.SYNASTRY}?${query}` });
      const { text, cards } = this.formatTabContent(tabId, res.content || {});
      this.setData({
        [`tabContents.${tabId}`]: res.content || {},
        [`tabLoadStatus.${tabId}`]: 'loaded',
        currentSectionText: text,
        currentSectionCards: cards
      });
    } catch (err) {
      console.error('[Synastry] switchTab error:', err);
      this.setData({ [`tabLoadStatus.${tabId}`]: 'error' });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 等待预加载完成（最多 15 秒）
  waitForPreload(tabId) {
    let retries = 0;
    const MAX_RETRIES = 75; // 75 × 200ms = 15s
    const check = () => {
      const cached = this.data.tabContents[tabId];
      if (cached) {
        const { text, cards } = this.formatTabContent(tabId, cached);
        this.setData({ loading: false, currentSectionText: text, currentSectionCards: cards });
        return;
      }
      const status = this.data.tabLoadStatus[tabId];
      if (status === 'error') {
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
        return;
      }
      retries++;
      if (retries >= MAX_RETRIES) {
        this.setData({ loading: false, [`tabLoadStatus.${tabId}`]: 'error' });
        wx.showToast({ title: '加载超时，请重试', icon: 'none' });
        return;
      }
      setTimeout(check, 200);
    };
    check();
  },

  // ========== 深度解读 overlay ==========

  onCardTap(e) {
    if (this.data.deepOverlayLoading || this.data.showDeepOverlay) return;
    const index = e.currentTarget.dataset.index;
    const card = this.data.currentSectionCards[index];
    if (!card || !card.dimensionKey) return;
    this.openDeepOverlay(card.dimensionKey, card.title, this.data.activeTab);
  },

  async openDeepOverlay(dimensionKey, title, tabType) {
    // 检查缓存
    const cacheKey = `${tabType}_${dimensionKey}`;
    if (this.deepContentCache[cacheKey]) {
      this.setData({
        showDeepOverlay: true,
        deepOverlayData: this.deepContentCache[cacheKey],
        deepOverlayLoading: false
      });
      return;
    }

    this.setData({ showDeepOverlay: true, deepOverlayLoading: true, deepOverlayData: null });

    try {
      const { nameA, nameB, relation } = this.data;
      const relationLabel = this.data.relations.find(r => r.id === relation)?.label || '恋人';

      // 构建 chartData：包含关系分析信息 + 维度信息
      const chartData = {
        dimensionKey,
        tabType,
        relationType: relationLabel,
        chartA: this.data.chartDataA,
        chartB: this.data.chartDataB,
        synastryData: tabType === 'syn_ab' ? this.data.synastryChartAB
          : tabType === 'syn_ba' ? this.data.synastryChartBA
          : tabType === 'composite' ? this.data.compositeChart
          : tabType === 'natal_a' ? this.data.chartDataA
          : this.data.chartDataB
      };

      const res = await request({
        url: API_ENDPOINTS.DETAIL,
        method: 'POST',
        data: {
          type: 'deep',
          context: 'synastry',
          chartData,
          nameA,
          nameB,
          lang: 'zh'
        }
      });

      const reportData = this.buildDeepReportData(title, res.content);
      this.deepContentCache[cacheKey] = reportData;
      this.setData({ deepOverlayData: reportData, deepOverlayLoading: false });
    } catch (err) {
      console.error('[Synastry] Deep overlay failed:', err);
      this.setData({ deepOverlayLoading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  buildDeepReportData(title, content) {
    if (!content) return null;
    const sections = [];

    if (content.summary) {
      sections.push({ title: content.title || '概述', text: content.summary, cardColor: 'accent-red' });
    }
    if (Array.isArray(content.key_patterns) && content.key_patterns.length) {
      content.key_patterns.forEach((p, i) => {
        const text = [p.description, p.astro_basis ? `分析依据：${p.astro_basis}` : ''].filter(Boolean).join('\n');
        sections.push({ title: p.title || `核心模式 ${i + 1}`, text, cardColor: 'info' });
      });
    }
    if (Array.isArray(content.strengths) && content.strengths.length) {
      sections.push({ title: '优势亮点', list: content.strengths, cardColor: 'success' });
    }
    if (Array.isArray(content.challenges) && content.challenges.length) {
      sections.push({ title: '需要注意', list: content.challenges, cardColor: 'warning' });
    }
    if (content.growth_path) {
      const gp = content.growth_path;
      sections.push({
        title: '改善方向',
        text: gp.direction || '',
        list: Array.isArray(gp.actions) ? gp.actions : [],
        cardColor: 'success'
      });
    }
    if (content.reflection_question) {
      sections.push({ title: '反思问题', text: content.reflection_question, cardColor: 'accent-red' });
    }

    return sections.length ? { title: title || '深度解读', sections } : null;
  },

  closeDeepOverlay() {
    this.setData({ showDeepOverlay: false, deepOverlayData: null });
  },

  reset() {
    this.deepContentCache = {};
    this.setData({
      step: 1,
      resultReady: false,
      activeTab: 'overview',
      overviewData: { score: null, relationshipType: '', dimensions: [], coreDynamic: null, bestMatch: null, needsWork: null, summary: '' },
      tabContents: {},
      currentSectionText: '',
      currentSectionTitle: '',
      currentSectionCards: [],
      // 清空懒加载状态
      preloadQueue: [],
      preloadingTab: null,
      tabLoadStatus: {},
      // 清空深度解读
      showDeepOverlay: false,
      deepOverlayData: null,
      deepOverlayLoading: false,
      // 清空所有图谱数据
      chartDataA: { positions: [], aspects: [], houseCusps: [] },
      chartDataB: { positions: [], aspects: [], houseCusps: [] },
      synastryChartAB: { innerPositions: [], outerPositions: [], aspects: [], houseCusps: [] },
      synastryChartBA: { innerPositions: [], outerPositions: [], aspects: [], houseCusps: [] },
      compositeChart: { positions: [], aspects: [], houseCusps: [] }
    });
  }
});

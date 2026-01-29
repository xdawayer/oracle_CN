const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');
const {
  MAJOR_PLANETS,
  PLANET_META,
  PLANET_NAMES_ZH,
  SIGN_META,
  SIGN_NAMES,
  SIGN_NAMES_ZH,
  SIGN_RULERS,
} = require('../../constants/chart-config');
const { searchCities, formatCityDisplay, autoMatchCity } = require('../../utils/city-search');

const CITY_SEARCH_DEBOUNCE = 300;

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

const CHART_TYPE_CONFIG = {
  natal: { chartType: 'natal', supported: true },
  transit: { chartType: 'transit', supported: true },
  synastry: { chartType: 'synastry', supported: true },
  composite: { chartType: 'natal', supported: false },
  davison: { chartType: 'natal', supported: false },
  solar_return: { chartType: 'natal', supported: false },
  pro_secondary: { chartType: 'natal', supported: false },
  pro_tertiary: { chartType: 'natal', supported: false },
};

const ASTEROID_NAMES = [
  'Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta',
  'North Node', 'South Node', 'Lilith', 'Fortune', 'Vertex', 'Orient', 'East Point'
];

const ELEMENT_MAP = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water'
};

const MODE_MAP = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable'
};

const ASPECT_CONFIG = {
  conjunction: { symbol: '☌', color: '#FF4D4F' },
  sextile: { symbol: '✱', color: '#40A9FF' },
  square: { symbol: '□', color: '#FF4D4F' },
  trine: { symbol: '△', color: '#52C41A' },
  opposition: { symbol: '☍', color: '#FF4D4F' },
};

const SINGLE_ASPECT_PLANETS = [...MAJOR_PLANETS, 'North Node', 'Ascendant', 'Midheaven'];
const CROSS_ASPECT_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Ascendant', 'Descendant', 'Midheaven', 'IC'
];

const EMPTY_ELEMENT_MATRIX = {
  fire: { cardinal: [], fixed: [], mutable: [] },
  earth: { cardinal: [], fixed: [], mutable: [] },
  air: { cardinal: [], fixed: [], mutable: [] },
  water: { cardinal: [], fixed: [], mutable: [] }
};

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
    resultStatus: 'idle',
    resultKind: '',
    resultTitle: '',
    chartDesc: '',
    unsupportedMessage: '',

    isDualResult: false,
    isTransitResult: false,
    expandedSection: null,

    chartSize: 320,
    chartType: 'natal',
    chartPositions: [],
    outerPositions: [],
    chartAspects: [],
    chartHouseCusps: [],

    elementMatrix: { ...EMPTY_ELEMENT_MATRIX },
    aspectMatrix: [],
    planetGroups: [],
    asteroidGroups: [],
    houseRulerGroups: [],

    // 城市搜索相关
    citySuggestionsA: [],
    citySuggestionsB: [],
    showCityDropdownA: false,
    showCityDropdownB: false
  },

  // 防抖定时器
  citySearchTimerA: null,
  citySearchTimerB: null,

  onLoad() {
    const today = new Date().toISOString().split('T')[0];
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth;
    // 减少 padding，让星盘更大，然后缩放到90%
    const padding = 64 * (windowWidth / 750);
    const baseSize = Math.max(280, Math.floor(windowWidth - padding));
    const chartSize = Math.floor(baseSize * 0.9);

    this.setData({
      'personA.date': today,
      'personB.date': today,
      'personA.time': '12:00',
      'personB.time': '12:00',
      chartSize
    });
  },

  handleTypeChange(e) {
    const idx = e.detail.value;
    const type = this.data.chartTypes[idx];

    this.setData({
      selectedTypeIndex: idx,
      selectedType: type,
      resultStatus: 'idle',
      resultKind: '',
      expandedSection: null
    });
  },

  handleInput(e) {
    const { field, person } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`${person}.${field}`]: value
    });
  },

  // 城市输入处理（带防抖搜索）
  handleCityInput(e) {
    const person = e.currentTarget.dataset.person;
    const value = e.detail.value;
    const timerKey = person === 'personA' ? 'citySearchTimerA' : 'citySearchTimerB';
    const suggestionsKey = person === 'personA' ? 'citySuggestionsA' : 'citySuggestionsB';
    const dropdownKey = person === 'personA' ? 'showCityDropdownA' : 'showCityDropdownB';

    this.setData({ [`${person}.city`]: value });

    // 清除之前的定时器
    if (this[timerKey]) {
      clearTimeout(this[timerKey]);
    }

    if (!value || !value.trim()) {
      this.setData({
        [suggestionsKey]: [],
        [dropdownKey]: false
      });
      return;
    }

    // 防抖搜索
    this[timerKey] = setTimeout(() => {
      const results = searchCities(value, 5);
      this.setData({
        [suggestionsKey]: results,
        [dropdownKey]: true
      });
    }, CITY_SEARCH_DEBOUNCE);
  },

  // 城市输入框获得焦点
  handleCityFocus(e) {
    const person = e.currentTarget.dataset.person;
    const cityValue = this.data[person].city;
    const suggestionsKey = person === 'personA' ? 'citySuggestionsA' : 'citySuggestionsB';
    const dropdownKey = person === 'personA' ? 'showCityDropdownA' : 'showCityDropdownB';

    if (cityValue && cityValue.trim()) {
      const results = searchCities(cityValue, 5);
      this.setData({
        [suggestionsKey]: results,
        [dropdownKey]: true
      });
    }
  },

  // 城市输入框失去焦点
  handleCityBlur(e) {
    const person = e.currentTarget.dataset.person;
    const dropdownKey = person === 'personA' ? 'showCityDropdownA' : 'showCityDropdownB';

    // 延迟关闭，以便点击事件能够触发
    setTimeout(() => {
      // 尝试自动匹配
      const cityValue = this.data[person].city;
      if (cityValue) {
        const { city, displayText } = autoMatchCity(cityValue);
        if (city) {
          this.setData({ [`${person}.city`]: displayText });
        }
      }
      this.setData({ [dropdownKey]: false });
    }, 200);
  },

  // 选择城市
  selectCity(e) {
    const { person, city } = e.currentTarget.dataset;
    if (!city) return;

    const displayText = formatCityDisplay(city);
    const suggestionsKey = person === 'personA' ? 'citySuggestionsA' : 'citySuggestionsB';
    const dropdownKey = person === 'personA' ? 'showCityDropdownA' : 'showCityDropdownB';

    this.setData({
      [`${person}.city`]: displayText,
      [suggestionsKey]: [],
      [dropdownKey]: false
    });
  },

  toggleAccordion(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedSection: this.data.expandedSection === id ? null : id
    });
  },

  resetResult() {
    this.setData({
      resultStatus: 'idle',
      resultKind: '',
      resultTitle: '',
      chartDesc: '',
      unsupportedMessage: '',
      isDualResult: false,
      isTransitResult: false,
      expandedSection: null,
      chartType: 'natal',
      chartPositions: [],
      outerPositions: [],
      chartAspects: [],
      chartHouseCusps: [],
      elementMatrix: { ...EMPTY_ELEMENT_MATRIX },
      aspectMatrix: [],
      planetGroups: [],
      asteroidGroups: [],
      houseRulerGroups: [],
    });
  },

  normalizePositions(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((p) => {
        if (!p || !p.name) return null;
        const sign = p.sign || p.signId || p.sign_name || p.signName;
        if (!sign) return null;
        return {
          ...p,
          sign,
          degree: Number(p.degree) || 0,
          minute: Number(p.minute) || 0,
        };
      })
      .filter(Boolean);
  },

  normalizeHouseCusps(list) {
    if (!Array.isArray(list)) return [];
    return list.map((cusp) => Number(cusp)).filter((cusp) => Number.isFinite(cusp));
  },

  stripPrefix(name) {
    if (typeof name !== 'string') return name;
    return name.replace(/^(T-|B-|N-)/, '');
  },

  prefixPositions(list, prefix) {
    if (!Array.isArray(list)) return [];
    return list.map((p) => {
      if (!p || !p.name) return p;
      const rawName = String(p.name);
      if (/^(T-|B-|N-)/.test(rawName)) return p;
      return { ...p, name: `${prefix}${rawName}` };
    });
  },

  prefixSynastryAspects(aspects, prefix) {
    if (!Array.isArray(aspects)) return [];
    return aspects.map((a) => {
      if (!a) return a;
      const planet2 = a.planet2 ? String(a.planet2) : '';
      if (!planet2 || /^(T-|B-|N-)/.test(planet2)) return a;
      return { ...a, planet2: `${prefix}${planet2}` };
    });
  },

  async generateChart() {
    const { selectedType, personA, personB } = this.data;
    const isDual = selectedType.dual;
    const typeConfig = CHART_TYPE_CONFIG[selectedType.id] || { supported: false };

    if (!personA.name || !personA.city) {
      wx.showToast({ title: '请完善甲方资料', icon: 'none' });
      return;
    }

    if (isDual && (!personB.name || !personB.city)) {
      wx.showToast({ title: '请完善乙方资料', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    if (!typeConfig.supported) {
      this.setData({
        resultStatus: 'unsupported',
        resultKind: selectedType.id,
        resultTitle: selectedType.label,
        unsupportedMessage: '该盘型功能开发中，敬请期待。',
        isDualResult: isDual,
        isTransitResult: selectedType.id === 'transit',
        chartType: typeConfig.chartType || 'natal',
        chartPositions: [],
        outerPositions: [],
        chartAspects: [],
        chartHouseCusps: [],
        elementMatrix: { ...EMPTY_ELEMENT_MATRIX },
        aspectMatrix: [],
        planetGroups: [],
        asteroidGroups: [],
        houseRulerGroups: [],
      });
      this.setData({ loading: false });
      return;
    }

    try {
      if (selectedType.id === 'synastry') {
        const query = this.buildSynastryParams(personA, 'a') + '&' + this.buildSynastryParams(personB, 'b');
        const res = await request({
          url: `${API_ENDPOINTS.SYNASTRY_TECHNICAL}?${query}`,
          method: 'GET'
        });
        const technical = res?.technical || {};
        const natalA = technical.natal_a || {};
        const natalB = technical.natal_b || {};
        const synAB = technical.syn_ab || {};
        const innerPositions = this.normalizePositions(natalA.planets || natalA.positions || []);
        const outerPositionsRaw = this.normalizePositions(natalB.planets || natalB.positions || []);
        const outerPositions = this.prefixPositions(outerPositionsRaw, 'B-');
        const aspects = synAB.aspects || [];
        const chartAspects = this.prefixSynastryAspects(aspects, 'B-');

        // 调试日志：检查数据结构
        console.log('[Synastry] innerPositions:', JSON.stringify(innerPositions.slice(0, 3)));
        console.log('[Synastry] outerPositions:', JSON.stringify(outerPositions.slice(0, 3)));

        if (!innerPositions.length) {
          throw new Error('EMPTY_CHART');
        }

        // 从甲方上升点计算宫位
        const ascendantA = innerPositions.find(p => p.name === 'Ascendant');
        let houseCusps = [];
        if (ascendantA && ascendantA.sign) {
          const ascLongitude = this.getAbsoluteAngle(ascendantA.sign, ascendantA.degree, ascendantA.minute);
          houseCusps = Array.from({ length: 12 }, (_, i) => this.normalizeAngle(ascLongitude + i * 30));
          console.log('[Synastry] Ascendant found:', ascendantA.sign, ascendantA.degree);
          console.log('[Synastry] houseCusps calculated:', houseCusps);
        } else {
          console.warn('[Synastry] Ascendant not found in innerPositions');
        }

        const planetGroups = [
          { id: 'a', title: '甲方行星', list: this.buildPlanetList(innerPositions) },
          { id: 'b', title: '乙方行星', list: this.buildPlanetList(outerPositions) },
        ];
        const asteroidGroups = [
          { id: 'a', title: '甲方小行星', list: this.buildAsteroidList(this.normalizePositions(natalA.asteroids || [])) },
          { id: 'b', title: '乙方小行星', list: this.buildAsteroidList(this.normalizePositions(natalB.asteroids || [])) },
        ];
        const houseRulerGroups = [
          { id: 'a', title: '甲方宫主星', list: this.formatHouseRulers(natalA.houseRulers || []) },
          { id: 'b', title: '乙方宫主星', list: this.formatHouseRulers(natalB.houseRulers || []) },
        ];

        this.setData({
          resultStatus: 'ready',
          resultKind: selectedType.id,
          resultTitle: selectedType.label,
          chartType: typeConfig.chartType,
          chartPositions: innerPositions,
          outerPositions,
          chartAspects: chartAspects,
          chartHouseCusps: houseCusps,
          elementMatrix: { ...EMPTY_ELEMENT_MATRIX },
          aspectMatrix: this.buildSynastryAspectMatrix(aspects),
          planetGroups,
          asteroidGroups,
          houseRulerGroups,
          isDualResult: true,
          isTransitResult: false,
          chartDesc: '内环：甲方 | 外环：乙方',
          expandedSection: null,
        });
        return;
      }

      if (selectedType.id === 'transit') {
        const dateStr = new Date().toISOString().split('T')[0];
        const query = this.buildDailyParams(personA, dateStr);
        const res = await request({
          url: `${API_ENDPOINTS.DAILY_FORECAST}?${query}`,
          method: 'GET'
        });
        const natal = res?.natal || res?.chart || {};
        const transits = res?.transits || res?.transit || {};
        const technical = res?.technical || {};
        const innerPositions = this.normalizePositions(natal.positions || natal.planets || []);
        const outerPositionsRaw = this.normalizePositions(transits.positions || transits.planets || []);
        const outerPositions = this.prefixPositions(outerPositionsRaw, 'T-');
        const aspects = transits.aspects || transits.cross_aspects || technical.cross_aspects || [];
        const houseCusps = this.normalizeHouseCusps(natal.houseCusps || natal.house_cusps || []);

        if (!innerPositions.length) {
          throw new Error('EMPTY_CHART');
        }

        const planetGroups = [
          { id: 'natal', title: '本命行星', list: this.buildPlanetList(innerPositions) },
          { id: 'transit', title: '行运行星', list: this.buildPlanetList(outerPositions) },
        ];
        const asteroidGroups = [
          { id: 'natal', title: '本命小行星', list: this.buildAsteroidList(innerPositions) },
          { id: 'transit', title: '行运小行星', list: this.buildAsteroidList(outerPositions) },
        ];
        const houseRulerGroups = [
          { id: 'natal', title: '宫主星', list: this.formatHouseRulers(technical.house_rulers || []) },
        ];

        this.setData({
          resultStatus: 'ready',
          resultKind: selectedType.id,
          resultTitle: selectedType.label,
          chartType: typeConfig.chartType,
          chartPositions: innerPositions,
          outerPositions,
          chartAspects: aspects,
          chartHouseCusps: houseCusps,
          elementMatrix: this.buildElementMatrix(innerPositions),
          aspectMatrix: this.buildTransitAspectMatrix(aspects),
          planetGroups,
          asteroidGroups,
          houseRulerGroups,
          isDualResult: false,
          isTransitResult: true,
          chartDesc: '内环：本命盘 | 外环：行运',
          expandedSection: null,
        });
        return;
      }

      const query = this.buildNatalParams(personA);
      const res = await request({
        url: `${API_ENDPOINTS.NATAL_CHART}?${query}`,
        method: 'GET'
      });
      const chart = res?.chart || res || {};
      const positions = this.normalizePositions(chart.positions || chart.planets || []);
      const aspects = chart.aspects || chart.cross_aspects || [];
      const houseCusps = this.normalizeHouseCusps(chart.houseCusps || chart.house_cusps || []);

      if (!positions.length) {
        throw new Error('EMPTY_CHART');
      }

      const planetGroups = [
        { id: 'natal', title: '行星信息', list: this.buildPlanetList(positions) },
      ];
      const asteroidGroups = [
        { id: 'natal', title: '小行星信息', list: this.buildAsteroidList(positions) },
      ];
      const houseRulerGroups = [
        { id: 'natal', title: '宫主星信息', list: this.buildHouseRulers(positions, houseCusps) },
      ];

      this.setData({
        resultStatus: 'ready',
        resultKind: selectedType.id,
        resultTitle: selectedType.label,
        chartType: typeConfig.chartType,
        chartPositions: positions,
        outerPositions: [],
        chartAspects: aspects,
        chartHouseCusps: houseCusps,
        elementMatrix: this.buildElementMatrix(positions),
        aspectMatrix: this.buildAspectMatrix(aspects, positions),
        planetGroups,
        asteroidGroups,
        houseRulerGroups,
        isDualResult: false,
        isTransitResult: false,
        chartDesc: '',
        expandedSection: null,
      });
    } catch (err) {
      console.error(err);
      const message = err && err.message === 'EMPTY_CHART' ? '星盘数据为空，请检查出生信息' : '排盘失败';
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  buildNatalParams(person) {
    const params = [];
    if (person.date) params.push(`date=${encodeURIComponent(person.date)}`);
    if (person.time) params.push(`time=${encodeURIComponent(person.time)}`);
    if (person.city) params.push(`city=${encodeURIComponent(person.city)}`);
    params.push('accuracy=exact');
    return params.join('&');
  },

  buildSynastryParams(person, prefix) {
    const params = [];
    if (person.date) params.push(`${prefix}Date=${encodeURIComponent(person.date)}`);
    if (person.time) params.push(`${prefix}Time=${encodeURIComponent(person.time)}`);
    if (person.city) params.push(`${prefix}City=${encodeURIComponent(person.city)}`);
    params.push(`${prefix}Accuracy=exact`);
    return params.join('&');
  },

  buildDailyParams(person, dateStr) {
    const params = [];
    if (person.date) params.push(`birthDate=${encodeURIComponent(person.date)}`);
    if (person.time) params.push(`birthTime=${encodeURIComponent(person.time)}`);
    if (person.city) params.push(`city=${encodeURIComponent(person.city)}`);
    params.push('accuracy=exact');
    params.push(`date=${encodeURIComponent(dateStr)}`);
    return params.join('&');
  },

  normalizeAngle(angle) {
    const normalized = angle % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  },

  getAbsoluteAngle(sign, degree, minute = 0) {
    const signIndex = SIGN_NAMES.indexOf(sign);
    if (signIndex < 0) {
      console.warn('[getAbsoluteAngle] Unknown sign:', sign);
      return 0;
    }
    return (signIndex * 30) + (Number(degree) || 0) + (Number(minute) || 0) / 60;
  },

  getSignByLongitude(longitude) {
    const idx = Math.floor(this.normalizeAngle(longitude) / 30);
    return SIGN_NAMES[idx] || 'Aries';
  },

  formatOrb(orb) {
    const value = Math.abs(orb || 0);
    let deg = Math.floor(value);
    let min = Math.round((value - deg) * 60);
    if (min === 60) {
      deg += 1;
      min = 0;
    }
    return `${deg}°${String(min).padStart(2, '0')}'`;
  },

  buildElementMatrix(positions) {
    const elementMatrix = {
      fire: { cardinal: [], fixed: [], mutable: [] },
      earth: { cardinal: [], fixed: [], mutable: [] },
      air: { cardinal: [], fixed: [], mutable: [] },
      water: { cardinal: [], fixed: [], mutable: [] }
    };

    positions
      .filter(p => MAJOR_PLANETS.includes(p.name))
      .forEach((p) => {
        const element = ELEMENT_MAP[p.sign];
        const mode = MODE_MAP[p.sign];
        if (!element || !mode) return;
        const meta = PLANET_META[p.name] || {};
        elementMatrix[element][mode].push({
          id: p.name,
          symbol: meta.glyph || '',
          color: meta.color || '#666'
        });
      });

    return elementMatrix;
  },

  buildAspectMatrix(aspects) {
    const matrixPlanetNames = SINGLE_ASPECT_PLANETS;
    const aspectMatrix = [];

    const firstRow = [{ isEmpty: true }];
    const firstMeta = PLANET_META[matrixPlanetNames[0]] || {};
    firstRow.push({ isHeader: true, symbol: firstMeta.glyph || '☉', type: 'top' });
    aspectMatrix.push(firstRow);

    for (let i = 1; i < matrixPlanetNames.length; i++) {
      const row = [];
      const nameA = matrixPlanetNames[i];
      const metaA = PLANET_META[nameA] || {};
      row.push({ isHeader: true, symbol: metaA.glyph || '', type: 'left' });

      for (let j = 0; j < i; j++) {
        const nameB = matrixPlanetNames[j];
        const aspect = (aspects || []).find(a => {
          const p1 = this.stripPrefix(a.planet1 || '');
          const p2 = this.stripPrefix(a.planet2 || '');
          return (p1 === nameA && p2 === nameB) || (p1 === nameB && p2 === nameA);
        });
        row.push({
          isHeader: false,
          aspect: aspect ? {
            ...aspect,
            symbol: ASPECT_CONFIG[aspect.type]?.symbol || '',
            color: ASPECT_CONFIG[aspect.type]?.color || '#ccc',
            orbText: this.formatOrb(aspect.orb)
          } : null
        });
      }

      row.push({ isHeader: true, symbol: metaA.glyph || '', type: 'right' });
      aspectMatrix.push(row);
    }

    return aspectMatrix;
  },

  buildTransitAspectMatrix(aspects) {
    const transitBodies = CROSS_ASPECT_PLANETS;
    const natalBodies = CROSS_ASPECT_PLANETS;
    const matrix = [];

    const headerRow = [{ isEmpty: true }];
    natalBodies.forEach((name) => {
      headerRow.push({ isHeader: true, symbol: PLANET_META[name]?.glyph || '' });
    });
    matrix.push(headerRow);

    transitBodies.forEach((tName) => {
      const row = [];
      row.push({ isHeader: true, symbol: PLANET_META[tName]?.glyph || '' });

      natalBodies.forEach((nName) => {
        const aspect = (aspects || []).find((a) => {
          const p1 = a.planet1 || '';
          const p2 = a.planet2 || '';
          const transit = p1.startsWith('T-') ? p1.slice(2) : (p2.startsWith('T-') ? p2.slice(2) : '');
          const natal = p1.startsWith('N-') ? p1.slice(2) : (p2.startsWith('N-') ? p2.slice(2) : '');
          return transit === tName && natal === nName;
        });

        row.push({
          isHeader: false,
          aspect: aspect ? {
            ...aspect,
            symbol: ASPECT_CONFIG[aspect.type]?.symbol || '',
            color: ASPECT_CONFIG[aspect.type]?.color || '#ccc',
            orbText: this.formatOrb(aspect.orb)
          } : null
        });
      });

      matrix.push(row);
    });

    return matrix;
  },

  buildSynastryAspectMatrix(aspects) {
    const aBodies = CROSS_ASPECT_PLANETS;
    const bBodies = CROSS_ASPECT_PLANETS;
    const matrix = [];

    const headerRow = [{ isEmpty: true }];
    aBodies.forEach((name) => {
      headerRow.push({ isHeader: true, symbol: PLANET_META[name]?.glyph || '' });
    });
    matrix.push(headerRow);

    bBodies.forEach((bName) => {
      const row = [];
      row.push({ isHeader: true, symbol: PLANET_META[bName]?.glyph || '' });

      aBodies.forEach((aName) => {
        const aspect = (aspects || []).find((a) => {
          const p1 = this.stripPrefix(a.planet1 || '');
          const p2 = this.stripPrefix(a.planet2 || '');
          return (p1 === aName && p2 === bName) || (p1 === bName && p2 === aName);
        });

        row.push({
          isHeader: false,
          aspect: aspect ? {
            ...aspect,
            symbol: ASPECT_CONFIG[aspect.type]?.symbol || '',
            color: ASPECT_CONFIG[aspect.type]?.color || '#ccc',
            orbText: this.formatOrb(aspect.orb)
          } : null
        });
      });

      matrix.push(row);
    });

    return matrix;
  },

  buildPlanetList(positions) {
    const planetOrder = [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
      'Ascendant', 'Descendant', 'Midheaven', 'IC'
    ];

    return planetOrder
      .map((name) => {
        const p = positions.find(pos => this.stripPrefix(pos.name) === name);
        if (!p) return null;
        const meta = PLANET_META[name] || {};
        const deg = Math.floor(p.degree || 0);
        const min = p.minute ?? Math.round(((p.degree || 0) - deg) * 60);
        const isAngle = ['Ascendant', 'Descendant', 'Midheaven', 'IC'].includes(name);

        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: PLANET_NAMES_ZH[name] || name,
          symbol: isAngle ? (name === 'Midheaven' ? 'MC' : name === 'Descendant' ? 'Des' : name === 'Ascendant' ? 'Asc' : 'IC') : (meta.glyph || ''),
          isAngle,
          signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
          sign: SIGN_NAMES_ZH[p.sign] || p.sign,
          house: p.house,
          color: meta.color || '#666',
          degree: `${deg}°${String(min).padStart(2, '0')}'`,
          isRetrograde: p.isRetrograde || false
        };
      })
      .filter(Boolean);
  },

  buildAsteroidList(positions) {
    return ASTEROID_NAMES
      .map((name) => {
        const p = positions.find(pos => this.stripPrefix(pos.name) === name);
        if (!p) return null;
        const baseName = this.stripPrefix(p.name);
        const meta = PLANET_META[name] || {};
        const deg = Math.floor(p.degree || 0);
        const min = p.minute ?? Math.round(((p.degree || 0) - deg) * 60);
        const isSpecialPoint = ['North Node', 'South Node', 'Fortune', 'Vertex', 'Orient', 'East Point'].includes(name);

        return {
          id: baseName.toLowerCase().replace(/\s+/g, '-'),
          name: PLANET_NAMES_ZH[baseName] || baseName,
          symbol: isSpecialPoint ? (name === 'Orient' || name === 'East Point' ? 'Ep' : (meta.glyph || name.substring(0, 2))) : (meta.glyph || ''),
          isSpecialPoint,
          signIcon: `/images/astro-symbols/${(p.sign || 'aries').toLowerCase()}.png`,
          sign: SIGN_NAMES_ZH[p.sign] || p.sign,
          house: p.house,
          color: meta.color || '#666',
          degree: `${deg}°${String(min).padStart(2, '0')}'`,
          isRetrograde: p.isRetrograde || false
        };
      })
      .filter(Boolean);
  },

  buildHouseRulers(positions, houseCusps) {
    if (!Array.isArray(houseCusps) || houseCusps.length !== 12) return [];
    return houseCusps.map((cusp, index) => {
      const signId = this.getSignByLongitude(cusp);
      const signMeta = SIGN_META[signId] || {};
      const rulerId = SIGN_RULERS[signId];
      const rulerMeta = PLANET_META[rulerId] || {};
      const rulerPos = positions.find(p => p.name === rulerId);

      const fliesToSignId = rulerPos ? rulerPos.sign : '';
      const fliesToSignMeta = fliesToSignId ? SIGN_META[fliesToSignId] : {};

      return {
        house: index + 1,
        signName: SIGN_NAMES_ZH[signId] || signId,
        signIcon: `/images/astro-symbols/${signId.toLowerCase()}.png`,
        signColor: signMeta.color || '#666',
        rulerName: PLANET_NAMES_ZH[rulerId] || rulerId,
        rulerColor: rulerMeta.color || '#666',
        rulerGlyph: rulerMeta.glyph || '',
        fliesToHouse: rulerPos?.house || '--',
        fliesToSignName: rulerPos ? (SIGN_NAMES_ZH[rulerPos.sign] || rulerPos.sign) : '--',
        fliesToSignIcon: `/images/astro-symbols/${(rulerPos?.sign || 'aries').toLowerCase()}.png`,
        fliesToSignColor: fliesToSignMeta.color || '#666'
      };
    });
  },

  formatHouseRulers(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => {
      const signId = item.sign || '';
      const fliesToSignId = item.fliesToSign || '';
      const signMeta = SIGN_META[signId] || {};
      const fliesToSignMeta = SIGN_META[fliesToSignId] || {};
      const rulerId = item.ruler || item.rulerId || '';
      const rulerMeta = PLANET_META[rulerId] || {};

      return {
        house: item.house || index + 1,
        signName: SIGN_NAMES_ZH[signId] || signId || '--',
        signIcon: `/images/astro-symbols/${(signId || 'aries').toLowerCase()}.png`,
        signColor: signMeta.color || '#666',
        rulerName: PLANET_NAMES_ZH[rulerId] || rulerId || '--',
        rulerColor: rulerMeta.color || '#666',
        rulerGlyph: rulerMeta.glyph || '',
        fliesToHouse: item.fliesTo ?? '--',
        fliesToSignName: SIGN_NAMES_ZH[fliesToSignId] || fliesToSignId || '--',
        fliesToSignIcon: `/images/astro-symbols/${(fliesToSignId || 'aries').toLowerCase()}.png`,
        fliesToSignColor: fliesToSignMeta.color || '#666'
      };
    });
  },
});

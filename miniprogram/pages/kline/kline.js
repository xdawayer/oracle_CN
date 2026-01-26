const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');
const storage = require('../../utils/storage');

const DIMENSIONS = [
  { id: 'overall', name: '综合', code: '总' },
  { id: 'wealth', name: '财富', code: '财' },
  { id: 'love', name: '爱情', code: '爱' },
  { id: 'career', name: '事业', code: '业' },
  { id: 'health', name: '健康', code: '健' },
  { id: 'growth', name: '成长', code: '长' },
];

const TIMEFRAMES = [
  { id: 'daily', label: '日K' },
  { id: 'weekly', label: '周K' },
  { id: 'monthly', label: '月K' },
  { id: 'yearly', label: '年K' },
];

Page({
  data: {
    dimensions: DIMENSIONS,
    timeframes: TIMEFRAMES,
    selectedDimId: 'overall',
    selectedTimeframeId: 'monthly',
    dataList: [],
    currentCycle: null,
    loading: false,
    selectedDetail: null,
    userInfo: null,
    currentDim: DIMENSIONS[0]
  },

  onLoad(options) {
    const userInfo = storage.get('user_profile');
    if (userInfo) {
      this.setData({ userInfo });
      this.fetchData();
    } else {
      wx.showToast({
        title: '请先完善个人信息',
        icon: 'none'
      });
    }
  },

  updateCurrentDim(dimId) {
    const dim = this.data.dimensions.find(d => d.id === dimId) || this.data.dimensions[0];
    this.setData({ currentDim: dim });
  },

  onDimSelect(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.selectedDimId) return;
    this.setData({ selectedDimId: id });
    this.updateCurrentDim(id);
    this.fetchData();
  },

  onTimeframeSelect(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.selectedTimeframeId) return;
    this.setData({ selectedTimeframeId: id });
    this.fetchData();
  },

  async fetchData() {
    if (!this.data.userInfo) return;
    
    this.setData({ loading: true });
    
    try {
      const { birthDate, birthTime, birthCity, lat, lon, timezone, accuracyLevel } = this.data.userInfo;
      const monthsMap = {
        daily: 1,
        weekly: 3,
        monthly: 12,
        yearly: 60
      };
      const months = monthsMap[this.data.selectedTimeframeId] || 12;
      const params = [
        `date=${encodeURIComponent(birthDate || '')}`,
        `time=${encodeURIComponent(birthTime || '')}`,
        `city=${encodeURIComponent(birthCity || '')}`,
        `lat=${lat || ''}`,
        `lon=${lon || ''}`,
        `timezone=${timezone || ''}`,
        `accuracy=${encodeURIComponent(accuracyLevel || '')}`,
        `months=${months}`
      ].join('&');

      const res = await request({
        url: `${API_ENDPOINTS.CYCLE_LIST}?${params}`
      });
      
      // Process data to match the UI requirements (Candle format)
      // Expecting API to return list of cycles/periods with scores
      // If API returns raw cycles, we might need to aggregate. 
      // For now, assuming API returns a structure we can map or we adapt.
      
      const processedData = this.processData(res);
      
      this.setData({
        dataList: processedData,
        currentCycle: processedData.length > 0 ? processedData[processedData.length - 1] : null,
        loading: false
      });

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  processData(res) {
    const cycles = res && res.cycles ? res.cycles : [];
    return cycles.map((item, index) => ({
      id: item.id || `${item.planet}-${index}`,
      planet: item.planet,
      type: item.type,
      start: item.start,
      peak: item.peak,
      end: item.end
    }));
  },

  onDetailSelect(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ selectedDetail: item });
  },

  closeDetail() {
    this.setData({ selectedDetail: null });
  },

  onBack() {
    wx.navigateBack();
  }
});

const { request } = require('../../utils/request');
const { API_ENDPOINTS } = require('../../services/api');
const logger = require('../../utils/logger');
const storage = require('../../utils/storage');

Page({
  data: {
    records: [],
    loading: true
  },

  onShow() {
    this.checkAndFetch();
  },

  checkAndFetch() {
    const token = storage.get('access_token');
    if (!token) {
      this.setData({ records: [], loading: false });
      return;
    }
    this.fetchRecords();
  },

  async fetchRecords() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: API_ENDPOINTS.SYNASTRY_RECORDS });
      if (res && Array.isArray(res.records)) {
        const records = res.records.map(r => ({
          id: r.id,
          nameA: r.personA?.name || '我',
          nameB: r.personB?.name || '对方',
          relation: r.relationshipType || '',
          date: (r.createdAt || '').slice(0, 10),
          personA: r.personA,
          personB: r.personB,
        }));
        this.setData({ records, loading: false });
      } else {
        this.setData({ records: [], loading: false });
      }
    } catch (err) {
      logger.error('fetchRecords failed', err);
      this.setData({ records: [], loading: false });
    }
  },

  onSelectRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r.id === id);
    if (!record) return;
    const params = encodeURIComponent(JSON.stringify({
      nameA: record.nameA,
      nameB: record.nameB,
      personA: record.personA,
      personB: record.personB,
      relation: record.relation,
    }));
    wx.navigateTo({
      url: '/pages/synastry/synastry?prefill=' + params,
      fail: () => {
        wx.switchTab({
          url: '/pages/discovery/discovery',
          fail: () => {
            wx.switchTab({ url: '/pages/home/home' });
          }
        });
      }
    });
  },

  onGoToMatch() {
    wx.navigateTo({
      url: '/pages/synastry/synastry',
      fail: () => {
        wx.switchTab({
          url: '/pages/discovery/discovery',
          fail: () => {
            wx.switchTab({ url: '/pages/home/home' });
          }
        });
      }
    });
  }
});

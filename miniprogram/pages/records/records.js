const storage = require('../../utils/storage');

Page({
  data: {
    records: [],
    selectedRecord: null,
    loading: true
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    const records = storage.get('synastry_records', []) || [];
    this.setData({
      records: [...records].reverse(),
      loading: false
    });
  },

  onSelectRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r.id === id);
    if (record) {
      this.setData({ selectedRecord: record });
    }
  },

  onCloseDetail() {
    this.setData({ selectedRecord: null });
  },

  onGoToMatch() {
    wx.navigateTo({
      url: '/pages/synastry/synastry',
      fail: () => {
        wx.switchTab({
          url: '/pages/discovery/discovery',
          fail: () => {
            wx.switchTab({ url: '/pages/index/index' });
          }
        });
      }
    });
  }
});

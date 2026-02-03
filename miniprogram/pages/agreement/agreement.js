const agreements = require('../../data/agreements');

Page({
  data: {
    agreement: {}
  },

  onLoad(options) {
    const type = options.type || 'privacy';
    const agreement = agreements[type];

    if (!agreement) {
      wx.showToast({ title: '协议不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    wx.setNavigationBarTitle({ title: agreement.title });
    this.setData({ agreement });
  }
});

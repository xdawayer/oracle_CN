const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');

const PACKAGES = [
  { amount: 1, price: 100, priceText: '1.00' },
  { amount: 10, price: 1000, priceText: '10.00' },
  { amount: 50, price: 5000, priceText: '50.00', badge: '热门' },
  { amount: 100, price: 10000, priceText: '100.00' },
  { amount: 200, price: 20000, priceText: '200.00' },
  { amount: 500, price: 50000, priceText: '500.00', badge: '推荐' },
];

Page({
  data: {
    points: 0,
    packages: PACKAGES,
    selectedIndex: 2, // 默认选中 50 积分
    selectedPriceText: '50.00',
    agreedTerms: false,
    paying: false,
  },

  onLoad() {
    this.loadBalance();
  },

  onShow() {
    this.loadBalance();
  },

  loadBalance() {
    const profile = storage.get('user_profile') || {};
    this.setData({ points: profile.points || 0 });

    // 从后端获取最新余额
    this.fetchBalance();
  },

  async fetchBalance() {
    try {
      const res = await request({ url: '/api/user/profile' });
      if (res && res.points !== undefined) {
        this.setData({ points: res.points });
        const profile = storage.get('user_profile') || {};
        profile.points = res.points;
        storage.set('user_profile', profile);
      }
    } catch (err) {
      // 使用本地数据
    }
  },

  onRefreshBalance() {
    this.fetchBalance();
    wx.showToast({ title: '已刷新', icon: 'none', duration: 800 });
  },

  onSelectPackage(e) {
    const index = e.currentTarget.dataset.index;
    const pkg = PACKAGES[index];
    if (pkg) {
      this.setData({
        selectedIndex: index,
        selectedPriceText: pkg.priceText,
      });
    }
  },

  onToggleTerms() {
    this.setData({ agreedTerms: !this.data.agreedTerms });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/points-history/points-history' });
  },

  onUnload() {
    this._destroyed = true;
  },

  // 轮询订单状态（最多30秒）
  pollOrderStatus(orderId, onSuccess, retries = 0) {
    if (retries >= 6 || this._destroyed) return;
    setTimeout(async () => {
      if (this._destroyed) return;
      try {
        const res = await request({ url: `/api/wxpay/order/${orderId}` });
        if (res && res.status === 'paid') {
          onSuccess && onSuccess();
          return;
        }
      } catch (e) { /* ignore */ }
      this.pollOrderStatus(orderId, onSuccess, retries + 1);
    }, 5000);
  },

  goToPointsAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=points' });
  },

  async onPay() {
    if (!this.data.agreedTerms) {
      wx.showToast({ title: '请先同意服务协议', icon: 'none' });
      return;
    }
    if (this.data.paying) return;

    const pkg = PACKAGES[this.data.selectedIndex];
    if (!pkg) return;

    this.setData({ paying: true });

    try {
      const res = await request({
        url: '/api/wxpay/create-order',
        method: 'POST',
        data: {
          orderType: 'points',
          amount: pkg.amount,
          totalFee: pkg.price,
        },
      });

      if (!res || !res.payParams) {
        wx.showToast({ title: '创建订单失败', icon: 'none' });
        this.setData({ paying: false });
        return;
      }

      const orderId = res.orderId;

      wx.requestPayment({
        ...res.payParams,
        success: () => {
          wx.showToast({ title: '充值成功，积分已到账', icon: 'success', duration: 2000 });
          // 轮询订单状态确认
          this.pollOrderStatus(orderId, () => {
            this.fetchBalance();
          });
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({ title: '已取消支付', icon: 'none' });
          } else {
            wx.showModal({
              title: '支付未完成',
              content: '支付过程中遇到问题，您可以重新尝试。',
              confirmText: '重新支付',
              cancelText: '稍后再说',
              success: (modalRes) => {
                if (modalRes.confirm) this.onPay();
              },
            });
          }
        },
        complete: () => {
          this.setData({ paying: false });
        },
      });
    } catch (err) {
      logger.error('Pay error:', err);
      wx.showToast({ title: '支付失败', icon: 'none' });
      this.setData({ paying: false });
    }
  },
});

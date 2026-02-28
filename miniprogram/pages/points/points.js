const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');
const { RECHARGE_TIERS } = require('../../utils/credits');

const BADGES = { 200: '推荐', 1200: '尊享' };
const PACKAGES = RECHARGE_TIERS.map((amount) => ({
  amount,
  price: amount * 10,               // 1 RMB = 10 积分，单位：分
  priceText: (amount / 10).toFixed(2),
  ...(BADGES[amount] ? { badge: BADGES[amount] } : {}),
}));

Page({
  data: {
    points: 0,
    packages: PACKAGES,
    selectedIndex: 2, // 默认选中 200 积分
    selectedPriceText: '20.00',
    agreedTerms: false,
    paying: false,
    isFirstRecharge: false,
  },

  onLoad(options) {
    if (options.defaultIndex != null) {
      const idx = parseInt(options.defaultIndex, 10);
      const pkg = PACKAGES[idx];
      if (pkg) {
        this.setData({ selectedIndex: idx, selectedPriceText: pkg.priceText });
      }
    }
    this.loadBalance();
    this.checkFirstRecharge();
  },

  onShow() {
    this.loadBalance();
    this.checkFirstRecharge();
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

  async checkFirstRecharge() {
    try {
      const res = await request({ url: '/api/wxpay/first-recharge-status' });
      if (res && res.isFirstRecharge) {
        this.setData({ isFirstRecharge: true });
      }
    } catch (e) {
      // ignore
    }
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
  // 使用 POST /api/wxpay/query-order 主动向微信查询，
  // 避免仅依赖回调导致积分不到账
  pollOrderStatus(orderId, onSuccess, retries = 0) {
    if (this._destroyed) return;
    if (retries >= 6) {
      onSuccess && onSuccess();
      return;
    }
    setTimeout(async () => {
      if (this._destroyed) return;
      try {
        const res = await request({
          url: '/api/wxpay/query-order',
          method: 'POST',
          data: { orderId },
        });
        if (res && (res.status === 'paid' || res.tradeState === 'SUCCESS')) {
          onSuccess && onSuccess();
          return;
        }
        // 终态失败，停止轮询
        if (res && ['CLOSED', 'REVOKED', 'PAYERROR'].includes(res.tradeState)) {
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
          // 首充状态已失效，立即刷新
          this.setData({ isFirstRecharge: false });
          // 延迟1秒后立即刷新一次余额
          setTimeout(() => { if (!this._destroyed) this.fetchBalance(); }, 1000);
          // 轮询订单状态确认后再次刷新
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

const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');

const PLANS = {
  monthly: { price: '9.9', totalFee: 990, label: '连续包月' },
  yearly: { price: '128', totalFee: 12800, label: '年度会员' },
  quarterly: { price: '45', totalFee: 4500, label: '季度会员' },
};

Page({
  data: {
    userName: '',
    avatarUrl: '',
    isVip: false,
    vipExpireDate: '',
    selectedPlan: 'yearly',
    selectedPrice: '128',
    agreedTerms: false,
    paying: false,
    benefits: [
      { icon: '∞', title: '无限次深度解读', desc: '不消耗积分，随时查看' },
      { icon: '心', title: 'AI 深度心理分析', desc: '结合个人特质的深度分析' },
      { icon: '☆', title: '实时周期分析', desc: '掌握每日洞察指南' },
      { icon: '♡', title: '高级关系分析', desc: '多维度关系互动深度解析' },
      { icon: '盾', title: '专属隐私保护', desc: '数据加密，仅你可见' },
    ],
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadSubscriptionStatus();
  },

  loadUserInfo() {
    const profile = storage.get('user_profile') || {};
    const avatarUrl = storage.get('user_avatar') || '';
    this.setData({
      userName: profile.name || '星语用户',
      avatarUrl,
      isVip: profile.isVip || false,
      vipExpireDate: profile.vipExpireDate || '',
    });
  },

  async loadSubscriptionStatus() {
    try {
      const res = await request({ url: '/api/user/subscription' });
      if (res) {
        this.setData({
          isVip: res.isVip || false,
          vipExpireDate: res.vipExpireDate || '',
        });
        // 同步到本地缓存
        const profile = storage.get('user_profile') || {};
        profile.isVip = res.isVip;
        profile.vipExpireDate = res.vipExpireDate;
        storage.set('user_profile', profile);
      }
    } catch (err) {
      // 使用本地数据
    }
  },

  onSelectPlan(e) {
    const plan = e.currentTarget.dataset.plan;
    if (PLANS[plan]) {
      this.setData({
        selectedPlan: plan,
        selectedPrice: PLANS[plan].price,
      });
    }
  },

  onToggleTerms() {
    this.setData({ agreedTerms: !this.data.agreedTerms });
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

  goToVipAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=vip' });
  },

  async onPay() {
    if (!this.data.agreedTerms) {
      wx.showToast({ title: '请先同意服务协议', icon: 'none' });
      return;
    }
    if (this.data.paying) return;

    const plan = this.data.selectedPlan;
    const planConfig = PLANS[plan];
    if (!planConfig) return;

    this.setData({ paying: true });

    try {
      // 创建订单
      const res = await request({
        url: '/api/wxpay/create-order',
        method: 'POST',
        data: {
          orderType: 'subscription',
          plan: plan,
        },
      });

      if (!res || !res.payParams) {
        wx.showToast({ title: '创建订单失败', icon: 'none' });
        this.setData({ paying: false });
        return;
      }

      const orderId = res.orderId;

      // 发起微信支付
      wx.requestPayment({
        ...res.payParams,
        success: () => {
          wx.showToast({ title: '开通成功', icon: 'success', duration: 2000 });
          // 轮询订单状态确认
          this.pollOrderStatus(orderId, () => {
            this.loadSubscriptionStatus();
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

const { request } = require('../../utils/request');
const storage = require('../../utils/storage');
const logger = require('../../utils/logger');
const avatarBehavior = require('../../behaviors/avatar');

const PLANS = {
  monthly: {
    firstPrice: '9.9', firstTotalFee: 990,
    renewPrice: '18', renewTotalFee: 1800,
    label: '月度会员',
  },
  quarterly: {
    firstPrice: '30', firstTotalFee: 3000,
    renewPrice: '45', renewTotalFee: 4500,
    label: '季度会员',
  },
  yearly: {
    firstPrice: '168', firstTotalFee: 16800,
    renewPrice: '198', renewTotalFee: 19800,
    label: '年度会员',
  },
};

Page({
  behaviors: [avatarBehavior],
  data: {
    userName: '',
    avatarUrl: '',
    isVip: false,
    vipExpireDate: '',
    selectedPlan: 'yearly',
    selectedPrice: '198',
    firstStatus: { monthly: false, quarterly: false, yearly: false },
    agreedTerms: false,
    paying: false,
    benefits: [
      { icon: '∞', title: 'AI 问答无限制', desc: '不限次数，随时提问' },
      { icon: '♡', title: '合盘分析无限制', desc: '不限次数，多对象分析' },
      { icon: '心', title: 'AI 深度心理分析', desc: '结合个人特质的深度分析' },
      { icon: '☆', title: '实时周期分析', desc: '掌握每日洞察指南' },
      { icon: '★', title: '高级关系分析', desc: '多维度关系互动深度解析' },
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
        const firstStatus = res.firstStatus || { monthly: false, quarterly: false, yearly: false };
        this.setData({
          isVip: res.isVip || false,
          vipExpireDate: res.vipExpireDate || '',
          firstStatus,
        });
        this._updateSelectedPrice();
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
      const isFirst = this.data.firstStatus[plan];
      const config = PLANS[plan];
      this.setData({
        selectedPlan: plan,
        selectedPrice: isFirst ? config.firstPrice : config.renewPrice,
      });
    }
  },

  onToggleTerms() {
    this.setData({ agreedTerms: !this.data.agreedTerms });
  },

  _updateSelectedPrice() {
    const plan = this.data.selectedPlan;
    const config = PLANS[plan];
    if (!config) return;
    const isFirst = this.data.firstStatus[plan];
    this.setData({
      selectedPrice: isFirst ? config.firstPrice : config.renewPrice,
    });
  },

  onUnload() {
    this._destroyed = true;
  },

  // 轮询订单状态（最多30秒）
  // 使用 POST /api/wxpay/query-order 主动向微信查询，
  // 避免仅依赖回调导致订阅未激活
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
        if (res && ['CLOSED', 'REVOKED', 'PAYERROR'].includes(res.tradeState)) {
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
          isFirst: this.data.firstStatus[plan],
          totalFee: this.data.firstStatus[plan] ? planConfig.firstTotalFee : planConfig.renewTotalFee,
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
          // 延迟1秒后立即刷新一次状态
          setTimeout(() => { if (!this._destroyed) this.loadSubscriptionStatus(); }, 1000);
          // 轮询订单状态确认后再次刷新
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

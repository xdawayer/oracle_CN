const { request } = require('../../utils/request');

const STATUS_MAP = {
  pending: { text: '待支付', class: 'status-pending' },
  paid: { text: '已支付', class: 'status-paid' },
  failed: { text: '支付失败', class: 'status-failed' },
  refunded: { text: '已退款', class: 'status-refunded' },
};

Page({
  data: {
    orders: [],
    loading: true,
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/api/wxpay/orders' });
      if (res && res.orders) {
        const orders = res.orders.map(order => {
          const statusInfo = STATUS_MAP[order.status] || { text: order.status, class: '' };
          const isVip = order.orderType === 'subscription';

          let description = '';
          if (isVip) {
            const planNames = { monthly: '连续包月', quarterly: '季度会员', yearly: '年度会员' };
            description = '会员 · ' + (planNames[order.plan] || order.plan);
          } else {
            description = '积分充值 · ' + (order.pointsAmount || 0) + ' 积分';
          }

          return {
            ...order,
            orderTypeText: isVip ? '会员订阅' : '积分充值',
            statusText: statusInfo.text,
            statusClass: statusInfo.class,
            description,
            amountText: ((order.totalFee || 0) / 100).toFixed(2),
            timeText: formatTime(order.createdAt),
          };
        });
        this.setData({ orders, loading: false });
      } else {
        this.setData({ orders: [], loading: false });
      }
    } catch (err) {
      console.error('Load orders error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onRefund(e) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.showModal({
      title: '申请退款',
      content: '确认申请退款？退款将原路返回至微信零钱，相应权益将立即失效。',
      confirmText: '确认退款',
      confirmColor: '#8B0000',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await request({
              url: '/api/wxpay/refund',
              method: 'POST',
              data: { orderId },
            });
            if (result && result.success) {
              wx.showToast({ title: result.message || '退款已提交', icon: 'success' });
              this.loadOrders();
            } else {
              wx.showToast({ title: (result && result.message) || '退款失败', icon: 'none' });
            }
          } catch (err) {
            wx.showToast({ title: '退款失败', icon: 'none' });
          }
        }
      },
    });
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh());
  },
});

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

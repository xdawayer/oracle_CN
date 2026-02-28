/**
 * 积分不足弹窗工具函数
 */

const RECHARGE_TIERS = [60, 100, 200, 500, 1200];

/**
 * 检查后端返回是否为积分不足错误，若是则显示弹窗
 * 支持两种调用场景：
 *   1. 成功路径：result 为响应 data 对象
 *   2. 异常路径：result 为 RequestError（statusCode=403, data 含错误详情）
 * @param {Object} page - 页面实例 (this)
 * @param {Object|Error} result - 后端返回的结果或 RequestError
 * @returns {boolean} 是否为积分不足错误
 */
function handleInsufficientCredits(page, result) {
  const data = (result instanceof Error && result.data) ? result.data : result;
  if (data && data.error === 'Insufficient credits') {
    page.setData({
      showCreditsModal: true,
      creditsModalPrice: data.price || 0,
      creditsModalBalance: data.balance || 0,
    });
    return true;
  }
  return false;
}

/**
 * 跳转到充值页，传入推荐档位
 * @param {Object} detail - recharge 事件的 detail，含 defaultIndex
 */
function navigateToRecharge(detail) {
  const idx = (detail && detail.defaultIndex != null) ? detail.defaultIndex : 2;
  wx.navigateTo({ url: `/pages/points/points?defaultIndex=${idx}` });
}

/**
 * 积分不足弹窗 mixin —— Page() 不支持 behaviors，用展开对象方式注入
 * 使用方式：在 Page data 中展开 creditsModalData，在 Page 方法区展开 creditsModalMethods
 */
const creditsModalData = {
  showCreditsModal: false,
  creditsModalPrice: 0,
  creditsModalBalance: 0,
};

const creditsModalMethods = {
  onCreditsModalCancel() {
    this.setData({ showCreditsModal: false });
  },
  onCreditsModalRecharge(e) {
    this.setData({ showCreditsModal: false });
    navigateToRecharge(e.detail);
  },
  onCreditsModalGoVip() {
    this.setData({ showCreditsModal: false });
    wx.navigateTo({ url: '/pages/subscription/subscription' });
  },
};

module.exports = { RECHARGE_TIERS, handleInsufficientCredits, navigateToRecharge, creditsModalData, creditsModalMethods };

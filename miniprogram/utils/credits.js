/**
 * 积分不足弹窗工具函数
 */

const RECHARGE_TIERS = [1, 10, 50, 100, 200, 500];

/**
 * 检查后端返回是否为积分不足错误，若是则显示弹窗
 * @param {Object} page - 页面实例 (this)
 * @param {Object} result - 后端返回的结果
 * @returns {boolean} 是否为积分不足错误
 */
function handleInsufficientCredits(page, result) {
  if (result && result.error === 'Insufficient credits') {
    page.setData({
      showCreditsModal: true,
      creditsModalPrice: result.price || 0,
      creditsModalBalance: result.balance || 0,
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
};

module.exports = { RECHARGE_TIERS, handleInsufficientCredits, navigateToRecharge, creditsModalData, creditsModalMethods };

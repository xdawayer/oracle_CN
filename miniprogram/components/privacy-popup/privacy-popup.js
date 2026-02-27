Component({
  data: {
    show: false,
  },

  lifetimes: {
    attached() {
      const app = getApp();
      app._privacyPopup = this;
      // 如果在组件挂载前已有等待中的隐私授权请求
      if (app._pendingPrivacyResolve) {
        this.setData({ show: true });
      }
    },
    detached() {
      const app = getApp();
      if (app._privacyPopup === this) {
        app._privacyPopup = null;
      }
    },
  },

  methods: {
    showPopup() {
      this.setData({ show: true });
    },

    onAgree() {
      this.setData({ show: false });
      const app = getApp();
      if (app._pendingPrivacyResolve) {
        app._pendingPrivacyResolve({ buttonId: 'agree-btn', event: 'agree' });
        app._pendingPrivacyResolve = null;
      }
    },

    onDisagree() {
      this.setData({ show: false });
      const app = getApp();
      if (app._pendingPrivacyResolve) {
        app._pendingPrivacyResolve({ buttonId: 'agree-btn', event: 'disagree' });
        app._pendingPrivacyResolve = null;
      }
    },

    openPrivacyDetail() {
      wx.openPrivacyContract({
        fail: () => {
          // 如果 openPrivacyContract 不可用，跳转到协议页面
          wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' });
        },
      });
    },

    noop() {},
  },
});

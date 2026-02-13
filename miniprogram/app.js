const auth = require('./utils/auth');
const storage = require('./utils/storage');
const logger = require('./utils/logger');
const { request } = require('./utils/request');
const { createTabPreloader } = require('./utils/tab-preloader');

const DEVICE_FINGERPRINT_KEY = 'device_fingerprint';

const generateDeviceFingerprint = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${randomPart}`;
};

const formatRequestError = (error) => {
  if (!error) return { message: 'unknown error' };
  const data = error.data && typeof error.data === 'object' ? error.data : {};
  return {
    message: error.message || 'request failed',
    statusCode: error.statusCode,
    detail: data.detail || data.error || data.message || error.errMsg || '',
    url: error.url || '',
    method: error.method || '',
  };
};

App({
  onLaunch() {
    this._tabPreloader = createTabPreloader();

    // 初始化云能力（用于 callContainer 调用云托管）
    if (wx.cloud) {
      wx.cloud.init({ env: 'prod-6gnh6drs7858f443' });
    }

    // Load Noto Serif SC (思源宋体) for main body text
    // Using direct woff2 font file URL for wx.loadFontFace compatibility
    wx.loadFontFace({
      family: 'SourceHanSerifSC',
      source: 'url("https://fonts.gstatic.com/s/notoserifsc/v22/H4c8BXePl9DZ0Xe7gG9cyOj7mm63SzZBEtERe7U.woff2")',
      scopes: ['webview', 'native'],
      success: res => logger.log('Noto Serif SC font loaded:', res.status),
      fail: err => logger.warn('Noto Serif SC font load failed, using system fallback:', err)
    });

    // Load decorative ancient font for titles
    wx.loadFontFace({
      family: 'AncientFont',
      source: 'url("https://fonts.gstatic.com/s/zhimangxing/v10/m8JXjf9Y4K992R_Sj0BfP_3vYfC1rM-R.woff2")',
      scopes: ['webview', 'native'],
      success: res => logger.log('Ancient font loaded:', res.status),
      fail: err => logger.warn('Ancient font load failed:', err)
    });

    const deviceFingerprint = storage.get(DEVICE_FINGERPRINT_KEY);
    if (!deviceFingerprint) {
      storage.set(DEVICE_FINGERPRINT_KEY, generateDeviceFingerprint());
    }

    const updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate(function (res) {
    })

    updateManager.onUpdateReady(function () {
      wx.showModal({
        title: '发现新版本',
        content: '新版本已准备好，是否立即重启应用？',
        confirmText: '立即更新',
        cancelText: '稍后再说',
        success: function (res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    // 隐私保护授权回调
    wx.onNeedPrivacyAuthorization((resolve) => {
      wx.showModal({
        title: '隐私保护提示',
        content: '在使用星语服务之前，请阅读并同意《隐私政策》。您的个人信息仅用于性格分析服务，我们将严格保护您的个人数据。',
        confirmText: '同意',
        cancelText: '不同意',
        success: (res) => {
          if (res.confirm) {
            resolve({ buttonId: 'agree-btn', event: 'agree' });
          } else {
            resolve({ buttonId: 'agree-btn', event: 'disagree' });
          }
        }
      });
    });

    // 全局错误监控
    wx.onError((error) => {
      const pages = getCurrentPages();
      const currentPage = pages.length > 0 ? pages[pages.length - 1].route : '';
      request({
        url: '/api/log/error',
        method: 'POST',
        data: { type: 'js_error', message: String(error).slice(0, 2000), page: currentPage },
      }).catch(() => {});
    });

    wx.onUnhandledRejection((res) => {
      const pages = getCurrentPages();
      const currentPage = pages.length > 0 ? pages[pages.length - 1].route : '';
      request({
        url: '/api/log/error',
        method: 'POST',
        data: { type: 'promise_rejection', message: String(res.reason).slice(0, 2000), page: currentPage },
      }).catch(() => {});
    });

    this.autoLogin();
  },

  notifyTabActivated(tabId) {
    if (this._tabPreloader && typeof this._tabPreloader.notifyTabActivated === 'function') {
      this._tabPreloader.notifyTabActivated(tabId);
    }
  },

  markHomeVisibleReady() {
    if (this._tabPreloader && typeof this._tabPreloader.markHomeReady === 'function') {
      this._tabPreloader.markHomeReady();
    }
  },

  resetTabPreload() {
    if (this._tabPreloader && typeof this._tabPreloader.reset === 'function') {
      this._tabPreloader.reset();
    }
  },

  async autoLogin() {
    const refreshTokenVal = storage.get('refresh_token');
    if (refreshTokenVal) {
      try {
        await auth.refreshToken();
        this.checkOnboardingStatus();
        return;
      } catch {
        storage.clearTokens();
      }
    }

    try {
      const data = await auth.login();
      if (data && data.user) {
        this._mergeUserProfile(data.user);
        this.checkOnboardingStatus();
        return;
      }
    } catch (error) {
      logger.warn('[autoLogin] first attempt failed', formatRequestError(error));
    }

    // 首次登录失败，使用 ensureLogin 重试
    const result = await auth.ensureLogin(2);
    if (result) {
      // ensureLogin 返回登录数据时合并 profile
      if (result.user) {
        this._mergeUserProfile(result.user);
      }
      this.checkOnboardingStatus();
      return;
    }

    // 仍然失败，弹窗提示用户
    // 注：showModal 回调是事件驱动的，递归调用不会累积调用栈
    wx.showModal({
      title: '登录失败',
      content: '无法连接服务器，请检查网络后重试',
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.autoLogin();
        }
      },
    });
  },
  _mergeUserProfile(user) {
    const previousProfile = storage.get('user_profile') || {};
    const mergedProfile = {
      ...previousProfile,
      name: user.name || previousProfile.name || '',
    };
    storage.set('user_profile', mergedProfile);
    if (user.avatar) {
      storage.set('user_avatar', user.avatar);
    }
  },
  checkOnboardingStatus() {
    const profile = storage.get('user_profile') || {};
    if (!profile.onboardingCompleted) {
      this.resetTabPreload();
      // 新用户未完成引导，跳转到引导页
      wx.redirectTo({
        url: '/pages/onboarding/onboarding'
      });
    }
  },
  globalData: {
    userInfo: null,
    theme: 'dark',
    auditMode: true
  }
})

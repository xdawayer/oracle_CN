const auth = require('./utils/auth');
const storage = require('./utils/storage');

const DEVICE_FINGERPRINT_KEY = 'device_fingerprint';

const generateDeviceFingerprint = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${randomPart}`;
};

App({
  onLaunch() {
    // Load Noto Serif SC (思源宋体) for main body text
    // Using direct woff2 font file URL for wx.loadFontFace compatibility
    wx.loadFontFace({
      family: 'SourceHanSerifSC',
      source: 'url("https://fonts.gstatic.com/s/notoserifsc/v22/H4c8BXePl9DZ0Xe7gG9cyOj7mm63SzZBEtERe7U.woff2")',
      scopes: ['webview', 'native'],
      success: res => console.log('Noto Serif SC font loaded:', res.status),
      fail: err => console.warn('Noto Serif SC font load failed, using system fallback:', err)
    });

    // Load decorative ancient font for titles
    wx.loadFontFace({
      family: 'AncientFont',
      source: 'url("https://fonts.gstatic.com/s/zhimangxing/v10/m8JXjf9Y4K992R_Sj0BfP_3vYfC1rM-R.woff2")',
      scopes: ['webview', 'native'],
      success: res => console.log('Ancient font loaded:', res.status),
      fail: err => console.warn('Ancient font load failed:', err)
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
        content: '在使用星智服务之前，请阅读并同意《隐私政策》。您的出生信息仅用于占星分析，我们将严格保护您的个人数据。',
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

    this.autoLogin();
  },
  async autoLogin() {
    const refreshToken = storage.get('refresh_token');
    if (refreshToken) {
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
        const previousProfile = storage.get('user_profile') || {};
        const mergedProfile = {
          ...previousProfile,
          name: data.user.name || previousProfile.name || '',
        };
        storage.set('user_profile', mergedProfile);
        if (data.user.avatar) {
          storage.set('user_avatar', data.user.avatar);
        }
        this.checkOnboardingStatus();
      }
    } catch {
    }
  },
  checkOnboardingStatus() {
    const profile = storage.get('user_profile') || {};
    if (!profile.onboardingCompleted) {
      // 新用户未完成引导，跳转到引导页
      wx.redirectTo({
        url: '/pages/onboarding/onboarding'
      });
    }
  },
  globalData: {
    userInfo: null,
    theme: 'dark' 
  }
})
